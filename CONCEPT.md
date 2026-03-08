# paperless-llm — Concept & Architecture

> TypeScript-first reimplementation and extension of [paperless-gpt](https://github.com/icereed/paperless-gpt).  
> Built for extensibility, type safety and clean architecture from day one.

---

## 1. Goals

| Goal | Description |
|------|-------------|
| **Feature parity** | Everything paperless-gpt does — OCR, title/tag/date/correspondent/custom-field generation, manual + auto processing |
| **TypeScript throughout** | Strict types, no `any`, full IDE support |
| **Provider-agnostic** | Clean interfaces for LLM and OCR backends; swap providers without touching business logic |
| **Extensible pipeline** | Each processing step is a composable, testable unit |
| **Future ready** | Hook points for upcoming features (summaries, semantic search, webhooks, etc.) |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Web UI (React)                    │
│   Dashboard · Document Review · Settings · Ad-hoc Chat  │
└───────────────────────┬─────────────────────────────────┘
                        │ REST + SSE (live updates)
┌───────────────────────▼─────────────────────────────────┐
│                    API Server (Fastify)                   │
│  /documents  /jobs  /settings  /prompts  /analysis      │
└──────┬──────────────────────────────────────┬───────────┘
       │                                      │
┌──────▼──────────┐                  ┌────────▼────────────┐
│  Job Queue      │                  │  paperless-ngx API  │
│  (BullMQ/Redis) │                  │  Client             │
└──────┬──────────┘                  └─────────────────────┘
       │
┌──────▼──────────────────────────────────────────────┐
│                  Processing Pipeline                  │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │  OCR     │  │ Metadata │  │  PDF Generator   │    │
│  │  Stage   │  │  Stage   │  │  Stage           │    │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘    │
│       │             │                 │               │
│  ┌────▼─────────────▼─────────────────▼─────────┐    │
│  │           LLM Provider Adapter                │    │
│  │  OpenAI · Ollama · Anthropic · Mistral       │    │
│  └───────────────────────────────────────────────┘    │
│                                                       │
│  ┌────────────────────────────────────────────────┐   │
│  │           OCR Provider Adapter                 │   │
│  │  LLM-Vision · Azure DocAI · Google DocAI       │   │
│  │  Docling · Mistral OCR                         │   │
│  └────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

### Backend
| Layer | Choice | Reason |
|-------|--------|--------|
| Runtime | **Node.js 22 LTS** | Native fetch, stable, ESM support |
| Framework | **Fastify 5** | Fast, schema-first, plugin ecosystem |
| Language | **TypeScript 5 (strict)** | Full type safety |
| Job Queue | **BullMQ + Redis** | Persistent, retries, concurrency control |
| ORM / DB | **Drizzle ORM + SQLite** (dev) / **PostgreSQL** (prod) | Lightweight local state, modification history, settings |
| LLM SDK | **Vercel AI SDK (`ai`)** | Unified interface for OpenAI, Anthropic, Mistral, Ollama |
| PDF processing | **pdf-lib + pdfjs-dist + sharp** | PDF manipulation, image rendering |
| Validation | **Zod** | Runtime + compile-time schema validation |
| Testing | **Vitest** | Fast, ESM-native unit tests |
| Container | **Docker multi-stage** | Minimal image, separate build/runtime layers |

### Frontend
| Layer | Choice |
|-------|--------|
| Framework | **React 19 + Vite** |
| Language | **TypeScript (strict)** |
| UI Components | **shadcn/ui + Tailwind CSS** |
| State management | **TanStack Query v5** (server state) + **Zustand** (UI state) |
| Forms | **React Hook Form + Zod** |
| Real-time | **Server-Sent Events** for job progress |

---

## 4. Folder Structure

```
paperless-llm/
├── apps/
│   ├── api/                        # Fastify backend
│   │   ├── src/
│   │   │   ├── config/             # Env validation (Zod)
│   │   │   ├── db/                 # Drizzle schema & migrations
│   │   │   ├── jobs/               # BullMQ job definitions & processors
│   │   │   ├── pipeline/           # Core processing stages
│   │   │   │   ├── stages/
│   │   │   │   │   ├── ocr.stage.ts
│   │   │   │   │   ├── title.stage.ts
│   │   │   │   │   ├── tags.stage.ts
│   │   │   │   │   ├── correspondent.stage.ts
│   │   │   │   │   ├── document-type.stage.ts
│   │   │   │   │   ├── created-date.stage.ts
│   │   │   │   │   ├── custom-fields.stage.ts
│   │   │   │   │   └── pdf-generation.stage.ts
│   │   │   │   └── pipeline.ts     # Compose stages
│   │   │   ├── providers/
│   │   │   │   ├── llm/            # LLM provider adapters
│   │   │   │   │   ├── interface.ts
│   │   │   │   │   ├── openai.ts
│   │   │   │   │   ├── ollama.ts
│   │   │   │   │   ├── anthropic.ts
│   │   │   │   │   └── mistral.ts
│   │   │   │   └── ocr/            # OCR provider adapters
│   │   │   │       ├── interface.ts
│   │   │   │       ├── llm-vision.ts
│   │   │   │       ├── azure-docai.ts
│   │   │   │       ├── google-docai.ts
│   │   │   │       └── docling.ts
│   │   │   ├── paperless/          # paperless-ngx API client
│   │   │   ├── prompts/            # Prompt template engine
│   │   │   ├── routes/             # Fastify route handlers
│   │   │   └── main.ts
│   │   ├── test/
│   │   └── Dockerfile
│   └── web/                        # React frontend
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── hooks/
│       │   └── main.tsx
│       └── Dockerfile
├── packages/
│   └── shared/                     # Shared types & schemas (Zod)
│       └── src/
│           ├── document.types.ts
│           ├── job.types.ts
│           └── api.schemas.ts
├── default_prompts/                # Built-in prompt templates
├── prompts/                        # User-overridden templates (volume mount)
├── docker-compose.yml
├── turbo.json                      # Turborepo task graph
└── package.json                    # PNPM workspace root
```

---

## 5. Core Domain Concepts

### 5.1 Document Processing Pipeline

Each pipeline run is a sequence of **stages**. Every stage:
- receives a `DocumentContext` (content, metadata, previous stage results)
- returns an updated `DocumentContext`
- can be individually enabled/disabled
- is independently testable

```typescript
// packages/shared/src/pipeline.types.ts

export interface DocumentContext {
  documentId: number;
  content: string;           // raw text / OCR result
  originalMetadata: PaperlessDocument;
  suggestions: Partial<DocumentSuggestions>;
  pdfBuffer?: Buffer;
  ocrResult?: OcrResult;
}

export interface PipelineStage {
  readonly name: string;
  readonly enabled: (config: AppConfig) => boolean;
  process(ctx: DocumentContext, deps: StageDependencies): Promise<DocumentContext>;
}
```

### 5.2 LLM Provider Interface

```typescript
// apps/api/src/providers/llm/interface.ts

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

export interface LLMProvider {
  readonly name: string;
  chat(messages: LLMMessage[], options?: LLMOptions): Promise<string>;
  chatWithImage(prompt: string, imageBase64: string, options?: LLMOptions): Promise<string>;
}
```

### 5.3 OCR Provider Interface

```typescript
// apps/api/src/providers/ocr/interface.ts

export type OcrProcessMode = 'image' | 'pdf' | 'whole_pdf';

export interface OcrResult {
  text: string;
  pages: OcrPage[];
  hocrXml?: string;   // for searchable PDF generation
}

export interface OcrProvider {
  readonly name: string;
  readonly supportedModes: OcrProcessMode[];
  process(input: OcrInput, mode: OcrProcessMode): Promise<OcrResult>;
}
```

### 5.4 Prompt Template Engine

Templates are stored as **Handlebars** files (more familiar than Go templates, well-typed):

```
prompts/
  title.hbs
  tags.hbs
  ocr.hbs
  correspondent.hbs
  document-type.hbs
  created_date.hbs
  custom_fields.hbs
  analysis.hbs          ← new: ad-hoc analysis
  summary.hbs           ← new: document summarization
```

Each template is loaded at startup and reloaded on file change (via `chokidar`). User-editable through the Settings UI.

---

## 6. Processing Flows

### Manual Flow (tag: `paperless-llm`)
```
paperless-ngx detects tag
        │
        ▼
Poll loop picks up document
        │
        ▼
Run selected pipeline stages
        │
        ▼
Store suggestions in local DB (pending)
        │
        ▼
User reviews in Web UI
        │
        ▼
User clicks "Apply" → PATCH paperless-ngx API
```

### Auto Flow (tag: `paperless-llm-auto`)
```
paperless-ngx detects tag
        │
        ▼
Poll loop picks up document
        │
        ▼
Run all enabled pipeline stages
        │
        ▼
Directly PATCH paperless-ngx API (no review step)
        │
        ▼
Tag updated to "paperless-llm-processed"
```

### OCR Flow (tag: `paperless-llm-ocr-auto`)
```
Document with tag detected
        │
        ▼
Download PDF from paperless-ngx
        │
        ▼
Run OCR stage (selected provider + mode)
        │
        ▼
Optionally: generate searchable PDF
        │
        ▼
Upload enhanced PDF to paperless-ngx
        │  (copy metadata, optionally delete original)
        ▼
Tag updated to "paperless-llm-ocr-complete"
```

---

## 7. API Routes

```
GET    /api/health
GET    /api/version

# Documents pending review
GET    /api/documents/pending
GET    /api/documents/:id/suggestions
POST   /api/documents/:id/generate       # trigger generation for one doc
POST   /api/documents/:id/apply          # write suggestions to paperless-ngx
DELETE /api/documents/:id/suggestions    # discard

# Jobs
GET    /api/jobs                         # list all running / recent jobs
GET    /api/jobs/:id                     # job detail + progress
DELETE /api/jobs/:id                     # cancel

# Ad-hoc analysis
POST   /api/analysis                     # { documentIds[], prompt }

# Settings
GET    /api/settings
PUT    /api/settings

# Prompts
GET    /api/prompts
GET    /api/prompts/:name
PUT    /api/prompts/:name

# Server-Sent Events
GET    /api/events                       # job progress, document updates
```

---

## 8. Configuration (Environment Variables)

All config is validated with Zod at startup:

```typescript
// apps/api/src/config/schema.ts

export const AppConfigSchema = z.object({
  // paperless-ngx
  PAPERLESS_BASE_URL:   z.string().url(),
  PAPERLESS_API_TOKEN:  z.string().min(1),
  PAPERLESS_PUBLIC_URL: z.string().url().optional(),

  // Tags
  MANUAL_TAG:           z.string().default('paperless-llm'),
  AUTO_TAG:             z.string().default('paperless-llm-auto'),
  AUTO_OCR_TAG:         z.string().default('paperless-llm-ocr-auto'),
  PROCESSED_TAG:        z.string().default('paperless-llm-processed'),
  OCR_COMPLETE_TAG:     z.string().default('paperless-llm-ocr-complete'),

  // LLM
  LLM_PROVIDER:         z.enum(['openai', 'ollama', 'anthropic', 'mistral', 'googleai']),
  LLM_MODEL:            z.string().min(1),
  LLM_LANGUAGE:         z.string().default('English'),
  OPENAI_API_KEY:       z.string().optional(),
  ANTHROPIC_API_KEY:    z.string().optional(),
  MISTRAL_API_KEY:      z.string().optional(),
  OLLAMA_HOST:          z.string().url().optional(),

  // Vision / OCR LLM
  VISION_LLM_PROVIDER:  z.enum(['openai', 'ollama', 'anthropic', 'mistral']).optional(),
  VISION_LLM_MODEL:     z.string().optional(),

  // OCR
  OCR_PROVIDER:         z.enum(['llm', 'azure', 'google_docai', 'docling']).default('llm'),
  OCR_PROCESS_MODE:     z.enum(['image', 'pdf', 'whole_pdf']).default('image'),
  OCR_LIMIT_PAGES:      z.coerce.number().int().min(0).default(5),

  // PDF features
  PDF_UPLOAD:           z.coerce.boolean().default(false),
  PDF_REPLACE:          z.coerce.boolean().default(false),
  PDF_COPY_METADATA:    z.coerce.boolean().default(true),

  // Auto-generation flags
  AUTO_GENERATE_TITLE:         z.coerce.boolean().default(true),
  AUTO_GENERATE_TAGS:          z.coerce.boolean().default(true),
  AUTO_GENERATE_CORRESPONDENTS:z.coerce.boolean().default(true),
  AUTO_GENERATE_DOCUMENT_TYPE: z.coerce.boolean().default(true),
  AUTO_GENERATE_CREATED_DATE:  z.coerce.boolean().default(true),

  // Server
  PORT:     z.coerce.number().default(8080),
  LOG_LEVEL:z.enum(['trace','debug','info','warn','error']).default('info'),
  REDIS_URL:z.string().url().default('redis://localhost:6379'),
  DATABASE_URL: z.string().default('file:./data/paperless-llm.db'),
});
```

---

## 9. Database Schema (Drizzle ORM)

```typescript
// Stores pending suggestions and the modification history

export const suggestions = sqliteTable('suggestions', {
  id:          integer('id').primaryKey({ autoIncrement: true }),
  documentId:  integer('document_id').notNull(),
  status:      text('status', { enum: ['pending','applied','discarded'] }).default('pending'),
  title:       text('title'),
  tags:        text('tags', { mode: 'json' }).$type<string[]>(),
  correspondents: text('correspondents', { mode: 'json' }).$type<string[]>(),
  documentType:   text('document_type'),
  createdDate:    text('created_date'),
  customFields:   text('custom_fields', { mode: 'json' }),
  createdAt:   integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  appliedAt:   integer('applied_at', { mode: 'timestamp' }),
});

export const jobs = sqliteTable('jobs', {
  id:          text('id').primaryKey(),   // BullMQ job id
  documentId:  integer('document_id'),
  type:        text('type', { enum: ['metadata','ocr','analysis'] }),
  status:      text('status'),
  progress:    integer('progress').default(0),
  error:       text('error'),
  createdAt:   integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const settings = sqliteTable('settings', {
  key:   text('key').primaryKey(),
  value: text('value', { mode: 'json' }).notNull(),
});
```

---

## 10. Web UI Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard — queue size, recent activity, system status |
| `/documents` | List of documents pending manual review |
| `/documents/:id` | Review a single document's suggestions, edit and apply |
| `/jobs` | Live job monitor (progress bars via SSE) |
| `/analysis` | Ad-hoc analysis — select documents, enter prompt, see results |
| `/settings` | All configuration options (backed by `/api/settings`) |
| `/prompts` | Prompt editor — view/edit all templates in-browser |

---

## 11. Best Practices Applied

### TypeScript
- `strict: true` in all `tsconfig.json` files
- No `any` — use `unknown` + Zod narrowing
- Discriminated unions for provider result types
- Const enums for modes/statuses replaced by `z.enum` (runtime safe)

### Error Handling
- All provider adapters return `Result<T, AppError>` (neverthrow or custom)
- Top-level Fastify error handler maps domain errors to HTTP responses
- BullMQ workers have exponential back-off and dead-letter queues

### Testing Strategy
```
Unit tests (Vitest)
  └── Each pipeline stage with mock DocumentContext
  └── Each provider adapter with mocked HTTP (msw)
  └── Prompt template rendering

Integration tests (Vitest + testcontainers)
  └── BullMQ job lifecycle
  └── paperless-ngx client against a WireMock stub

E2E tests (Playwright)
  └── Full manual review flow in browser
  └── Auto processing flow (headless)
```

### Security
- API token stored only in env, never logged or returned in responses
- Prompt templates sanitized before Handlebars rendering (no code execution)
- Rate limiting on `/api/analysis` (configurable)
- `PDF_REPLACE` double-confirmation in UI (requires explicit toggle + confirmation dialog)

### Observability
- **Pino** structured JSON logging (same log level as paperless-gpt)
- `/api/health` returns DB, Redis, and paperless-ngx connectivity status
- BullMQ dashboard available at `/bull-board` (dev only)

---

## 12. Docker Deployment

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  paperless-llm:
    build: .
    environment:
      PAPERLESS_BASE_URL:   "http://paperless-ngx:8000"
      PAPERLESS_API_TOKEN:  "your_token"
      LLM_PROVIDER:         "openai"
      LLM_MODEL:            "gpt-4o"
      OPENAI_API_KEY:       "sk-..."
      REDIS_URL:            "redis://redis:6379"
    volumes:
      - ./data:/app/data           # SQLite DB + local files
      - ./prompts:/app/prompts     # Custom prompt templates
    ports:
      - "8080:8080"
    depends_on:
      - redis

volumes:
  redis_data:
```

Multi-stage `Dockerfile`:
1. `node:22-alpine AS builder` — install deps, compile TypeScript, build React
2. `node:22-alpine AS runner` — copy only `dist/` and `node_modules`, run as non-root

---

## 13. Planned / Future Features

These are the extension points that differentiate this project from paperless-gpt:

| Feature | Description | Stage |
|---------|-------------|-------|
| **Document Summarization** | Generate a concise summary stored as a note in paperless-ngx | Pipeline stage + `summary.hbs` prompt |
| **Semantic Search** | Embed document content (OpenAI embeddings / local) and enable similarity search across the archive | New `/api/search` route + vector store (pgvector / sqlite-vss) |
| **Scheduled Reprocessing** | Cron-based re-evaluation of old documents when a new model is configured | BullMQ scheduled jobs |
| **Webhook Notifications** | POST to a URL on job completion / auto apply | Settings + HTTP client |
| **Multi-user / API Keys** | Basic API key auth for multi-user setups | Fastify plugin |
| **Audit Log** | Full history of every AI suggestion and user decision | DB table + UI page |
| **Batch Ad-hoc Analysis** | Run a custom prompt over hundreds of documents and export CSV | Streaming response + download |
| **Document Relations** | LLM-suggested relationships between documents (invoice → contract) | New document graph feature |
| **Custom Pipeline Steps** | User-defined steps via JavaScript snippets in the UI | Sandboxed execution (vm2 or Deno subprocess) |
| **Mobile-friendly PWA** | Offline-capable review UI | Frontend enhancement |

---

## 14. Implementation Phases

### Phase 1 — Foundation (MVP)
1. Monorepo setup (PNPM + Turborepo)
2. Shared types package
3. paperless-ngx API client
4. LLM provider adapters (OpenAI + Ollama first)
5. Metadata pipeline stages (title, tags, correspondent, document type, created date)
6. BullMQ job processing + polling loop
7. Basic React UI (document list + review)
8. Docker Compose deployment

### Phase 2 — OCR & PDF
1. OCR provider adapters (LLM-vision, Azure, Google DocAI)
2. PDF manipulation (image render, searchable PDF generation)
3. PDF upload + metadata copy
4. OCR job flow

### Phase 3 — Advanced UI & Settings
1. Prompt template editor in UI
2. Settings page (all config editable at runtime)
3. Job monitor with SSE progress
4. Ad-hoc analysis page
5. Custom fields pipeline stage

### Phase 4 — Extended Features
> From the "Planned" table above, prioritised by user demand.

---

## 15. Key Differences vs. paperless-gpt

| Aspect | paperless-gpt (Go) | paperless-llm (TS) |
|--------|-------------------|-------------------|
| Language | Go | TypeScript (strict) |
| LLM SDK | go-openai / custom | Vercel AI SDK (unified) |
| Job queue | In-process goroutines | BullMQ (persistent, Redis) |
| State | In-memory | SQLite / PostgreSQL |
| Prompt templates | Go `text/template` | Handlebars |
| Frontend | React (embedded) | React + Vite (separate, hot-reload) |
| Extensibility | Fork + rebuild | Plugin stages, no rebuild needed |
| Future: semantic search | ❌ | ✅ (planned) |
| Future: webhooks | ❌ | ✅ (planned) |
| Future: audit log | ❌ | ✅ (planned) |
