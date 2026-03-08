/**
 * Pipeline stage contract — DIP: consumers depend on this abstraction.
 * ISP: each stage only declares what it needs via StageDependencies.
 */
import type { AppConfig, DocumentContext } from '@paperless-llm/shared';
import type { PaperlessClient } from '../paperless/client.js';
import type { PromptEngine } from '../prompts/engine.js';
import type { TextLLMProvider } from '../providers/llm/interface.js';
import type { OcrProvider } from '../providers/ocr/interface.js';

export interface StageDependencies {
    llmProvider: TextLLMProvider;
    ocrProvider: OcrProvider;
    paperlessClient: PaperlessClient;
    promptEngine: PromptEngine;
    config: AppConfig;
}

export interface PipelineStage {
    /** Unique identifier for this stage */
    readonly name: string;
    /** Whether this stage should run given current config */
    isEnabled(config: AppConfig, mode: 'manual' | 'auto'): boolean;
    /** Execute the stage and return an updated context */
    process(ctx: DocumentContext, deps: StageDependencies): Promise<DocumentContext>;
}

/** Base class providing default isEnabled logic */
export abstract class BasePipelineStage implements PipelineStage {
    abstract readonly name: string;
    abstract process(ctx: DocumentContext, deps: StageDependencies): Promise<DocumentContext>;

    // Default: always enabled. Subclasses override as needed.
    isEnabled(_config: AppConfig, _mode: 'manual' | 'auto'): boolean {
        return true;
    }
}
