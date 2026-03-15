/**
 * Application entry point — wires all SOLID-compliant modules together.
 * DIP: this file is the only place where concrete classes are instantiated.
 * All other modules receive dependencies via constructor injection.
 */
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import sensible from '@fastify/sensible';
import Fastify from 'fastify';
import { Redis } from 'ioredis';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { initI18n } from './config/i18n.js';
import { loadConfig } from './config/loader.js';
import { createLogger } from './config/logger.js';
import { createDatabase } from './db/connection.js';
import { createMetadataWorker } from './jobs/metadata.worker.js';
import { PollingService } from './jobs/polling.service.js';
import { createQueues } from './jobs/queues.js';
import { PaperlessClient } from './paperless/client.js';
import { PromptEngine } from './prompts/engine.js';
import { createLLMProvider } from './providers/llm/factory.js';
import { OllamaWarmupService } from './providers/llm/ollama-warmup.service.js';
import { createOcrProvider, validateOcrModeCompatibility } from './providers/ocr/factory.js';
import { SseService } from './sse/sse.service.js';

import { analysisRoutes } from './routes/analysis.routes.js';
import { authRoutes } from './routes/auth.routes.js';
import { documentRoutes } from './routes/documents.routes.js';
import { healthRoutes } from './routes/health.routes.js';
import { jobRoutes } from './routes/jobs.routes.js';
import { localesRoutes } from './routes/locales.routes.js';
import { promptRoutes } from './routes/prompts.routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function bootstrap() {
    // ── 1. Config & observability ──────────────────────────────────────
    const config = loadConfig();
    const log = createLogger();
    await initI18n('en');

    log.info('paperless-llm starting up');

    // ── 2. Infrastructure ──────────────────────────────────────────────
    const redis = new Redis(config.REDIS_URL, { maxRetriesPerRequest: null });
    const db = createDatabase();

    // ── 3. Domain services ────────────────────────────────────────────
    const defaultPromptsDir = resolve(__dirname, '..', '..', '..', 'default_prompts');
    const userPromptsDir = resolve(process.cwd(), 'prompts');
    const promptEngine = new PromptEngine(userPromptsDir, defaultPromptsDir);
    await promptEngine.init();

    const llmProvider = createLLMProvider(config);
    const ocrProvider = createOcrProvider(config, promptEngine);
    validateOcrModeCompatibility(ocrProvider, config.OCR_PROCESS_MODE);

    const paperlessClient = new PaperlessClient(config);

    const stageDeps = {
        llmProvider,
        ocrProvider,
        paperlessClient,
        promptEngine,
        config,
        useExistingOnly: config.USE_EXISTING_DATA_ONLY,
    };

    // ── 4. Job queue ──────────────────────────────────────────────────
    const queues = createQueues(redis);
    const sse = new SseService();

    // ── Ollama warmup (only when provider is ollama) ──────────────────
    let warmup: OllamaWarmupService | undefined;
    if (config.LLM_PROVIDER === 'ollama') {
        const ollamaBase = (config.OLLAMA_HOST ?? 'http://localhost:11434').replace(/\/api\/?$/, '');
        warmup = new OllamaWarmupService({
            baseURL: ollamaBase,
            model: config.LLM_MODEL,
            warmupTimeoutMs: (config.OLLAMA_REQUEST_TIMEOUT_SECONDS ?? 600) * 1000,
            sseService: sse,
        });
        log.info({ model: config.LLM_MODEL }, 'Ollama warmup service created (starts on first job enqueue)');
    }

    createMetadataWorker(redis, stageDeps, db, paperlessClient, warmup);
    // createOcrWorker(redis, stageDeps, db, paperlessClient); // Phase 2

    const polling = new PollingService(paperlessClient, queues, config, db, warmup);
    polling.start();

    // ── 5. HTTP server ────────────────────────────────────────────────
    const app = Fastify({
        logger: false, // we use pino directly
        trustProxy: true,
    });

    await app.register(cors, { origin: true });
    await app.register(sensible);

    // ── JWT auth (skip if AUTH_ENABLED is false) ──────────────────────
    if (config.AUTH_ENABLED) {
        if (!config.JWT_SECRET) {
            throw new Error('JWT_SECRET must be set (min 32 chars) when AUTH_ENABLED=true');
        }
        await app.register(jwt, { secret: config.JWT_SECRET });

        // authenticate decorator used by individual routes
        app.decorate('authenticate', async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
            try {
                await request.jwtVerify();
            } catch (err) {
                reply.send(err);
            }
        });

        // global auth guard — exempt public routes
        const PUBLIC_ROUTES = new Set(['/api/health', '/api/version', '/api/auth/login']);
        const PUBLIC_PREFIXES = ['/api/locales/'];
        app.addHook('onRequest', async (request, reply) => {
            const path = request.url.split('?')[0];
            if (PUBLIC_ROUTES.has(path)) return;
            if (PUBLIC_PREFIXES.some((p) => path.startsWith(p))) return;
            // SSE clients cannot send headers — allow token via query param only for SSE endpoint
            if (path.startsWith('/api/events')) {
                const query = request.query as Record<string, string>;
                if (query['token']) {
                    request.headers['authorization'] = `Bearer ${query['token']}`;
                }
            }
            try {
                await request.jwtVerify();
            } catch (err) {
                reply.send(err);
            }
        });
    } else {
        // Provide a no-op authenticate decorator so route handlers compile
        app.decorate('authenticate', async () => { });
        log.warn('AUTH_ENABLED=false — API is unprotected');
    }

    const apiPrefix = '/api';

    await app.register(authRoutes, { prefix: apiPrefix, config });
    await app.register(healthRoutes, { prefix: apiPrefix, paperlessClient, redis, db, version: getVersion(), config, warmup });
    await app.register(documentRoutes, { prefix: apiPrefix, db, paperlessClient, queues, sse, config, warmup });
    await app.register(jobRoutes, { prefix: apiPrefix, queues, sse });
    await app.register(promptRoutes, { prefix: apiPrefix, promptEngine });
    await app.register(analysisRoutes, { prefix: apiPrefix, queues, paperlessClient, llmProvider, promptEngine, config });
    await app.register(localesRoutes, { prefix: apiPrefix });

    // ── 6. Start ──────────────────────────────────────────────────────
    try {
        await app.listen({ port: config.PORT, host: '0.0.0.0' });
        log.info({ port: config.PORT }, 'API server listening');
    } catch (err) {
        log.error(err, 'Failed to start server');
        process.exit(1);
    }

    // ── 7. Graceful shutdown ──────────────────────────────────────────
    const shutdown = async (signal: string) => {
        log.info({ signal }, 'Shutting down');
        polling.stop();
        await app.close();
        await redis.quit();
        process.exit(0);
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
}

function getVersion(): string {
    try {
        const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf-8')) as { version?: string };
        return pkg.version ?? '0.0.0';
    } catch {
        return '0.0.0';
    }
}

void bootstrap();
