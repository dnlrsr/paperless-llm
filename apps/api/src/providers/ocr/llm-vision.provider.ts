/**
 * LLM-Vision OCR provider.
 * Converts each PDF page to a JPEG image and submits it to a vision LLM.
 * SRP: only responsible for LLM-based OCR logic.
 */
import type { OcrProcessMode, OcrResult } from '@paperless-llm/shared';
import type { PromptEngine } from '../../prompts/engine.js';
import { pdfToImages } from '../../utils/pdf-utils.js';
import type { VisionLLMProvider } from '../llm/interface.js';
import { BaseOcrProvider, type OcrInput } from './interface.js';

export class LlmVisionOcrProvider extends BaseOcrProvider {
    readonly providerName = 'llm';
    readonly supportedModes: ReadonlyArray<OcrProcessMode> = ['image'];

    constructor(
        private readonly visionProvider: VisionLLMProvider,
        private readonly promptEngine: PromptEngine,
    ) {
        super();
    }

    async process(input: OcrInput, _mode: OcrProcessMode): Promise<OcrResult> {
        const systemPrompt = await this.promptEngine.render('ocr', {
            Language: input.language,
        });

        const pageCount = input.limitPages > 0 ? input.limitPages : undefined;
        const images = await pdfToImages(input.pdfBuffer, pageCount);

        const pageTexts = await Promise.all(
            images.map(async (imgBase64, idx) => {
                const text = await this.visionProvider.generateWithImage(systemPrompt, [
                    { type: 'image', base64: imgBase64, mimeType: 'image/jpeg' },
                ]);
                return { pageNumber: idx + 1, text };
            }),
        );

        return {
            text: pageTexts.map((p) => p.text).join('\n\n'),
            pages: pageTexts,
        };
    }
}
