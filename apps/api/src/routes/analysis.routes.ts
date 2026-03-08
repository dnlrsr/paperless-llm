/**
 * Ad-hoc analysis routes.
 */
import type { AppConfig } from '@paperless-llm/shared';
import { AnalysisRequestSchema } from '@paperless-llm/shared';
import type { FastifyPluginAsync } from 'fastify';
import type { Queues } from '../jobs/queues.js';
import type { PaperlessClient } from '../paperless/client.js';
import type { PromptEngine } from '../prompts/engine.js';
import type { TextLLMProvider } from '../providers/llm/interface.js';

interface AnalysisDeps {
    queues: Queues;
    paperlessClient: PaperlessClient;
    llmProvider: TextLLMProvider;
    promptEngine: PromptEngine;
    config: AppConfig;
}

export const analysisRoutes: FastifyPluginAsync<AnalysisDeps> = async (fastify, opts) => {
    const { paperlessClient, llmProvider, config } = opts;

    // POST /analysis — run ad-hoc analysis on documents
    fastify.post<{ Body: unknown }>('/analysis', async (req, reply) => {
        const parsed = AnalysisRequestSchema.safeParse(req.body);
        if (!parsed.success) return reply.badRequest(parsed.error.message);
        const { documentIds, prompt, language } = parsed.data;

        const documents = await Promise.all(documentIds.map((id) => paperlessClient.getDocument(id)));

        const combinedContent = documents
            .map((d) => `=== Document: ${d.title} (ID: ${d.id}) ===\n${d.content}`)
            .join('\n\n');

        const systemPrompt = `You are an expert document analyst. Language: ${language}. Be concise and accurate.`;
        const userPrompt = `${prompt}\n\n${combinedContent}`;

        const truncated = config.TOKEN_LIMIT > 0 && userPrompt.length > config.TOKEN_LIMIT
            ? userPrompt.slice(0, config.TOKEN_LIMIT) + '…'
            : userPrompt;

        const result = await llmProvider.generateText(systemPrompt, truncated);

        return reply.status(200).send({
            result,
            documentIds,
            prompt,
        });
    });
};
