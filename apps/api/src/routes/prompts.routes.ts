/**
 * Prompt template routes — CRUD for prompt templates.
 */
import { UpdatePromptRequestSchema } from '@paperless-llm/shared';
import type { FastifyPluginAsync } from 'fastify';
import type { PromptEngine } from '../prompts/engine.js';

interface PromptsDeps {
    promptEngine: PromptEngine;
}

export const promptRoutes: FastifyPluginAsync<PromptsDeps> = async (fastify, opts) => {
    const { promptEngine } = opts;

    // GET /prompts — list all templates
    fastify.get('/prompts', async () => {
        return { prompts: promptEngine.listTemplates() };
    });

    // GET /prompts/:name — single template
    fastify.get<{ Params: { name: string } }>('/prompts/:name', async (req, reply) => {
        const templates = promptEngine.listTemplates();
        const tmpl = templates.find((t) => t.name === req.params['name']);
        if (!tmpl) return reply.notFound(`Template "${req.params['name']}" not found`);
        return tmpl;
    });

    // PUT /prompts/:name — save custom template
    fastify.put<{ Params: { name: string }; Body: unknown }>(
        '/prompts/:name',
        async (req, reply) => {
            const parsed = UpdatePromptRequestSchema.safeParse(req.body);
            if (!parsed.success) return reply.badRequest(parsed.error.message);

            promptEngine.saveTemplate(req.params['name'], parsed.data.content);
            return { success: true };
        },
    );

    // DELETE /prompts/:name — reset template to default
    fastify.delete<{ Params: { name: string } }>('/prompts/:name', async (req, reply) => {
        try {
            promptEngine.resetTemplate(req.params['name']);
            return reply.status(204).send();
        } catch (err) {
            return reply.notFound(String(err));
        }
    });
};
