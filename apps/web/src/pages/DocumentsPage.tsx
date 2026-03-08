import type { PaperlessDocument } from '@paperless-llm/shared';
import { useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, ChevronRight, FileText, Loader2, RefreshCw, Trash2, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Card, EmptyState, Spinner } from '../components/ui';
import { DOCUMENTS_KEY, useApplySuggestions, useDeleteSuggestions, useDocumentSuggestions, useGenerateDocument, usePendingDocuments } from '../hooks/useDocuments';
import { useActiveJob } from '../hooks/useJobs';
import { cn, formatDate, truncate } from '../lib/utils';

// ─── Stage definitions ────────────────────────────────────────────────────────

interface StageDef {
  id: string;
  labelKey: string;
  /** OCR is off by default and has an extra cost warning */
  special?: boolean;
}

const STAGES: StageDef[] = [
  { id: 'title',        labelKey: 'pipeline.title' },
  { id: 'tags',         labelKey: 'pipeline.tags' },
  { id: 'correspondent', labelKey: 'pipeline.correspondent' },
  { id: 'documentType', labelKey: 'pipeline.documentType' },
  { id: 'createdDate',  labelKey: 'pipeline.createdDate' },
  { id: 'summary',      labelKey: 'pipeline.summary' },
  { id: 'ocr',          labelKey: 'pipeline.stages.ocr', special: true },
];

const DEFAULT_STAGES = STAGES.filter((s) => !s.special).map((s) => s.id);

// ─── Page ─────────────────────────────────────────────────────────────────────

