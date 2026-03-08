import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────
// API request / response schemas  (shared by API + Web)
// ─────────────────────────────────────────────────────────────────

export const DocumentSuggestionsSchema = z.object({
    title: z.string().optional(),
    tags: z.array(z.string()).optional(),
    correspondent: z.string().nullable().optional(),
    documentType: z.string().nullable().optional(),
    createdDate: z.string().nullable().optional(),
    customFields: z
        .array(z.object({ field: z.number(), value: z.union([z.string(), z.number(), z.boolean(), z.null()]) }))
        .optional(),
    summary: z.string().optional(),
});

export const ApplySuggestionsRequestSchema = z.object({
    suggestions: DocumentSuggestionsSchema,
});

export const GenerateRequestSchema = z.object({
    stages: z.array(z.string()).optional(),
});

export const AnalysisRequestSchema = z.object({
    documentIds: z.array(z.number().int().positive()).min(1),
    prompt: z.string().min(1),
    language: z.string().default('English'),
});

export const UpdatePromptRequestSchema = z.object({
    content: z.string().min(1),
});

export const UpdateSettingsRequestSchema = z.record(z.string(), z.unknown());

// ─────────────────────────────────────────────────────────────────
// API response shapes
// ─────────────────────────────────────────────────────────────────

export const HealthResponseSchema = z.object({
    status: z.enum(['ok', 'degraded', 'error']),
    version: z.string(),
    checks: z.object({
        database: z.boolean(),
        redis: z.boolean(),
        paperlessNgx: z.boolean(),
    }),
});

export const PendingDocumentSchema = z.object({
    id: z.number(),
    title: z.string(),
    content: z.string(),
    createdAt: z.string(),
    originalFileName: z.string(),
    hasSuggestions: z.boolean(),
    tags: z.array(z.string()),
});

export const PromptInfoSchema = z.object({
    name: z.string(),
    content: z.string(),
    isCustom: z.boolean(),
});

export type DocumentSuggestionsDto = z.infer<typeof DocumentSuggestionsSchema>;
export type ApplySuggestionsRequest = z.infer<typeof ApplySuggestionsRequestSchema>;
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;
export type UpdatePromptRequest = z.infer<typeof UpdatePromptRequestSchema>;
export type HealthResponse = z.infer<typeof HealthResponseSchema>;
export type PendingDocumentDto = z.infer<typeof PendingDocumentSchema>;
export type PromptInfo = z.infer<typeof PromptInfoSchema>;
