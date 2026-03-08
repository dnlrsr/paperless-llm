/**
 * Document routes — manual review flow.
 */
import type { AppConfig, DocumentSuggestions } from '@paperless-llm/shared';
import { GenerateRequestSchema } from '@paperless-llm/shared';
import { and, eq } from 'drizzle-orm';
import type { FastifyPluginAsync } from 'fastify';
import type { Database } from '../db/connection.js';
import * as schema from '../db/schema.js';
import type { Queues } from '../jobs/queues.js';
import type { PaperlessClient } from '../paperless/client.js';
import type { SseService } from '../sse/sse.service.js';

interface DocumentsDeps {
    db: Database;
    paperlessClient: PaperlessClient;
    queues: Queues;
    sse: SseService;
    config: AppConfig;
}

export const documentRoutes: FastifyPluginAsync<DocumentsDeps> = async (fastify, opts) => {
    const { db, paperlessClient, queues, sse, config } = opts;

    // GET /documents/pending — list documents awaiting review
    fastify.get('/documents/pending', async () => {
        const pendingTag = await paperlessClient.getTagByName(config.MANUAL_TAG);
        if (!pendingTag) return { documents: [] };

        const documents = await paperlessClient.getDocumentsByTag(pendingTag.id);
        const allTags = await paperlessClient.getTags();

        const result = documents.map((doc) => {
            const hasSuggestions =
                db
                    .select({ id: schema.suggestions.id })
                    .from(schema.suggestions)
                    .where(
                        and(
                            eq(schema.suggestions.documentId, doc.id),
                            eq(schema.suggestions.status, 'pending'),
                        ),
                    )
                    .all().length > 0;

            return {
                id: doc.id,
                title: doc.title,
                content: doc.content,
                created: doc.created,
                originalFileName: doc.original_file_name,
                hasSuggestions,
                tags: doc.tags.map((id) => allTags.find((t) => t.id === id)?.name ?? String(id)),
            };
        });

        return { documents: result, total: result.length };
    });

    // GET /documents/:id/suggestions — get AI suggestions for a document
    fastify.get<{ Params: { id: string } }>('/documents/:id/suggestions', async (req, reply) => {
        const documentId = parseInt(req.params['id'], 10);
        if (isNaN(documentId)) return reply.badRequest('Invalid document id');

        const rows = db
            .select()
            .from(schema.suggestions)
            .where(
                and(
                    eq(schema.suggestions.documentId, documentId),
                    eq(schema.suggestions.status, 'pending'),
                ),
            )
            .orderBy(schema.suggestions.createdAt)
            .all();

        const latest = rows.at(-1);
        if (!latest) return reply.notFound('No pending suggestions for this document');

        return {
            id: latest.id,
            documentId: latest.documentId,
            title: latest.title,
            tags: latest.tags,
            correspondent: latest.correspondent,
            documentType: latest.documentType,
            createdDate: latest.createdDate,
            customFields: latest.customFields,
            summary: latest.summary,
        };
    });

    // POST /documents/:id/generate — trigger generation for one document
    fastify.post<{ Params: { id: string }; Body: unknown }>(
        '/documents/:id/generate',
        async (req, reply) => {
            const documentId = parseInt(req.params['id'], 10);
            if (isNaN(documentId)) return reply.badRequest('Invalid document id');

            const parsed = GenerateRequestSchema.safeParse(req.body);
            const stages = parsed.success ? (parsed.data.stages ?? []) : [];

            const job = await queues.metadata.add(
                'metadata',
                { documentId, mode: 'manual', stages },
                { jobId: `manual-${documentId}-${Date.now()}` },
            );

            return reply.status(202).send({ jobId: job.id });
        },
    );

    // POST /documents/:id/apply — write suggestions to paperless-ngx
    fastify.post<{ Params: { id: string } }>(
        '/documents/:id/apply',
        async (req, reply) => {
            const documentId = parseInt(req.params['id'], 10);
            if (isNaN(documentId)) return reply.badRequest('Invalid document id');

            // Look up pending suggestions from DB
            const row = db
                .select()
                .from(schema.suggestions)
                .where(
                    and(
                        eq(schema.suggestions.documentId, documentId),
                        eq(schema.suggestions.status, 'pending'),
                    ),
                )
                .orderBy(schema.suggestions.createdAt)
                .all()
                .at(-1);

            if (!row) return reply.notFound('No pending suggestions for this document');

            const suggestions = {
                title: row.title ?? undefined,
                tags: row.tags ?? undefined,
                correspondent: row.correspondent ?? undefined,
                documentType: row.documentType ?? undefined,
                createdDate: row.createdDate ?? undefined,
                customFields: row.customFields ?? undefined,
            } as Partial<DocumentSuggestions>;

            const document = await paperlessClient.getDocument(documentId);
            await paperlessClient.applySuggestions(document, suggestions);

            // Mark as applied in DB
            db.update(schema.suggestions)
                .set({ status: 'applied', appliedAt: new Date() })
                .where(
                    and(
                        eq(schema.suggestions.documentId, documentId),
                        eq(schema.suggestions.status, 'pending'),
                    ),
                )
                .run();

            // Remove MANUAL_TAG from document
            const manualTag = await paperlessClient.getTagByName(config.MANUAL_TAG);
            if (manualTag) {
                const newTags = document.tags.filter((t) => t !== manualTag.id);
                await paperlessClient.updateDocument(documentId, { tags: newTags });
            }

            sse.broadcast({ type: 'document.updated', payload: { documentId } });
            return { success: true };
        },
    );

    // DELETE /documents/:id/suggestions — discard pending suggestions
    fastify.delete<{ Params: { id: string } }>(
        '/documents/:id/suggestions',
        async (req, reply) => {
            const documentId = parseInt(req.params['id'], 10);
            if (isNaN(documentId)) return reply.badRequest('Invalid document id');

            db.update(schema.suggestions)
                .set({ status: 'discarded' })
                .where(
                    and(
                        eq(schema.suggestions.documentId, documentId),
                        eq(schema.suggestions.status, 'pending'),
                    ),
                )
                .run();

            return reply.status(204).send();
        },
    );
};
