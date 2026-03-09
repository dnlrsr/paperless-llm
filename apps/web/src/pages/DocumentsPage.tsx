import type { DocumentSuggestions, PaperlessDocument } from '@paperless-llm/shared';
import { useQueryClient } from '@tanstack/react-query';
import { AlignLeft, Calendar, Check, ChevronDown, ChevronRight, FileText, FolderOpen, Loader2, Pencil, Plus, RefreshCw, Tag, Trash2, Type, User, X, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card, EmptyState, Spinner } from '../components/ui';
import { DOCUMENTS_KEY, useApplySuggestions, useDeleteSuggestions, useDocumentSuggestions, useGenerateDocument, usePaperlessCorrespondents, usePaperlessDocumentTypes, usePaperlessTags, usePatchSuggestions, usePendingDocuments } from '../hooks/useDocuments';
import { useActiveJob } from '../hooks/useJobs';
import { cn, formatDate } from '../lib/utils';
import { useUISettings } from '../store';

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

  // Inherit the global default, but allow per-row override
  const { useExistingOnly: globalUseExistingOnly } = useUISettings();
  const [useExistingOnly, setUseExistingOnly] = useState<boolean>(globalUseExistingOnly);

  // Keep in sync when global setting changes (only if user hasn't explicitly toggled for this row)
  useEffect(() => {
    setUseExistingOnly(globalUseExistingOnly);
  }, [globalUseExistingOnly]);

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
                const ocrActive = selectedStages.includes('ocr');
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
                void ocrActive;
              })}
            </div>
            {selectedStages.includes('ocr') && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <Zap size={11} />
                {t('documents.ocrWarning')}
              </p>
            )}
          </div>

          {/* Use existing items only — per-row toggle */}
          <div className="flex items-center gap-3">
            <button
              role="switch"
              aria-checked={useExistingOnly}
              aria-labelledby="use-existing-only-label"
              onClick={() => setUseExistingOnly((v) => !v)}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                useExistingOnly ? 'bg-primary-500' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ${
                  useExistingOnly ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <span id="use-existing-only-label" className="text-xs text-gray-600">{t('documents.useExistingOnly')}</span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="primary"
              loading={generating || suggestionsLoading}
              disabled={selectedStages.length === 0 || jobRunning || suggestionsLoading}
              onClick={() => generate.mutate({ id: doc.id, stages: selectedStages, useExistingOnly })}
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

          {/* Suggestions */}
          {!jobRunning && suggestions && (
            <SuggestionsPanel docId={doc.id} suggestions={suggestions} />
          )}

          {/* Original document text */}
          {doc.content && <OriginalText content={doc.content} />}
        </div>
      )}
    </Card>
  );
}

// ─── Original text component ─────────────────────────────────────────────────

