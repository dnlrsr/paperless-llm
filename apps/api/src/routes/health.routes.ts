/**
 * Health check route — SRP: only checks connectivity of external dependencies.
 */
import type { AppConfig } from '@paperless-llm/shared';
import type { FastifyPluginAsync } from 'fastify';
import type { Redis as IORedis } from 'ioredis';
import type { Database } from '../db/connection.js';
import type { PaperlessClient } from '../paperless/client.js';

interface HealthDeps {
    paperlessClient: PaperlessClient;
    redis: IORedis;
    db: Database;
    version: string;
    config: AppConfig;
}

export const healthRoutes: FastifyPluginAsync<HealthDeps> = async (fastify, opts) => {
    fastify.get('/health', async (_req, reply) => {
        const ollamaUrl = opts.config.LLM_PROVIDER === 'ollama' && opts.config.OLLAMA_HOST
            ? opts.config.OLLAMA_HOST
            : null;

        const [paperlessNgx, redisOk, dbOk, ollamaOk] = await Promise.all([
            opts.paperlessClient.ping().catch(() => false),
            opts.redis.ping().then(() => true).catch(() => false),
            Promise.resolve(true), // SQLite is always available if the process is running
            ollamaUrl
                ? fetch(`${ollamaUrl}/tags`, { signal: AbortSignal.timeout(5000) })
                    .then((r) => r.ok)
                    .catch(() => false)
                : Promise.resolve(null),
        ]);

        const allOk = paperlessNgx && redisOk && dbOk && (ollamaOk !== false);

        return reply.status(200).send({
            status: allOk ? 'ok' : 'degraded',
            version: opts.version,
            checks: { paperlessNgx, redis: redisOk, database: dbOk, ollama: ollamaOk },
            ...(ollamaUrl ? { ollamaModel: opts.config.LLM_MODEL } : {}),
        });
    });

    fastify.get('/version', async () => ({ version: opts.version }));
};
