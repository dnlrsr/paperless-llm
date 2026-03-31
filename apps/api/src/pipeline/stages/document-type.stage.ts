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
            UseExistingOnly: deps.useExistingOnly,
        });

        const raw = await deps.llmProvider.generateText(
            'You are a document management assistant.',
            prompt,
        );

        const trimmed = raw.trim();
        let documentType: string | null;
        let newDocumentType: string | null = null;

        if (trimmed === 'null' || trimmed === '') {
            documentType = null;
        } else if (availableNames.includes(trimmed)) {
            // Exact match with an existing document type
            documentType = trimmed;
        } else if (deps.useExistingOnly) {
            // When restricted to existing items, discard unknown types
            documentType = null;
        } else {
            // New document type suggested by the LLM — keep it separate for user review
            documentType = null;
            newDocumentType = trimmed;
        }

        return updateContext(ctx, {
            suggestions: { ...ctx.suggestions, documentType, newDocumentType },
        });
    }
}

function truncate(text: string, limit: number): string {
    if (limit === 0) return text;
    return text.length > limit ? text.slice(0, limit) + '…' : text;
}
