/**
 * Created Date extraction stage.
 */
import type { AppConfig } from '@paperless-llm/shared';
import { updateContext, type DocumentContext } from '@paperless-llm/shared';
import { BasePipelineStage, type StageDependencies } from '../stage.interface.js';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreatedDateStage extends BasePipelineStage {
    readonly name = 'createdDate';

    isEnabled(config: AppConfig, mode: 'manual' | 'auto'): boolean {
        return mode === 'manual' || config.AUTO_GENERATE_CREATED_DATE;
    }

    async process(ctx: DocumentContext, deps: StageDependencies): Promise<DocumentContext> {
        const prompt = await deps.promptEngine.render('created-date', {
            Language: deps.config.LLM_LANGUAGE,
            Content: truncate(ctx.content, deps.config.TOKEN_LIMIT),
        });

        const raw = await deps.llmProvider.generateText(
            'You are a document management assistant.',
            prompt,
        );

        const trimmed = raw.trim();
        const createdDate = ISO_DATE_REGEX.test(trimmed) ? trimmed : null;

        return updateContext(ctx, {
            suggestions: { ...ctx.suggestions, createdDate },
        });
    }
}

function truncate(text: string, limit: number): string {
    if (limit === 0) return text;
    return text.length > limit ? text.slice(0, limit) + '…' : text;
}
