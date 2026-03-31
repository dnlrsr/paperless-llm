// Pipeline domain types implementing SOLID principles
// - ISP: Separate interfaces for different responsibilities
// - DIP: Stages depend on abstractions, not concretions

import type { PaperlessCustomFieldValue, PaperlessDocument } from './paperless.types.js';

// ─────────────────────────────────────────────────────────────────
// Suggestions: what the AI proposes
// ─────────────────────────────────────────────────────────────────

export interface DocumentSuggestions {
    title?: string;
    tags?: string[];
    correspondent?: string | null;
    documentType?: string | null;
    createdDate?: string | null; // ISO date string
    customFields?: PaperlessCustomFieldValue[];
    summary?: string;
    /** Tags suggested by the LLM that do not yet exist in paperless-ngx. User must accept them explicitly. */
    newTags?: string[];
    /** Correspondent suggested by the LLM that does not yet exist in paperless-ngx. */
    newCorrespondent?: string | null;
    /** Document type suggested by the LLM that does not yet exist in paperless-ngx. */
    newDocumentType?: string | null;
}

// ─────────────────────────────────────────────────────────────────
// Processing context flowing through the pipeline
// ─────────────────────────────────────────────────────────────────

export interface DocumentContext {
    readonly documentId: number;
    readonly content: string;
    readonly originalMetadata: PaperlessDocument;
    readonly pdfBuffer?: Uint8Array;
    readonly ocrText?: string;
    readonly hocrXml?: string;
    readonly suggestions: Partial<DocumentSuggestions>;
}

export type DocumentContextUpdate = Partial<Omit<DocumentContext, 'documentId' | 'originalMetadata'>>;

// Immutable context update helper (SRP: pure data transformation)
export function updateContext(
    ctx: DocumentContext,
    update: DocumentContextUpdate,
): DocumentContext {
    return { ...ctx, ...update };
}

// ─────────────────────────────────────────────────────────────────
// OCR types
// ─────────────────────────────────────────────────────────────────

export type OcrProcessMode = 'image' | 'pdf' | 'whole_pdf';

export interface OcrPage {
    pageNumber: number;
    text: string;
    /** hOCR fragment for this page */
    hocrFragment?: string;
}

export interface OcrResult {
    text: string;
    pages: OcrPage[];
    /** Full hOCR document (all pages combined) */
    hocrXml?: string;
}

// ─────────────────────────────────────────────────────────────────
// LLM types
// ─────────────────────────────────────────────────────────────────

export type LLMProviderName = 'openai' | 'ollama' | 'anthropic' | 'mistral' | 'googleai';
export type OcrProviderName = 'llm' | 'azure' | 'google_docai' | 'docling';

export interface LLMOptions {
    maxTokens?: number;
    temperature?: number;
}

export type ContentPart =
    | { type: 'text'; text: string }
    | { type: 'image'; base64: string; mimeType: 'image/jpeg' | 'image/png' };
