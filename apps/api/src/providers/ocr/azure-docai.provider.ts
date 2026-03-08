/**
 * Azure Document Intelligence OCR provider.
 * SRP: handles only Azure-specific API communication.
 */
import type { AppConfig, OcrProcessMode, OcrResult } from '@paperless-llm/shared';
import axios from 'axios';
import { BaseOcrProvider, type OcrInput } from './interface.js';

export class AzureDocAIOcrProvider extends BaseOcrProvider {
    readonly providerName = 'azure';
    readonly supportedModes: ReadonlyArray<OcrProcessMode> = ['image'];

    private readonly endpoint: string;
    private readonly key: string;
    private readonly modelId: string;
    private readonly timeoutMs: number;
    private readonly outputFormat: string;

    constructor(config: Pick<AppConfig, 'AZURE_DOCAI_ENDPOINT' | 'AZURE_DOCAI_KEY' | 'AZURE_DOCAI_MODEL_ID' | 'AZURE_DOCAI_TIMEOUT_SECONDS' | 'AZURE_DOCAI_OUTPUT_CONTENT_FORMAT'>) {
        super();
        if (!config.AZURE_DOCAI_ENDPOINT || !config.AZURE_DOCAI_KEY) {
            throw new Error('Azure DocAI requires AZURE_DOCAI_ENDPOINT and AZURE_DOCAI_KEY');
        }
        this.endpoint = config.AZURE_DOCAI_ENDPOINT;
        this.key = config.AZURE_DOCAI_KEY;
        this.modelId = config.AZURE_DOCAI_MODEL_ID;
        this.timeoutMs = config.AZURE_DOCAI_TIMEOUT_SECONDS * 1000;
        this.outputFormat = config.AZURE_DOCAI_OUTPUT_CONTENT_FORMAT;
    }

    async process(input: OcrInput, _mode: OcrProcessMode): Promise<OcrResult> {
        const url = `${this.endpoint}/documentintelligence/documentModels/${this.modelId}:analyze?api-version=2024-07-31-preview&outputContentFormat=${this.outputFormat}`;

        // Submit document for analysis
        const submitRes = await axios.post(url, input.pdfBuffer, {
            headers: {
                'Ocp-Apim-Subscription-Key': this.key,
                'Content-Type': 'application/pdf',
            },
            timeout: this.timeoutMs,
        });

        const operationUrl = submitRes.headers['operation-location'] as string;
        if (!operationUrl) throw new Error('Azure DocAI: missing operation-location header');

        // Poll for result
        const startTime = Date.now();
        while (Date.now() - startTime < this.timeoutMs) {
            await sleep(2000);
            const pollRes = await axios.get<AzureAnalyzeResult>(operationUrl, {
                headers: { 'Ocp-Apim-Subscription-Key': this.key },
            });
            if (pollRes.data.status === 'succeeded') {
                const content = pollRes.data.analyzeResult?.content ?? '';
                return {
                    text: content,
                    pages: [{ pageNumber: 1, text: content }],
                };
            }
            if (pollRes.data.status === 'failed') {
                throw new Error(`Azure DocAI analysis failed: ${JSON.stringify(pollRes.data)}`);
            }
        }
        throw new Error('Azure DocAI: polling timeout exceeded');
    }
}

interface AzureAnalyzeResult {
    status: 'running' | 'succeeded' | 'failed';
    analyzeResult?: { content: string };
}

function sleep(ms: number) {
    return new Promise<void>((r) => setTimeout(r, ms));
}
