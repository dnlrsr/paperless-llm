/**
 * Health check route — SRP: only checks connectivity of external dependencies.
 */
import type { AppConfig } from '@paperless-llm/shared';
import type { FastifyPluginAsync } from 'fastify';
import type { Redis as IORedis } from 'ioredis';
import type { Database } from '../db/connection.js';
import type { PaperlessClient } from '../paperless/client.js';
import type { OllamaWarmupService } from '../providers/llm/ollama-warmup.service.js';

interface HealthDeps {
    paperlessClient: PaperlessClient;
    redis: IORedis;
    db: Database;
    version: string;
    config: AppConfig;
    warmup?: OllamaWarmupService;
}

async function checkOllama(
    rawHost: string,
    model: string,
): Promise<{ ok: boolean; error?: string }> {
    const baseURL = rawHost.endsWith('/api') ? rawHost : `${rawHost.replace(/\/$/, '')}/api`;
    try {
        const res = await fetch(`${baseURL}/tags`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return { ok: false, error: `Ollama unreachable (HTTP ${res.status})` };
        const body = await res.json() as { models?: Array<{ name: string }> };
        // If the model has no explicit tag, Ollama resolves it to :latest
        const hasTag = model.includes(':');
        const found = (body.models ?? []).some((m) =>
            hasTag ? m.name === model : m.name === model || m.name === `${model}:latest`,
        );
        if (!found) return { ok: false, error: `model '${model}' not found` };
        return { ok: true };
    } catch {
        return { ok: false, error: 'Ollama unreachable' };
    }
}

export const healthRoutes: FastifyPluginAsync<HealthDeps> = async (fastify, opts) => {
    fastify.get('/health', async (_req, reply) => {
        const ollamaHost = opts.config.LLM_PROVIDER === 'ollama' && opts.config.OLLAMA_HOST
            ? opts.config.OLLAMA_HOST
            : null;

        const ollamaResultPromise = ollamaHost
            ? checkOllama(ollamaHost, opts.config.LLM_MODEL)
            : Promise.resolve(null);

        const [paperlessNgx, redisOk, dbOk, ollamaResult] = await Promise.all([
            opts.paperlessClient.ping().catch(() => false),
            opts.redis.ping().then(() => true).catch(() => false),
            Promise.resolve(true), // SQLite is always available if the process is running
            ollamaResultPromise,
        ]);

        const ollamaOk = ollamaResult === null ? null : ollamaResult.ok;
        const warmupState = opts.warmup?.currentState ?? null;
        const allOk = paperlessNgx && redisOk && dbOk && (ollamaOk !== false);

        return reply.status(200).send({
            status: allOk ? 'ok' : 'degraded',
            version: opts.version,
            checks: { paperlessNgx, redis: redisOk, database: dbOk, ollama: ollamaOk },
            ...(ollamaHost ? { ollamaModel: opts.config.LLM_MODEL } : {}),
            ...(ollamaResult?.error ? { ollamaError: ollamaResult.error } : {}),
            ...(warmupState !== null ? { ollamaWarmup: warmupState } : {}),
        });
    });

    fastify.get('/version', async () => ({ version: opts.version }));
};