function OriginalText({ content }: { content: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-gray-100 pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors select-none"
      >
        {open
          ? <ChevronDown size={13} />
          : <ChevronRight size={13} />}
        {t('documents.originalText')}
      </button>
      {open && (
        <pre className="mt-2 max-h-64 overflow-y-auto rounded border border-gray-100 bg-gray-50 p-3 text-[11px] leading-relaxed text-gray-600 whitespace-pre-wrap font-mono">
          {content}
        </pre>
      )}
    </div>
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

// ─── Suggestions panel ───────────────────────────────────────────────────────

function SuggestionsPanel({ docId, suggestions }: { docId: number; suggestions: DocumentSuggestions }) {
  const { t } = useTranslation();
  const [edited, setEdited] = useState<DocumentSuggestions>({ ...suggestions });
  const [newTag, setNewTag] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const addTagInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const patch = usePatchSuggestions();
  const { data: allPaperlessTags = [] } = usePaperlessTags();
  const { data: allCorrespondents = [] } = usePaperlessCorrespondents();
  const { data: allDocumentTypes = [] } = usePaperlessDocumentTypes();

  // Re-sync when suggestions are refreshed (e.g. after re-generate)
  useEffect(() => {
    setEdited({ ...suggestions });
  }, [suggestions]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    function handleOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        addTagInputRef.current &&
        !addTagInputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showDropdown]);

  function saveField(update: Partial<DocumentSuggestions>) {
    setEdited((prev) => ({ ...prev, ...update }));
    patch.mutate({ id: docId, data: update });
  }

  function removeTag(tag: string) {
    const tags = (edited.tags ?? []).filter((t) => t !== tag);
    saveField({ tags });
  }

  function addTag(tagName?: string) {
    const tag = (tagName ?? newTag).trim();
    if (!tag || (edited.tags ?? []).includes(tag)) return;
    saveField({ tags: [...(edited.tags ?? []), tag] });
    setNewTag('');
    setShowDropdown(false);
    addTagInputRef.current?.focus();
  }

  // Filtered paperless tags: match search term and not already selected
  const filteredTags = allPaperlessTags.filter(
    (t) =>
      !(edited.tags ?? []).includes(t.name) &&
      (newTag.trim() === '' || t.name.toLowerCase().includes(newTag.toLowerCase())),
  );

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/60 divide-y divide-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          {t('documents.suggestions')}
        </span>
        {patch.isPending && (
          <Loader2 size={11} className="animate-spin text-gray-300" />
        )}
      </div>

      {/* Grid fields — always shown so null fields can be filled manually */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-100">
        <div className="bg-gray-50/60 sm:col-span-2">
          <EditableField
            label={t('documents.fields.title')}
            value={edited.title ?? null}
            icon={<Type size={11} />}
            onSave={(v) => saveField({ title: v })}
          />
        </div>
        <div className="bg-gray-50/60">
          <SelectableField
            label={t('documents.fields.correspondent')}
            value={edited.correspondent ?? null}
            icon={<User size={11} />}
            options={allCorrespondents.map((c) => c.name)}
            onSave={(v) => saveField({ correspondent: v })}
          />
        </div>
        <div className="bg-gray-50/60">
          <SelectableField
            label={t('documents.fields.documentType')}
            value={edited.documentType ?? null}
            icon={<FolderOpen size={11} />}
            options={allDocumentTypes.map((dt) => dt.name)}
            onSave={(v) => saveField({ documentType: v })}
          />
        </div>
        <div className="bg-gray-50/60">
          <EditableField
            label={t('documents.fields.createdDate')}
            value={edited.createdDate ?? null}
            icon={<Calendar size={11} />}
            onSave={(v) => saveField({ createdDate: v })}
          />
        </div>
      </div>

      {/* Tags */}
      <div className="px-3 py-2.5 bg-white">
        <p className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 mb-2">
          <Tag size={11} />
          {t('documents.fields.tags')}
        </p>
        <div className="flex flex-wrap gap-1.5 items-center">
          {(edited.tags ?? []).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium pl-2.5 pr-1 py-0.5"
            >
              {tag}
              <button
                onClick={() => removeTag(tag)}
                className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-blue-400 hover:bg-blue-200 hover:text-blue-700 transition-colors"
                aria-label={`Remove tag ${tag}`}
              >
                <X size={8} strokeWidth={3} />
              </button>
            </span>
          ))}
          {/* Add-tag input with dropdown picker */}
          <div className="relative">
            <div className="flex items-center gap-1">
              <input
                ref={addTagInputRef}
                type="text"
                value={newTag}
                onChange={(e) => { setNewTag(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); addTag(); }
                  if (e.key === 'Escape') { setShowDropdown(false); setNewTag(''); }
                  if (e.key === 'ArrowDown' && showDropdown) {
                    e.preventDefault();
                    dropdownRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
                  }
                }}
                placeholder={t('documents.addTag')}
                className="h-6 w-24 rounded-full border border-dashed border-gray-300 bg-transparent px-2.5 text-xs text-gray-500 placeholder-gray-300 transition-all focus:w-36 focus:border-blue-400 focus:outline-none focus:text-gray-700"
              />
              {newTag.trim() && (
                <button
                  onClick={() => addTag()}
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors"
                >
                  <Plus size={10} strokeWidth={2.5} />
                </button>
              )}
            </div>
            {/* Dropdown list of existing paperless tags */}
            {showDropdown && filteredTags.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute left-0 top-7 z-30 w-48 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg py-1"
              >
                {filteredTags.map((tag) => (
                  <button
                    key={tag.id}
                    onMouseDown={(e) => { e.preventDefault(); addTag(tag.name); }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addTag(tag.name); }
                      if (e.key === 'Escape') { setShowDropdown(false); addTagInputRef.current?.focus(); }
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color ?? '#6366f1' }}
                    />
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      {edited.summary && (
        <div className="px-3 py-2.5 bg-white">
          <p className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 mb-1.5">
            <AlignLeft size={11} />
            {t('documents.fields.summary')}
          </p>
          <p className="text-xs text-gray-700 leading-relaxed">{edited.summary}</p>
        </div>
      )}
    </div>
  );
}

