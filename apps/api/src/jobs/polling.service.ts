/**
 * Document polling loop — SRP: detects new tagged documents and enqueues jobs.
 * OCP: tag → queue mappings are configured, not hardcoded.
 */
import type { AppConfig } from '@paperless-llm/shared';
import { and, eq } from 'drizzle-orm';
import { getLogger } from '../config/logger.js';
import type { Database } from '../db/connection.js';
import * as schema from '../db/schema.js';
import type { PaperlessClient } from '../paperless/client.js';
import type { Queues } from './queues.js';

interface TagQueueMapping {
    tagName: string;
    queueName: keyof Queues;
    jobMode: 'manual' | 'auto';
    isOcr?: boolean;
}

export class PollingService {
    private timer: ReturnType<typeof setInterval> | null = null;
    private readonly mappings: TagQueueMapping[];

    constructor(
        private readonly paperlessClient: PaperlessClient,
        private readonly queues: Queues,
        private readonly config: AppConfig,
        private readonly db: Database,
    ) {
        this.mappings = [
            { tagName: config.MANUAL_TAG, queueName: 'metadata', jobMode: 'manual' },
            { tagName: config.AUTO_TAG, queueName: 'metadata', jobMode: 'auto' },
            { tagName: config.AUTO_OCR_TAG, queueName: 'ocr', jobMode: 'auto', isOcr: true },
        ];
    }

    start(): void {
        const log = getLogger();
        log.info({ intervalSeconds: this.config.POLL_INTERVAL_SECONDS }, 'Polling service started');
        this.timer = setInterval(() => void this.poll(), this.config.POLL_INTERVAL_SECONDS * 1000);
        void this.poll(); // run immediately on start
    }

    stop(): void {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    private async poll(): Promise<void> {
        const log = getLogger();
        const allTags = await this.paperlessClient.getTags();

        for (const mapping of this.mappings) {
            const tag = allTags.find((t) => t.name === mapping.tagName);
            if (!tag) continue;

            const documents = await this.paperlessClient.getDocumentsByTag(tag.id);
            if (documents.length === 0) continue;

            log.info(
                { tag: mapping.tagName, count: documents.length },
                'Poller: found documents to process',
            );

            for (const doc of documents) {
                const queue = this.queues[mapping.queueName];

                if (mapping.jobMode === 'manual') {
                    // Manual tag: smart deduplication via DB + active job check.
                    if (!this.config.MANUAL_AUTO_GENERATE) continue;

                    // Skip if pending suggestions already exist (awaiting user review).
                    const hasPending =
                        this.db
                            .select({ id: schema.suggestions.id })
                            .from(schema.suggestions)
                            .where(
                                and(
                                    eq(schema.suggestions.documentId, doc.id),
                                    eq(schema.suggestions.status, 'pending'),
                                ),
                            )
                            .all().length > 0;
                    if (hasPending) continue;

                    // Skip if a job for this document is already active or waiting.
                    const [active, waiting] = await Promise.all([
                        queue.getActive(),
                        queue.getWaiting(),
                    ]);
                    const alreadyRunning = [...active, ...waiting].some(
                        (j) => (j.data as { documentId?: number }).documentId === doc.id,
                    );
                    if (alreadyRunning) continue;

                    // Use a timestamp-based jobId so BullMQ doesn't deduplicate against stale completed jobs.
                    const manualJobId = `${mapping.tagName}-${doc.id}-${Date.now()}`;
                    await this.queues.metadata.add(
                        'metadata',
                        {
                            documentId: doc.id,
                            mode: 'manual',
                            stages: [],
                            useExistingOnly: this.config.USE_EXISTING_DATA_ONLY,
                        },
                        { jobId: manualJobId },
                    );
                } else {
                    // Auto / OCR tags: stable jobId dedup (job runs once then tag is removed).
                    const jobId = `${mapping.tagName}-${doc.id}`;
                    const existing = await queue.getJob(jobId);
                    if (existing) continue;

                    if (mapping.isOcr) {
                        await this.queues.ocr.add(
                            'ocr',
                            {
                                documentId: doc.id,
                                processMode: this.config.OCR_PROCESS_MODE,
                                limitPages: this.config.OCR_LIMIT_PAGES,
                            },
                            { jobId },
                        );
                    } else {
                        await this.queues.metadata.add(
                            'metadata',
                            {
                                documentId: doc.id,
                                mode: mapping.jobMode,
                                stages: [],
                                useExistingOnly: this.config.USE_EXISTING_DATA_ONLY,
                            },
                            { jobId },
                        );
                    }
                }

                log.debug({ documentId: doc.id, tag: mapping.tagName }, 'Poller: enqueued document');
            }
        }
    }
}
