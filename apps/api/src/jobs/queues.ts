/**
 * BullMQ queue definitions — SRP: only queue/worker configuration.
 * Named queues enable independent scaling and monitoring.
 */
import { Queue, QueueEvents } from 'bullmq';
import type { Redis as IORedis } from 'ioredis';

export const METADATA_QUEUE = 'metadata';
export const OCR_QUEUE = 'ocr';
export const ANALYSIS_QUEUE = 'analysis';

export interface Queues {
    metadata: Queue;
    ocr: Queue;
    analysis: Queue;
}

const QUEUE_DEFAULTS = {
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
    },
};

export function createQueues(redis: IORedis): Queues {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const connection = redis as any;
    return {
        metadata: new Queue(METADATA_QUEUE, { connection, ...QUEUE_DEFAULTS }),
        ocr: new Queue(OCR_QUEUE, { connection, ...QUEUE_DEFAULTS }),
        analysis: new Queue(ANALYSIS_QUEUE, { connection, ...QUEUE_DEFAULTS }),
    };
}

export function createQueueEvents(queueName: string, redis: IORedis): QueueEvents {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new QueueEvents(queueName, { connection: redis as any });
}