export function DocumentsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const { data, isLoading, refetch } = usePendingDocuments(page, 25);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  const docs = data?.documents ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('nav.documents')}</h1>
        <Button variant="secondary" onClick={() => void refetch()}>
          <RefreshCw size={14} /> {t('common.refresh')}
        </Button>
      </div>

      {docs.length === 0 ? (
        <EmptyState
          icon={<FileText size={40} />}
          title={t('documents.noPending')}
          description={t('documents.noPendingDesc')}
        />
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <DocumentRow
              key={doc.id}
              doc={doc}
              expanded={expandedId === doc.id}
              onToggle={() => setExpandedId(expandedId === doc.id ? null : doc.id)}
            />
          ))}
        </div>
      )}

      {(data?.total ?? 0) > 25 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <Button variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            {t('common.prev')}
          </Button>
          <span className="text-sm text-gray-600">{t('common.page')} {page}</span>
          <Button variant="secondary" disabled={docs.length < 25} onClick={() => setPage((p) => p + 1)}>
            {t('common.next')}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Document row ─────────────────────────────────────────────────────────────

function DocumentRow({ doc, expanded, onToggle }: {
  doc: PaperlessDocument;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [selectedStages, setSelectedStages] = useState<string[]>(DEFAULT_STAGES);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  const generate = useGenerateDocument();
  const apply = useApplySuggestions();
  const deleteSuggestions = useDeleteSuggestions();

  const { data: suggestions, isLoading: suggestionsLoading } = useDocumentSuggestions(
    expanded ? doc.id : null,
  );

  // Track live progress of the running job
  const { data: activeJob } = useActiveJob(activeJobId);

  // Capture jobId when generate succeeds
  useEffect(() => {
    if (generate.data?.jobId) {
      setActiveJobId(generate.data.jobId);
    }
  }, [generate.data]);

  // When job finishes, refresh suggestions and clear tracking
  useEffect(() => {
    if (!activeJob) return;
    if (activeJob.status === 'completed') {
      void qc.invalidateQueries({ queryKey: [DOCUMENTS_KEY, doc.id, 'suggestions'] });
      void qc.invalidateQueries({ queryKey: [DOCUMENTS_KEY, 'pending'] });
      setActiveJobId(null);
    } else if (activeJob.status === 'failed') {
      setActiveJobId(null);
    }
  }, [activeJob?.status, activeJob, doc.id, qc]);

  function toggleStage(id: string) {
    setSelectedStages((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  const ocrSelected = selectedStages.includes('ocr');
  const generating = generate.isPending && generate.variables?.id === doc.id;
  const applying = apply.isPending && apply.variables === doc.id;
  const jobRunning = !!activeJobId && activeJob?.status !== 'completed' && activeJob?.status !== 'failed';

  return (
    <Card className="p-0 overflow-hidden">
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        {expanded ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
        <FileText size={16} className="text-primary-500 shrink-0" />
        <span className="flex-1 font-medium text-sm truncate">{doc.title}</span>
        <span className="text-xs text-gray-400 shrink-0">{formatDate(doc.created)}</span>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-3">

          {/* Stage picker */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {t('documents.stages')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {STAGES.map((stage) => {
                const active = selectedStages.includes(stage.id);
                return (
                  <button
                    key={stage.id}
                    onClick={() => toggleStage(stage.id)}
                    className={cn(
                      'rounded-full border px-3 py-0.5 text-xs font-medium transition-colors select-none',
                      stage.special
                        ? active
                          ? 'border-amber-400 bg-amber-50 text-amber-700'
                          : 'border-gray-200 text-gray-400 hover:border-amber-300 hover:text-amber-600'
                        : active
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600',
                    )}
                  >
                    {stage.special && <span className="mr-1">⚡</span>}
                    {t(stage.labelKey)}
                  </button>
                );
              })}
            </div>
            {ocrSelected && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <Zap size={11} />
                {t('documents.ocrWarning')}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="primary"
              loading={generating}
              disabled={selectedStages.length === 0 || jobRunning}
              onClick={() => generate.mutate({ id: doc.id, stages: selectedStages })}
            >
              <RefreshCw size={14} /> {t('documents.generate')}
            </Button>
            {suggestions && !jobRunning && (
              <>
                <Button variant="secondary" loading={applying} onClick={() => apply.mutate(doc.id)}>
                  <Check size={14} /> {t('documents.applyAll')}
                </Button>
                <Button variant="ghost" onClick={() => deleteSuggestions.mutate(doc.id)}>
                  <Trash2 size={14} /> {t('common.discard')}
                </Button>
              </>
            )}
          </div>

          {/* Job progress — shown while a job is running */}
          {jobRunning && activeJob && (
            <StageProgress
              stages={activeJob.data?.stages ?? selectedStages}
              currentStage={activeJob.currentStage ?? null}
              progress={activeJob.progress}
              status={activeJob.status}
            />
          )}

          {/* Suggestions loading skeleton — only when no active job */}
          {!jobRunning && suggestionsLoading && <Spinner size="sm" />}

          {/* Suggestions */}
          {!jobRunning && suggestions && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {suggestions.title && <SuggestionField label={t('pipeline.title')} value={suggestions.title} />}
              {suggestions.createdDate && <SuggestionField label={t('pipeline.createdDate')} value={suggestions.createdDate} />}
              {suggestions.correspondent && <SuggestionField label={t('pipeline.correspondent')} value={suggestions.correspondent} />}
              {suggestions.documentType && <SuggestionField label={t('pipeline.documentType')} value={suggestions.documentType} />}
              {suggestions.tags && suggestions.tags.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="label">{t('pipeline.tags')}</dt>
                  <dd className="flex flex-wrap gap-1 mt-1">
                    {suggestions.tags.map((tag) => (
                      <Badge key={tag} color="blue">{tag}</Badge>
                    ))}
                  </dd>
                </div>
              )}
              {suggestions.summary && (
                <div className="sm:col-span-2">
                  <dt className="label">{t('pipeline.summary')}</dt>
                  <dd className="text-gray-700 text-xs">{truncate(suggestions.summary, 300)}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── Stage label map ──────────────────────────────────────────────────────────

const STAGE_LABEL_KEY: Record<string, string> = {
  title:        'pipeline.title',
  tags:         'pipeline.tags',
  correspondent:'pipeline.correspondent',
  documentType: 'pipeline.documentType',
  createdDate:  'pipeline.createdDate',
  summary:      'pipeline.summary',
  ocr:          'pipeline.stages.ocr',
};

// ─── Stage progress component ────────────────────────────────────────────────

function StageProgress({
  stages,
  currentStage,
  progress,
  status,
}: {
  stages: string[];
  currentStage: string | null;
  progress: number;
  status: string;
}) {
  const { t } = useTranslation();

  // Determine which stages are done vs active vs pending
  const currentIdx = currentStage ? stages.indexOf(currentStage) : -1;

  const statusLabel =
    status === 'waiting'   ? t('documents.jobWaiting') :
    status === 'completed' ? t('documents.jobCompleted') :
    status === 'failed'    ? t('documents.jobFailed') :
    currentStage           ? `${t(`${STAGE_LABEL_KEY[currentStage] ?? currentStage}`)}…` :
                             t('documents.jobProcessing');

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 space-y-2">
      {/* Status line */}
      <div className="flex items-center gap-2">
        <Loader2 size={13} className="text-primary-500 animate-spin shrink-0" />
        <span className="text-xs font-medium text-gray-600">{statusLabel}</span>
        <span className="ml-auto text-xs text-gray-400 tabular-nums">{progress}%</span>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full rounded-full bg-gray-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Per-stage chips */}
      {stages.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-0.5">
          {stages.map((id, idx) => {
            const done    = currentIdx > idx || (currentStage === null && progress >= 85);
            const active  = id === currentStage;
            const labelKey = STAGE_LABEL_KEY[id] ?? id;
            return (
              <span
                key={id}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                  done   ? 'border-green-200 bg-green-50 text-green-700' :
                  active ? 'border-primary-300 bg-primary-50 text-primary-700' :
                           'border-gray-200 bg-white text-gray-400',
                )}
              >
                {done ? (
                  <Check size={9} strokeWidth={2.5} />
                ) : active ? (
                  <Loader2 size={9} className="animate-spin" />
                ) : null}
                {t(labelKey)}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Suggestion field ─────────────────────────────────────────────────────────

function SuggestionField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="label">{label}</dt>
      <dd className="text-gray-800">{value}</dd>
    </div>
  );
}
