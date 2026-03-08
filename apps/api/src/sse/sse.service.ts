/**
 * SSE (Server-Sent Events) service — SRP: manages live push to web clients.
 */
import type { FastifyReply } from 'fastify';
import { getLogger } from '../config/logger.js';

export interface SseEvent {
    type: 'job.progress' | 'job.completed' | 'job.failed' | 'document.updated';
    payload: Record<string, unknown>;
}

export class SseService {
    private readonly clients = new Set<FastifyReply>();

    addClient(reply: FastifyReply): void {
        this.clients.add(reply);
        getLogger().debug({ total: this.clients.size }, 'SSE client connected');
        reply.raw.on('close', () => {
            this.clients.delete(reply);
            getLogger().debug({ total: this.clients.size }, 'SSE client disconnected');
        });
    }

    broadcast(event: SseEvent): void {
        const data = `event: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`;
        for (const reply of this.clients) {
            try {
                reply.raw.write(data);
            } catch {
                this.clients.delete(reply);
            }
        }
    }
}
