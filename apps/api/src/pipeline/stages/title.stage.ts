/**
 * Title generation stage.
 * SRP: only responsible for generating the document title.
 */
import type { AppConfig } from '@paperless-llm/shared';
import { updateContext, type DocumentContext } from '@paperless-llm/shared';
import { BasePipelineStage, type StageDependencies } from '../stage.interface.js';

export class TitleStage extends BasePipelineStage {
    readonly name = 'title';

    isEnabled(config: AppConfig, mode: 'manual' | 'auto'): boolean {
        return mode === 'manual' || config.AUTO_GENERATE_TITLE;
    }

    async process(ctx: DocumentContext, deps: StageDependencies): Promise<DocumentContext> {
        const prompt = await deps.promptEngine.render('title', {
            Language: deps.config.LLM_LANGUAGE,
            Content: truncate(ctx.content, deps.config.TOKEN_LIMIT),
            Title: ctx.originalMetadata.title,
        });

        const title = await deps.llmProvider.generateText(
            'You are a document management assistant.',
            prompt,
        );

        return updateContext(ctx, {
            suggestions: { ...ctx.suggestions, title: title.trim() },
        });
    }
}

function truncate(text: string, limit: number): string {
    if (limit === 0) return text;
    return text.length > limit ? text.slice(0, limit) + '…' : text;
}
