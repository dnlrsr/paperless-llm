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
import { METADATA_QUEUE } from './queues.js';

export function createMetadataWorker(
    redis: IORedis,
    deps: StageDependencies,
    db: Database,
    paperlessClient: PaperlessClient,
): Worker<MetadataJobData> {
    const pipeline = new Pipeline();
    const log = getLogger();

    const worker = new Worker<MetadataJobData>(
        METADATA_QUEUE,
        async (job: Job<MetadataJobData>) => {
            const { documentId, mode, stages } = job.data;

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

            const result = await pipeline.run(ctx, deps, mode, stages);
            await job.updateProgress(85);

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
                })
                .onConflictDoNothing();

            await job.updateProgress(100);
            log.info({ documentId, jobId: job.id }, 'Metadata job complete');
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { connection: redis as any, concurrency: 2 },
    );

    worker.on('failed', (job, err) => {
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
