/**
 * Document Type generation stage.
 */
import type { AppConfig } from '@paperless-llm/shared';
import { updateContext, type DocumentContext } from '@paperless-llm/shared';
import { BasePipelineStage, type StageDependencies } from '../stage.interface.js';

export class DocumentTypeStage extends BasePipelineStage {
    readonly name = 'documentType';

    isEnabled(config: AppConfig, mode: 'manual' | 'auto'): boolean {
        return mode === 'manual' || config.AUTO_GENERATE_DOCUMENT_TYPE;
    }

    async process(ctx: DocumentContext, deps: StageDependencies): Promise<DocumentContext> {
        const documentTypes = await deps.paperlessClient.getDocumentTypes();
        const availableNames = documentTypes.map((dt) => dt.name);

        const prompt = await deps.promptEngine.render('document-type', {
            Language: deps.config.LLM_LANGUAGE,
            AvailableDocumentTypes: availableNames,
            Title: ctx.originalMetadata.title,
            Content: truncate(ctx.content, deps.config.TOKEN_LIMIT),
        });

        const raw = await deps.llmProvider.generateText(
            'You are a document management assistant.',
            prompt,
        );

        const trimmed = raw.trim();
        const documentType =
            trimmed === 'null' || trimmed === '' || !availableNames.includes(trimmed) ? null : trimmed;

        return updateContext(ctx, {
            suggestions: { ...ctx.suggestions, documentType },
        });
    }
}

function truncate(text: string, limit: number): string {
    if (limit === 0) return text;
    return text.length > limit ? text.slice(0, limit) + '…' : text;
}
