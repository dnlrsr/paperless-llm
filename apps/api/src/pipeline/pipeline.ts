/**
 * Pipeline runner — SRP: orchestrates stage execution.
 * OCP: stages are injected; add new stages without changing the runner.
 * DIP: depends on PipelineStage interface, not concrete stages.
 */
import type { DocumentContext } from '@paperless-llm/shared';
import { getLogger } from '../config/logger.js';
import type { PipelineStage, StageDependencies } from './stage.interface.js';
import { CorrespondentStage } from './stages/correspondent.stage.js';
import { CreatedDateStage } from './stages/created-date.stage.js';
import { DocumentTypeStage } from './stages/document-type.stage.js';
import { OcrStage } from './stages/ocr.stage.js';
import { SummaryStage } from './stages/summary.stage.js';
import { TagsStage } from './stages/tags.stage.js';
import { TitleStage } from './stages/title.stage.js';

export type PipelineMode = 'manual' | 'auto';

/** All built-in stages in execution order */
const DEFAULT_STAGES: PipelineStage[] = [
    new OcrStage(),         // must run first if OCR is required
    new TitleStage(),
    new TagsStage(),
    new CorrespondentStage(),
    new DocumentTypeStage(),
    new CreatedDateStage(),
    new SummaryStage(),
];

export class Pipeline {
    private readonly stages: Map<string, PipelineStage>;

    constructor(stages: PipelineStage[] = DEFAULT_STAGES) {
        this.stages = new Map(stages.map((s) => [s.name, s]));
    }

    /**
     * Run the pipeline.
     * @param ctx - Initial document context
     * @param deps - Stage dependencies (providers, config, etc.)
     * @param mode - 'manual' (user-triggered) or 'auto' (tag-triggered)
     * @param requestedStages - Optional allowlist of stage names to run
     */
    async run(
        ctx: DocumentContext,
        deps: StageDependencies,
        mode: PipelineMode,
        requestedStages?: string[],
        onProgress?: (pct: number, stage: string) => Promise<void>,
    ): Promise<DocumentContext> {
        const log = getLogger();
        let current = ctx;

        // Determine which stages will actually run so we can space progress evenly
        const activeStages = [...this.stages.entries()].filter(([name, stage]) =>
            requestedStages && requestedStages.length > 0
                ? requestedStages.includes(name)
                : stage.isEnabled(deps.config, mode),
        );

        // Pipeline progress runs from 15 → 85 (70 points)
        const pctPerStage = activeStages.length > 0 ? 70 / activeStages.length : 0;
        let stageIndex = 0;

        for (const [name, stage] of this.stages) {
            const shouldRun = requestedStages && requestedStages.length > 0
                ? requestedStages.includes(name)
                : stage.isEnabled(deps.config, mode);

            if (!shouldRun) continue;

            const pct = Math.round(15 + stageIndex * pctPerStage);
            if (onProgress) await onProgress(pct, name);

            log.debug({ documentId: ctx.documentId, stage: name }, 'Pipeline: running stage');
            try {
                current = await stage.process(current, deps);
                log.debug({ documentId: ctx.documentId, stage: name }, 'Pipeline: stage complete');
            } catch (err) {
                log.error({ documentId: ctx.documentId, stage: name, err }, 'Pipeline: stage failed');
                throw err;
            }
            stageIndex++;
        }

        return current;
    }
}