// ─── Selectable field (with dropdown of existing options) ────────────────────

function SelectableField({
  label,
  value,
  icon,
  options,
  onSave,
}: {
  label: string;
  value: string | null;
  icon?: React.ReactNode;
  options: string[];
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [showList, setShowList] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setDraft(value ?? ''); }, [value]);

  useEffect(() => {
    if (!showList) return;
    function handleOutside(e: MouseEvent) {
      if (
        listRef.current && !listRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) setShowList(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showList]);

  function commit(selected?: string) {
    setEditing(false);
    setShowList(false);
    const trimmed = (selected ?? draft).trim();
    setDraft(trimmed);
    if (trimmed !== (value ?? '')) onSave(trimmed);
  }

  const filtered = options.filter(
    (o) => draft.trim() === '' || o.toLowerCase().includes(draft.toLowerCase()),
  );

  return (
    <div className="px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 mb-1">
        {icon}
        {label}
      </p>
      {editing ? (
        <div className="relative">
          <input
            ref={inputRef}
            autoFocus
            value={draft}
            onChange={(e) => { setDraft(e.target.value); setShowList(true); }}
            onFocus={() => setShowList(true)}
            onBlur={() => setTimeout(() => { commit(); }, 150)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commit(); }
              if (e.key === 'Escape') { setEditing(false); setShowList(false); setDraft(value ?? ''); }
              if (e.key === 'ArrowDown' && showList) {
                e.preventDefault();
                listRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
              }
            }}
            className="w-full rounded border border-primary-300 bg-white px-2 py-1 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary-400"
          />
          {showList && filtered.length > 0 && (
            <div
              ref={listRef}
              className="absolute left-0 top-full mt-0.5 z-30 w-full max-h-44 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg py-1"
            >
              {filtered.map((opt) => (
                <button
                  key={opt}
                  onMouseDown={(e) => { e.preventDefault(); commit(opt); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); commit(opt); }
                    if (e.key === 'Escape') { setShowList(false); inputRef.current?.focus(); }
                  }}
                  className={cn(
                    'flex w-full items-center px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors',
                    opt === value && 'font-medium text-primary-700',
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => { setEditing(true); setShowList(true); }}
          className="group flex w-full items-center justify-between rounded border border-transparent bg-white px-2 py-1 text-left text-sm text-gray-800 hover:border-gray-200 transition-colors"
        >
          <span className="truncate">{value || '—'}</span>
          <ChevronDown size={11} className="ml-2 shrink-0 text-gray-200 group-hover:text-gray-400 transition-colors" />
        </button>
      )}
    </div>
  );
}

// ─── Editable field ───────────────────────────────────────────────────────────

function EditableField({
  label,
  value,
  icon,
  onSave,
}: {
  label: string;
  value: string | null;
  icon?: React.ReactNode;
  onSave: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => {
    setDraft(value ?? '');
  }, [value]);

  function commit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== (value ?? '')) onSave(trimmed);
  }

  return (
    <div className="px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-medium text-gray-400 mb-1">
        {icon}
        {label}
      </p>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') { setEditing(false); setDraft(value ?? ''); }
          }}
          className="w-full rounded border border-primary-300 bg-white px-2 py-1 text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary-400"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="group flex w-full items-center justify-between rounded border border-transparent bg-white px-2 py-1 text-left text-sm text-gray-800 hover:border-gray-200 transition-colors"
        >
          <span className="truncate">{value || '—'}</span>
          <Pencil size={11} className="ml-2 shrink-0 text-gray-200 group-hover:text-gray-400 transition-colors" />
        </button>
      )}
    </div>
  );
}
