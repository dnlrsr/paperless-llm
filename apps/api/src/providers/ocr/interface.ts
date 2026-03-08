/**
 * OCR Provider interface — ISP: only the shape that consumers need.
 */
import type { OcrProcessMode, OcrResult } from '@paperless-llm/shared';

export interface OcrInput {
    /** Raw PDF bytes */
    pdfBuffer: Uint8Array;
    /** Number of pages to process (0 = all) */
    limitPages: number;
    /** Target language hint */
    language: string;
}

export interface OcrProvider {
    readonly providerName: string;
    readonly supportedModes: ReadonlyArray<OcrProcessMode>;
    process(input: OcrInput, mode: OcrProcessMode): Promise<OcrResult>;
    supportsMode(mode: OcrProcessMode): boolean;
}

export abstract class BaseOcrProvider implements OcrProvider {
    abstract readonly providerName: string;
    abstract readonly supportedModes: ReadonlyArray<OcrProcessMode>;
    abstract process(input: OcrInput, mode: OcrProcessMode): Promise<OcrResult>;

    supportsMode(mode: OcrProcessMode): boolean {
        return (this.supportedModes as OcrProcessMode[]).includes(mode);
    }
}
