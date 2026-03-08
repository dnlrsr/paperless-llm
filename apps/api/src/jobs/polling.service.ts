/**
 * Document polling loop — SRP: detects new tagged documents and enqueues jobs.
 * OCP: tag → queue mappings are configured, not hardcoded.
 */
import type { AppConfig } from '@paperless-llm/shared';
import { getLogger } from '../config/logger.js';
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
                const jobId = `${mapping.tagName}-${doc.id}`;

                // Deduplicate: skip if job already queued
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
                        },
                        { jobId },
                    );
                }

                log.debug({ documentId: doc.id, tag: mapping.tagName }, 'Poller: enqueued document');
            }
        }
    }
}
