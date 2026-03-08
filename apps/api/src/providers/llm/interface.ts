/**
 * LLM Provider interfaces — ISP: split into text-only and vision capabilities.
 * DIP: pipeline stages depend on these interfaces, not concrete providers.
 */
import type { ContentPart, LLMOptions } from '@paperless-llm/shared';

// ─────────────────────────────────────────────────────────────────
// Interface Segregation: two focused interfaces
// ─────────────────────────────────────────────────────────────────

/** Handles plain-text prompts */
export interface TextLLMProvider {
    readonly providerName: string;
    readonly modelName: string;
    generateText(systemPrompt: string, userPrompt: string, options?: LLMOptions): Promise<string>;
}

/** Handles image + text (vision) prompts */
export interface VisionLLMProvider {
    readonly providerName: string;
    readonly modelName: string;
    generateWithImage(prompt: string, parts: ContentPart[], options?: LLMOptions): Promise<string>;
}

/** A provider that supports both capabilities */
export interface FullLLMProvider extends TextLLMProvider, VisionLLMProvider { }

export function isVisionProvider(p: TextLLMProvider): p is VisionLLMProvider & TextLLMProvider {
    return 'generateWithImage' in p;
}
