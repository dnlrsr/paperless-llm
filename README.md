# paperless-llm

A TypeScript monorepo that automatically enriches [paperless-ngx](https://github.com/paperless-ngx/paperless-ngx) documents using LLMs — assigns titles, tags, correspondents, document types, dates, and optional summaries through a composable pipeline.

Inspired by [paperless-gpt](https://github.com/icereed/paperless-gpt), rebuilt from scratch with TypeScript, SOLID principles, and a full web UI.

---

## Features

| Feature | Detail |
|---|---|
| **Multi-provider LLM** | OpenAI, Anthropic, Mistral, Google Gemini, Ollama |
| **Multi-mode OCR** | LLM Vision, Azure Document Intelligence, Docling |
| **Composable pipeline** | Each stage is independently enable/disable-able |
| **Customisable prompts** | Handlebars templates, editable from the UI with hot-reload |
| **Job queue** | BullMQ + Redis — retries, progress, SSE live feed |
| **i18n** | English + German (`en` / `de`), easily extendable |
| **SOLID architecture** | DI composition root, provider registries (OCP), split interfaces (ISP) |
| **React web UI** | Dashboard, document review, job monitor, analysis, prompt editor |

---

## Architecture

```
paperless-llm/
├── apps/
│   ├── api/        # Fastify 5 + BullMQ + Drizzle (SQLite)
│   └── web/        # React 19 + Vite + Tailwind
└── packages/
    └── shared/     # Types, Zod schemas, i18n locale files
```

---

## Quick start (Docker)

```bash
cp apps/api/.env.example .env
# edit .env — add PAPERLESS_URL, PAPERLESS_TOKEN, and your LLM provider key
docker compose up -d
```

- Web UI → http://localhost:3000
- API    → http://localhost:8080/api/health

---

## Quick start (local dev)

**Prerequisites**: Node ≥ 22, PNPM ≥ 9, Redis running locally.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
# edit apps/api/.env

pnpm dev   # starts both api (port 8080) and web (port 3000) via Turborepo
```

---

## LLM Providers

Set `LLM_PROVIDER` in `.env`:

| Value | Required env var |
|---|---|
| `openai` | `OPENAI_API_KEY` |
| `anthropic` | `ANTHROPIC_API_KEY` |
| `mistral` | `MISTRAL_API_KEY` |
| `google` | `GOOGLE_GENERATIVE_AI_API_KEY` |
| `ollama` | `OLLAMA_BASE_URL`, `OLLAMA_MODEL` |

---

## OCR Modes

Set `OCR_MODE` in `.env`:

| Value | Description |
|---|---|
| `none` | Use existing text layer only |
| `llm-vision` | Pages → JPEG → vision LLM |
| `azure-document-intelligence` | Azure AI Form Recognizer |
| `docling` | Self-hosted Docling server |

---

## How it works

1. **Polling service** scans paperless-ngx every `POLLING_INTERVAL_SECONDS` for documents tagged with `PAPERLESS_PROCESS_TAG`.
2. Each document is enqueued as a **BullMQ job**.
3. The **metadata worker** runs the configurable **pipeline**:
   - `OcrStage` → downloads PDF, runs OCR if configured
   - `TitleStage`, `TagsStage`, `CorrespondentStage`, `DocumentTypeStage`, `CreatedDateStage`, `SummaryStage` — each renders its Handlebars prompt and calls the LLM
4. Suggestions are stored in SQLite. The user **reviews** them in the web UI, then **applies** them back to paperless-ngx.

---

## i18n

Locale files live in `packages/shared/src/locales/`. Add a new locale by creating `<lang>.json` with the same keys and adding the language code to the `supportedLngs` array in both `apps/api/src/config/i18n.ts` and `apps/web/src/i18n.ts`.

---

## SOLID highlights

- **SRP** — `PaperlessClient` only talks to paperless-ngx; `PromptEngine` only handles Handlebars; each `*Stage` only implements one extraction task.
- **OCP** — LLM and OCR providers are registered in Maps; adding a new provider requires zero changes to existing code.
- **LSP** — All LLM providers are interchangeable via `TextLLMProvider` / `VisionLLMProvider` interfaces.
- **ISP** — Text and vision capabilities are separate interfaces; providers implement only what they support.
- **DIP** — `main.ts` is the sole composition root; every module receives its dependencies injected rather than importing singletons.
