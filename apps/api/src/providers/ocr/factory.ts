/**
 * OCR Provider Factory.
 * OCP: new providers can be added by extending the registry.
 * Validates mode/provider compatibility at creation time.
 */
import type { AppConfig } from '@paperless-llm/shared';
import type { PromptEngine } from '../../prompts/engine.js';
import { createVisionLLMProvider } from '../llm/factory.js';
import { AzureDocAIOcrProvider } from './azure-docai.provider.js';
import { DoclingOcrProvider } from './docling.provider.js';
import type { OcrProvider } from './interface.js';
import { LlmVisionOcrProvider } from './llm-vision.provider.js';

export function createOcrProvider(config: AppConfig, promptEngine: PromptEngine): OcrProvider {
    switch (config.OCR_PROVIDER) {
        case 'llm': {
            const visionProvider = createVisionLLMProvider(config);
            return new LlmVisionOcrProvider(visionProvider, promptEngine);
        }
        case 'azure':
            return new AzureDocAIOcrProvider(config);
        case 'docling':
            return new DoclingOcrProvider(config);
        case 'google_docai':
            throw new Error('Google DocAI provider: install @google-cloud/documentai and extend GoogleDocAIOcrProvider');
        default:
            throw new Error(`Unknown OCR provider: ${config.OCR_PROVIDER}`);
    }
}

export function validateOcrModeCompatibility(provider: OcrProvider, mode: string): void {
    if (!provider.supportsMode(mode as AppConfig['OCR_PROCESS_MODE'])) {
        throw new Error(
            `OCR mode "${mode}" is not supported by provider "${provider.providerName}". ` +
            `Supported modes: ${provider.supportedModes.join(', ')}`,
        );
    }
}
