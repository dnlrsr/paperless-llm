import type { AppConfig, ContentPart, LLMOptions } from '@paperless-llm/shared';
import { generateText } from 'ai';
import { createOllama } from 'ollama-ai-provider';
import type { TextLLMProvider, VisionLLMProvider } from './interface.js';

// Maximum safe value for setTimeout delay (2^31 - 1 milliseconds ≈ 24.8 days).
// Values larger than this cause setTimeout to fire immediately due to overflow.
const MAX_SAFE_TIMEOUT_MS = 2_147_483_647;

export class OllamaProvider implements TextLLMProvider, VisionLLMProvider {
    readonly providerName = 'ollama';
    readonly modelName: string;

    private readonly client: ReturnType<typeof createOllama>;
    private readonly defaultTemperature: number | undefined;
    private readonly requestTimeoutMs: number;

    constructor(config: Pick<AppConfig, 'OLLAMA_HOST' | 'LLM_MODEL' | 'OLLAMA_TEMPERATURE' | 'OLLAMA_REQUEST_TIMEOUT_SECONDS'>) {
        this.modelName = config.LLM_MODEL;
        this.defaultTemperature = config.OLLAMA_TEMPERATURE;
        const timeoutSeconds = config.OLLAMA_REQUEST_TIMEOUT_SECONDS ?? 600;
        // Clamp to MAX_SAFE_TIMEOUT_MS to prevent setTimeout integer overflow.
        this.requestTimeoutMs = timeoutSeconds === 0 ? 0 : Math.min(timeoutSeconds * 1000, MAX_SAFE_TIMEOUT_MS);
        const rawHost = config.OLLAMA_HOST ?? 'http://localhost:11434';
        const baseURL = rawHost.endsWith('/api') ? rawHost : `${rawHost.replace(/\/$/, '')}/api`;
        this.client = createOllama({
            baseURL,
            // Apply a configurable per-request timeout via AbortController.
            // When a large model is being cold-loaded, requests can hang for
            // several minutes. Set OLLAMA_REQUEST_TIMEOUT_SECONDS to control
            // how long to wait; 0 disables the timeout (wait indefinitely).
            ...(this.requestTimeoutMs > 0 && {
                fetch: (input: RequestInfo | URL, init?: RequestInit) => {
                    const controller = new AbortController();
                    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
                    // Combine our timeout signal with any upstream signal so that
                    // both caller-initiated cancellation and our timeout are honored.
                    const signal = init?.signal
                        ? AbortSignal.any([controller.signal, init.signal as AbortSignal])
                        : controller.signal;
                    return fetch(input, { ...init, signal }).finally(() => clearTimeout(timer));
                },
            }),
        });
    }

    async generateText(systemPrompt: string, userPrompt: string, options?: LLMOptions): Promise<string> {
        const temperature = options?.temperature ?? this.defaultTemperature;
        const result = await generateText({
            model: this.client(this.modelName),
            system: systemPrompt,
            prompt: userPrompt,
            maxTokens: options?.maxTokens,
            ...(temperature !== undefined && { temperature }),
        });
        return result.text;
    }

    async generateWithImage(prompt: string, parts: ContentPart[], options?: LLMOptions): Promise<string> {
        const content = parts.map((p) =>
            p.type === 'text'
                ? { type: 'text' as const, text: p.text }
                : {
                    type: 'image' as const,
                    image: `data:${p.mimeType};base64,${p.base64}`,
                },
        );

        const temperature = options?.temperature ?? this.defaultTemperature;
        const result = await generateText({
            model: this.client(this.modelName),
            messages: [
                { role: 'user', content: [{ type: 'text', text: prompt }, ...content] },
            ],
            maxTokens: options?.maxTokens,
            ...(temperature !== undefined && { temperature }),
        });
        return result.text;
    }
}
