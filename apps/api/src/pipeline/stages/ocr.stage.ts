/**
 * OCR stage — downloads PDF, runs through the OCR provider, updates document content.
 */
import type { AppConfig } from '@paperless-llm/shared';
import { updateContext, type DocumentContext } from '@paperless-llm/shared';
import { getLogger } from '../../config/logger.js';
import { pdfHasTextLayer } from '../../utils/pdf-utils.js';
import { BasePipelineStage, type StageDependencies } from '../stage.interface.js';

export class OcrStage extends BasePipelineStage {
    readonly name = 'ocr';

    // Never runs automatically — must be explicitly requested via the stages list
    isEnabled(_config: AppConfig, _mode: 'manual' | 'auto'): boolean {
        return false;
    }

    async process(ctx: DocumentContext, deps: StageDependencies): Promise<DocumentContext> {
        const log = getLogger();
        const { config, paperlessClient, ocrProvider } = deps;

        if (!ctx.pdfBuffer) {
            log.warn({ documentId: ctx.documentId }, 'OCR stage: no PDF buffer — downloading');
        }

        const pdfBuffer =
            ctx.pdfBuffer ?? (await paperlessClient.downloadDocument(ctx.documentId));

        // Optionally skip if existing OCR detected
        if (config.PDF_SKIP_EXISTING_OCR) {
            const hasText = await pdfHasTextLayer(pdfBuffer);
            if (hasText) {
                log.info({ documentId: ctx.documentId }, 'OCR stage: existing text layer detected, skipping');
                return ctx;
            }
        }

        const ocrResult = await ocrProvider.process(
            {
                pdfBuffer,
                limitPages: config.OCR_LIMIT_PAGES,
                language: config.LLM_LANGUAGE,
            },
            config.OCR_PROCESS_MODE,
        );

        return updateContext(ctx, {
            content: ocrResult.text,
            ocrText: ocrResult.text,
            hocrXml: ocrResult.hocrXml,
            pdfBuffer,
        });
    }
}
