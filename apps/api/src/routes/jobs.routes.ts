/**
 * Jobs routes — expose BullMQ job status.
 */
import type { FastifyPluginAsync } from 'fastify';
import type { Queues } from '../jobs/queues.js';
import type { SseService } from '../sse/sse.service.js';

interface JobsDeps {
    queues: Queues;
    sse: SseService;
}

export const jobRoutes: FastifyPluginAsync<JobsDeps> = async (fastify, opts) => {
    const { queues, sse } = opts;

    const allQueues = Object.entries(queues) as [string, Queues[keyof Queues]][];

    // GET /jobs — list recent jobs across all queues
    fastify.get('/jobs', async () => {
        const jobs = (
            await Promise.all(
                allQueues.map(async ([type, queue]) => {
                    const [active, waiting, completed, failed] = await Promise.all([
                        queue.getActive(),
                        queue.getWaiting(),
                        queue.getCompleted(0, 20),
                        queue.getFailed(0, 20),
                    ]);
                    return [...active, ...waiting, ...completed, ...failed].map((j) => ({
                        id: j.id,
                        type,
                        data: j.data,
                        progress: typeof j.progress === 'number' ? j.progress : 0,
                        status: j.finishedOn ? (j.failedReason ? 'failed' : 'completed') : 'active',
                        failedReason: j.failedReason,
                        createdAt: new Date(j.timestamp).toISOString(),
                    }));
                }),
            )
        ).flat();

        return { jobs };
    });

    // GET /jobs/:id — single job detail
    fastify.get<{ Params: { id: string }; Querystring: { queue?: string } }>(
        '/jobs/:id',
        async (req, reply) => {
            const { id } = req.params;
            const queueName = req.query['queue'];

            const searchQueues = queueName
                ? allQueues.filter(([n]) => n === queueName)
                : allQueues;

            for (const [type, queue] of searchQueues) {
                const job = await queue.getJob(id);
                if (job) {
                    return {
                        id: job.id,
                        type,
                        data: job.data,
                        progress: typeof job.progress === 'number' ? job.progress : 0,
                        status: job.finishedOn ? (job.failedReason ? 'failed' : 'completed') : 'active',
                        failedReason: job.failedReason,
                        logs: await job.log ? (await queue.getJobLogs(id)).logs : [],
                        createdAt: new Date(job.timestamp).toISOString(),
                    };
                }
            }

            return reply.notFound(`Job ${id} not found`);
        },
    );

    // DELETE /jobs/:id — cancel a job
    fastify.delete<{ Params: { id: string }; Querystring: { queue?: string } }>(
        '/jobs/:id',
        async (req, reply) => {
            const { id } = req.params;
            const queueName = req.query['queue'];

            const searchQueues = queueName
                ? allQueues.filter(([n]) => n === queueName)
                : allQueues;

            for (const [, queue] of searchQueues) {
                const job = await queue.getJob(id);
                if (job) {
                    await job.remove();
                    return reply.status(204).send();
                }
            }

            return reply.notFound(`Job ${id} not found`);
        },
    );

    // GET /events — SSE stream
    fastify.get('/events', async (req, reply) => {
        reply.raw.setHeader('Content-Type', 'text/event-stream');
        reply.raw.setHeader('Cache-Control', 'no-cache');
        reply.raw.setHeader('Connection', 'keep-alive');
        reply.raw.flushHeaders();

        sse.addClient(reply);

        // Keep-alive ping every 30s
        const ping = setInterval(() => {
            try {
                reply.raw.write(':ping\n\n');
            } catch {
                clearInterval(ping);
            }
        }, 30_000);

        req.raw.on('close', () => clearInterval(ping));

        // Never resolve — connection stays open
        await new Promise<void>(() => undefined);
    });
};
