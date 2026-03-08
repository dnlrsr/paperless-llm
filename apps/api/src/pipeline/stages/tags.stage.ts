/**
 * Tags generation stage.
 */
import type { AppConfig } from '@paperless-llm/shared';
import { updateContext, type DocumentContext } from '@paperless-llm/shared';
import { BasePipelineStage, type StageDependencies } from '../stage.interface.js';

const TAG_ARRAY_REGEX = /\[.*\]/s;

export class TagsStage extends BasePipelineStage {
    readonly name = 'tags';

    isEnabled(config: AppConfig, mode: 'manual' | 'auto'): boolean {
        return mode === 'manual' || config.AUTO_GENERATE_TAGS;
    }

    async process(ctx: DocumentContext, deps: StageDependencies): Promise<DocumentContext> {
        const allTags = await deps.paperlessClient.getTags();
        const availableTagNames = allTags.map((t) => t.name);

        const originalTagNames = ctx.originalMetadata.tags
            .map((id) => allTags.find((t) => t.id === id)?.name)
            .filter((n): n is string => n !== undefined);

        const prompt = await deps.promptEngine.render('tags', {
            Language: deps.config.LLM_LANGUAGE,
            AvailableTags: availableTagNames,
            OriginalTags: originalTagNames,
            Title: ctx.originalMetadata.title,
            Content: truncate(ctx.content, deps.config.TOKEN_LIMIT),
        });

        const raw = await deps.llmProvider.generateText(
            'You are a document management assistant.',
            prompt,
        );

        const match = TAG_ARRAY_REGEX.exec(raw);
        let tags: string[] = [];
        if (match) {
            try {
                const parsed: unknown = JSON.parse(match[0]);
                if (Array.isArray(parsed)) {
                    tags = parsed
                        .filter((t): t is string => typeof t === 'string')
                        .filter((t) => availableTagNames.includes(t));
                }
            } catch {
                tags = [];
            }
        }

        return updateContext(ctx, {
            suggestions: { ...ctx.suggestions, tags },
        });
    }
}

function truncate(text: string, limit: number): string {
    if (limit === 0) return text;
    return text.length > limit ? text.slice(0, limit) + '…' : text;
}
