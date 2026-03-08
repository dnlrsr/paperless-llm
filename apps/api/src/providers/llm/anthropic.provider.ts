import { createAnthropic } from '@ai-sdk/anthropic';
import type { AppConfig, ContentPart, LLMOptions } from '@paperless-llm/shared';
import { generateText } from 'ai';
import type { TextLLMProvider, VisionLLMProvider } from './interface.js';

export class AnthropicProvider implements TextLLMProvider, VisionLLMProvider {
    readonly providerName = 'anthropic';
    readonly modelName: string;

    private readonly client: ReturnType<typeof createAnthropic>;

    constructor(config: Pick<AppConfig, 'ANTHROPIC_API_KEY' | 'LLM_MODEL'>) {
        this.modelName = config.LLM_MODEL;
        this.client = createAnthropic({ apiKey: config.ANTHROPIC_API_KEY });
    }

    async generateText(systemPrompt: string, userPrompt: string, options?: LLMOptions): Promise<string> {
        const result = await generateText({
            model: this.client(this.modelName),
            system: systemPrompt,
            prompt: userPrompt,
            maxTokens: options?.maxTokens,
            temperature: options?.temperature,
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

        const result = await generateText({
            model: this.client(this.modelName),
            messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, ...content] }],
            maxTokens: options?.maxTokens,
            temperature: options?.temperature,
        });
        return result.text;
    }
}
