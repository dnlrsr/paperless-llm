/**
 * Docling self-hosted OCR provider.
 */
import type { AppConfig, OcrProcessMode, OcrResult } from '@paperless-llm/shared';
import axios from 'axios';
import { BaseOcrProvider, type OcrInput } from './interface.js';

export class DoclingOcrProvider extends BaseOcrProvider {
    readonly providerName = 'docling';
    readonly supportedModes: ReadonlyArray<OcrProcessMode> = ['image', 'pdf', 'whole_pdf'];

    constructor(
        private readonly config: Pick<AppConfig, 'DOCLING_URL' | 'DOCLING_IMAGE_EXPORT_MODE' | 'DOCLING_OCR_PIPELINE' | 'DOCLING_OCR_ENGINE'>,
    ) {
        super();
        if (!config.DOCLING_URL) throw new Error('Docling provider requires DOCLING_URL');
    }

    async process(input: OcrInput, _mode: OcrProcessMode): Promise<OcrResult> {
        const formData = new FormData();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blob = new Blob([input.pdfBuffer as unknown as BlobPart], { type: 'application/pdf' });
        formData.append('file', blob, 'document.pdf');
        formData.append('image_export_mode', this.config.DOCLING_IMAGE_EXPORT_MODE);
        formData.append('ocr_pipeline', this.config.DOCLING_OCR_PIPELINE);
        if (this.config.DOCLING_OCR_PIPELINE === 'standard') {
            formData.append('ocr_engine', this.config.DOCLING_OCR_ENGINE);
        }

        const res = await axios.post<{ text: string }>(`${this.config.DOCLING_URL}/convert`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 300_000,
        });

        return {
            text: res.data.text,
            pages: [{ pageNumber: 1, text: res.data.text }],
        };
    }
}
