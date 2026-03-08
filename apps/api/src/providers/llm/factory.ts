/**
 * LLM Provider Factory + Registry.
 * OCP: new providers register themselves; factory never needs to change.
 * SRP: factory's only job is to create the right provider.
 */
import type { AppConfig } from '@paperless-llm/shared';
import { AnthropicProvider } from './anthropic.provider.js';
import type { TextLLMProvider, VisionLLMProvider } from './interface.js';
import { MistralProvider } from './mistral.provider.js';
import { OllamaProvider } from './ollama.provider.js';
import { OpenAIProvider } from './openai.provider.js';

type LLMProviderConstructor = new (config: AppConfig) => TextLLMProvider;

const TEXT_REGISTRY = new Map<string, LLMProviderConstructor>([
    ['openai', OpenAIProvider as unknown as LLMProviderConstructor],
    ['ollama', OllamaProvider as unknown as LLMProviderConstructor],
    ['anthropic', AnthropicProvider as unknown as LLMProviderConstructor],
    ['mistral', MistralProvider as unknown as LLMProviderConstructor],
]);

export function createLLMProvider(config: AppConfig): TextLLMProvider {
    const Ctor = TEXT_REGISTRY.get(config.LLM_PROVIDER);
    if (!Ctor) {
        throw new Error(`Unknown LLM provider: ${config.LLM_PROVIDER}`);
    }
    return new Ctor(config);
}

export function createVisionLLMProvider(config: AppConfig): VisionLLMProvider {
    const providerName = config.VISION_LLM_PROVIDER ?? config.LLM_PROVIDER;
    const visionConfig = { ...config, LLM_MODEL: config.VISION_LLM_MODEL ?? config.LLM_MODEL };
    const Ctor = TEXT_REGISTRY.get(providerName);
    if (!Ctor) {
        throw new Error(`Unknown vision LLM provider: ${providerName}`);
    }
    const provider = new Ctor(visionConfig);
    if (!('generateWithImage' in provider)) {
        throw new Error(`Provider ${providerName} does not support vision`);
    }
    return provider as unknown as VisionLLMProvider;
}
