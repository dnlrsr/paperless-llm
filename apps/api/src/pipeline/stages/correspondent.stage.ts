/**
 * Correspondent generation stage.
 */
import type { AppConfig } from '@paperless-llm/shared';
import { updateContext, type DocumentContext } from '@paperless-llm/shared';
import { BasePipelineStage, type StageDependencies } from '../stage.interface.js';

export class CorrespondentStage extends BasePipelineStage {
    readonly name = 'correspondent';

    isEnabled(config: AppConfig, mode: 'manual' | 'auto'): boolean {
        return mode === 'manual' || config.AUTO_GENERATE_CORRESPONDENTS;
    }

    async process(ctx: DocumentContext, deps: StageDependencies): Promise<DocumentContext> {
        const correspondents = await deps.paperlessClient.getCorrespondents();
        const availableNames = correspondents.map((c) => c.name);

        const prompt = await deps.promptEngine.render('correspondent', {
            Language: deps.config.LLM_LANGUAGE,
            AvailableCorrespondents: availableNames,
            BlackList: deps.config.CORRESPONDENT_BLACK_LIST,
            Title: ctx.originalMetadata.title,
            Content: truncate(ctx.content, deps.config.TOKEN_LIMIT),
            UseExistingOnly: deps.useExistingOnly,
        });

        const raw = await deps.llmProvider.generateText(
            'You are a document management assistant.',
            prompt,
        );

        const trimmed = raw.trim();
        let correspondent: string | null;
        let newCorrespondent: string | null = null;

        if (trimmed === 'null' || trimmed === '') {
            correspondent = null;
        } else if (availableNames.includes(trimmed)) {
            // Exact match with an existing correspondent
            correspondent = trimmed;
        } else if (deps.useExistingOnly) {
            // When restricted to existing items, discard unknown names
            correspondent = null;
        } else {
            // New correspondent suggested by the LLM — keep it separate for user review
            correspondent = null;
            newCorrespondent = trimmed;
        }

        return updateContext(ctx, {
            suggestions: { ...ctx.suggestions, correspondent, newCorrespondent },
        });
    }
}

function truncate(text: string, limit: number): string {
    if (limit === 0) return text;
    return text.length > limit ? text.slice(0, limit) + '…' : text;
}
