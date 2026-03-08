/**
 * Summary generation stage.
 */
import type { AppConfig } from '@paperless-llm/shared';
import { updateContext, type DocumentContext } from '@paperless-llm/shared';
import { BasePipelineStage, type StageDependencies } from '../stage.interface.js';

export class SummaryStage extends BasePipelineStage {
    readonly name = 'summary';

    isEnabled(_config: AppConfig, _mode: 'manual' | 'auto'): boolean {
        // Opt-in: only runs when explicitly requested in the stages list
        return false;
    }

    async process(ctx: DocumentContext, deps: StageDependencies): Promise<DocumentContext> {
        const prompt = await deps.promptEngine.render('summary', {
            Language: deps.config.LLM_LANGUAGE,
            Title: ctx.originalMetadata.title,
            Content: truncate(ctx.content, deps.config.TOKEN_LIMIT),
        });

        const summary = await deps.llmProvider.generateText(
            'You are a document management assistant.',
            prompt,
        );

        return updateContext(ctx, {
            suggestions: { ...ctx.suggestions, summary: summary.trim() },
        });
    }
}

function truncate(text: string, limit: number): string {
    if (limit === 0) return text;
    return text.length > limit ? text.slice(0, limit) + '…' : text;
}
