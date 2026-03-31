/**
 * Metadata job worker — SRP: processes metadata pipeline jobs.
 * DIP: receives all dependencies via constructor injection.
 */
import type { MetadataJobData } from '@paperless-llm/shared';
import { Worker, type Job } from 'bullmq';
import { eq } from 'drizzle-orm';
import type { Redis as IORedis } from 'ioredis';
import { getLogger } from '../config/logger.js';
import type { Database } from '../db/connection.js';
import * as schema from '../db/schema.js';
import type { PaperlessClient } from '../paperless/client.js';
import { Pipeline } from '../pipeline/pipeline.js';
import type { StageDependencies } from '../pipeline/stage.interface.js';
import type { OllamaWarmupService } from '../providers/llm/ollama-warmup.service.js';
import { METADATA_QUEUE } from './queues.js';

/** How long to pause (ms) before requeuing a job that aborted due to cold-start. */
const COLD_START_REQUEUE_DELAY_MS = 15_000;

export function createMetadataWorker(
    redis: IORedis,
    deps: StageDependencies,
    db: Database,
    paperlessClient: PaperlessClient,
    warmup?: OllamaWarmupService,
): Worker<MetadataJobData> {
    const pipeline = new Pipeline();
    const log = getLogger();

    const worker = new Worker<MetadataJobData>(
        METADATA_QUEUE,
        async (job: Job<MetadataJobData>) => {
            const { documentId, mode, stages, useExistingOnly } = job.data;

            // ── Health-gate: wait for Ollama to finish loading the model ───────
            if (warmup) {
                const state = warmup.currentState;
                if (state === 'warming' || state === 'idle') {
                    log.info({ documentId, jobId: job.id }, 'Waiting for Ollama model to warm up…');
                    await warmup.waitUntilReady();
                    log.info({ documentId, jobId: job.id }, 'Ollama model ready — proceeding');
                }
            }

            // Resolve effective flag: per-job override → global config
            const jobDeps: StageDependencies = {
                ...deps,
                useExistingOnly: useExistingOnly ?? deps.config.USE_EXISTING_DATA_ONLY,
            };

            log.info({ documentId, jobId: job.id }, 'Starting metadata job');
            await job.updateProgress(5);

            const document = await paperlessClient.getDocument(documentId);
            await job.updateProgress(15);

            const ctx = {
                documentId,
                content: document.content,
                originalMetadata: document,
                suggestions: {},
            };

            const result = await pipeline.run(ctx, jobDeps, mode, stages, async (pct, stage) => {
                await job.updateProgress({ pct, stage });
            });
            await job.updateProgress({ pct: 85, stage: null });

            await db
                .insert(schema.suggestions)
                .values({
                    documentId,
                    status: 'pending',
                    title: result.suggestions.title ?? null,
                    tags: result.suggestions.tags ?? null,
                    correspondent: result.suggestions.correspondent ?? null,
                    documentType: result.suggestions.documentType ?? null,
                    createdDate: result.suggestions.createdDate ?? null,
                    customFields: result.suggestions.customFields ?? null,
                    summary: result.suggestions.summary ?? null,
                    newTags: result.suggestions.newTags?.length ? result.suggestions.newTags : null,
                    newCorrespondent: result.suggestions.newCorrespondent ?? null,
                    newDocumentType: result.suggestions.newDocumentType ?? null,
                })
                .onConflictDoNothing();

            await job.updateProgress(100);
            log.info({ documentId, jobId: job.id }, 'Metadata job complete');
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { connection: redis as any, concurrency: 1, stalledInterval: 30_000, maxStalledCount: 1 },
    );

    worker.on('failed', (job, err) => {
        const isColdStart = err instanceof Error && (
            err.name === 'AbortError' ||
            // ollama-ai-provider wraps the abort in an AI_APICallError
            err.message.includes('aborted') ||
            err.message.includes('ECONNREFUSED') ||
            err.message.includes('ECONNRESET')
        );

        if (isColdStart && warmup) {
            log.warn(
                { jobId: job?.id, err },
                `Metadata job failed due to Ollama cold-start. ` +
                `Re-triggering warmup and requeueing in ${COLD_START_REQUEUE_DELAY_MS / 1000}s`,
            );
            // Re-arm the warmup so subsequent workers gate again.
            warmup.reset();
            void warmup.start();

            // Requeue with a delay so the model has time to load.
            if (job) {
                setTimeout(() => {
                    void job.retry().catch((retryErr) =>
                        log.error({ jobId: job.id, retryErr }, 'Failed to requeue cold-start job'),
                    );
                }, COLD_START_REQUEUE_DELAY_MS);
            }
            return;
        }

        log.error({ jobId: job?.id, err }, 'Metadata job failed');
        if (job?.id) {
            db.update(schema.jobs)
                .set({ status: 'failed', error: String(err), completedAt: new Date() })
                .where(eq(schema.jobs.id, job.id))
                .run();
        }
    });

    return worker;
}
