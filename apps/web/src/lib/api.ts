/**
 * Typed HTTP client for the paperless-llm API.
 * ISP: each namespace exposes only the methods relevant to that resource.
 */

import type {
    DocumentSuggestions,
    PaperlessDocument,
} from '@paperless-llm/shared';

// ─── Base ────────────────────────────────────────────────────────────────────

const BASE = '/api';

async function request<T>(
    path: string,
    init?: RequestInit,
): Promise<T> {
    const hasBody = init?.body !== undefined && init.body !== null;
    const res = await fetch(`${BASE}${path}`, {
        headers: { ...(hasBody ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
        ...init,
    });

    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new ApiError(res.status, body || res.statusText);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
}

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

// ─── Health ──────────────────────────────────────────────────────────────────

export interface HealthStatus {
    status: 'ok' | 'degraded';
    version: string;
    checks: Record<string, boolean | null>;
    ollamaModel?: string;
}

export const healthApi = {
    get: () => request<HealthStatus>('/health'),
};

// ─── Documents ───────────────────────────────────────────────────────────────

export interface PendingDocumentsResponse {
    documents: PaperlessDocument[];
    total: number;
}

export interface GenerateResponse {
    jobId: string;
}

export const documentsApi = {
    listPending: (page = 1, pageSize = 25) =>
        request<PendingDocumentsResponse>(`/documents/pending?page=${page}&pageSize=${pageSize}`),

    getSuggestions: (id: number) =>
        request<DocumentSuggestions>(`/documents/${id}/suggestions`),

    generate: (id: number, stages?: string[]) =>
        request<GenerateResponse>(`/documents/${id}/generate`, {
            method: 'POST',
            body: JSON.stringify({ stages }),
        }),

    applyAll: (id: number) =>
        request<{ success: boolean }>(`/documents/${id}/apply`, { method: 'POST' }),

    deleteSuggestions: (id: number) =>
        request<void>(`/documents/${id}/suggestions`, { method: 'DELETE' }),
};

// ─── Jobs ────────────────────────────────────────────────────────────────────

export interface JobRecord {
    id: string;
    documentId: number;
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
    progress: number;
    currentStage?: string | null;
    data?: { stages?: string[]; documentId?: number };
    error?: string;
    createdAt: string;
    updatedAt: string;
}

export interface JobsListResponse {
    jobs: JobRecord[];
    total: number;
}

export const jobsApi = {
    list: (page = 1, pageSize = 25) =>
        request<JobsListResponse>(`/jobs?page=${page}&pageSize=${pageSize}`),

    get: (id: string) => request<JobRecord>(`/jobs/${id}`),

    cancel: (id: string) => request<void>(`/jobs/${id}`, { method: 'DELETE' }),
};

// ─── Prompts ─────────────────────────────────────────────────────────────────

export interface PromptTemplate {
    name: string;
    content: string;
    isCustom: boolean;
    lastModified?: string;
}

export const promptsApi = {
    list: () => request<{ prompts: PromptTemplate[] }>('/prompts').then((r) => r.prompts),

    get: (name: string) => request<PromptTemplate>(`/prompts/${name}`),

    update: (name: string, content: string) =>
        request<PromptTemplate>(`/prompts/${name}`, {
            method: 'PUT',
            body: JSON.stringify({ content }),
        }),

    reset: (name: string) =>
        request<PromptTemplate>(`/prompts/${name}`, { method: 'DELETE' }),
};

// ─── Analysis ────────────────────────────────────────────────────────────────

export interface AnalysisRequest {
    documentIds: number[];
    prompt: string;
}

export interface AnalysisResponse {
    result: string;
    usage?: { promptTokens: number; completionTokens: number };
}

export const analysisApi = {
    run: (body: AnalysisRequest) =>
        request<AnalysisResponse>('/analysis', {
            method: 'POST',
            body: JSON.stringify(body),
        }),
};
