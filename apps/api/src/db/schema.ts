import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ─────────────────────────────────────────────────────────────────
// Suggestions — pending AI suggestions for documents
// ─────────────────────────────────────────────────────────────────

export const suggestions = sqliteTable('suggestions', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    documentId: integer('document_id').notNull(),
    status: text('status', { enum: ['pending', 'applied', 'discarded'] })
        .notNull()
        .default('pending'),
    title: text('title'),
    tags: text('tags', { mode: 'json' }).$type<string[]>(),
    correspondent: text('correspondent'),
    documentType: text('document_type'),
    createdDate: text('created_date'),
    customFields: text('custom_fields', { mode: 'json' }),
    summary: text('summary'),
    newTags: text('new_tags', { mode: 'json' }).$type<string[]>(),
    newCorrespondent: text('new_correspondent'),
    newDocumentType: text('new_document_type'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),
    appliedAt: integer('applied_at', { mode: 'timestamp' }),
});

// ─────────────────────────────────────────────────────────────────
// Jobs — tracks BullMQ job state in the local DB for history
// ─────────────────────────────────────────────────────────────────

export const jobs = sqliteTable('jobs', {
    id: text('id').primaryKey(),
    type: text('type', { enum: ['metadata', 'ocr', 'analysis'] }).notNull(),
    documentId: integer('document_id'),
    status: text('status').notNull().default('waiting'),
    progress: real('progress').notNull().default(0),
    error: text('error'),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
});

// ─────────────────────────────────────────────────────────────────
// Settings — key-value store for runtime configuration
// ─────────────────────────────────────────────────────────────────

export const settings = sqliteTable('settings', {
    key: text('key').primaryKey(),
    value: text('value', { mode: 'json' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),
});

// ─────────────────────────────────────────────────────────────────
// Audit log — immutable record of every AI action
// ─────────────────────────────────────────────────────────────────

export const auditLog = sqliteTable('audit_log', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    event: text('event').notNull(), // e.g. 'suggestions.applied', 'job.failed'
    documentId: integer('document_id'),
    payload: text('payload', { mode: 'json' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(unixepoch())`),
});
