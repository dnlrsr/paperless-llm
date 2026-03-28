# Environment Variables Reference

Complete list of all environment variables accepted by paperless-llm. Bold variables are required.

---

## Paperless-ngx connection

| Variable | Required | Default | Description |
|---|---|---|---|
| **`PAPERLESS_BASE_URL`** | Yes | — | Base URL of your paperless-ngx instance (e.g. `http://paperless-ngx:8000`) |
| **`PAPERLESS_API_TOKEN`** | Yes | — | paperless-ngx API token (Profile → API Token) |
| `PAPERLESS_PUBLIC_URL` | No | _(same as BASE_URL)_ | Public-facing URL for links shown in the UI |

---

## Tags

| Variable | Required | Default | Description |
|---|---|---|---|
| `MANUAL_TAG` | No | `paperless-llm` | Tag that queues a document for manual review |
| `AUTO_TAG` | No | `paperless-llm-auto` | Tag that triggers fully automatic processing |
| `AUTO_OCR_TAG` | No | `paperless-llm-ocr-auto` | Tag that triggers OCR-only processing |
| `PROCESSED_TAG` | No | `paperless-llm-processed` | Tag added after applying suggestions |
| `OCR_COMPLETE_TAG` | No | `paperless-llm-ocr-complete` | Tag added after a successful OCR upload |

---

## LLM provider

| Variable | Required | Default | Description |
|---|---|---|---|
| **`LLM_PROVIDER`** | Yes | — | `openai` \| `anthropic` \| `mistral` \| `ollama` \| `googleai` |
| **`LLM_MODEL`** | Yes | — | Model name for the chosen provider |
| `LLM_LANGUAGE` | No | `English` | Language override for prompt responses |
| `LLM_REQUESTS_PER_MINUTE` | No | `120` | Rate limit for LLM API calls |
| `LLM_MAX_RETRIES` | No | `3` | Retries on transient LLM errors |
| `TOKEN_LIMIT` | No | `0` | Truncate document content to this many characters (`0` = unlimited) |

---

## LLM provider credentials

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | If OpenAI | — | OpenAI API key |
| `OPENAI_BASE_URL` | No | _(OpenAI default)_ | Override base URL (for Azure or compatible APIs) |
| `OPENAI_API_TYPE` | No | `openai` | `openai` or `azure` |
| `ANTHROPIC_API_KEY` | If Anthropic | — | Anthropic API key |
| `MISTRAL_API_KEY` | If Mistral | — | Mistral AI API key |
| `GOOGLEAI_API_KEY` | If Google AI | — | Google AI Studio API key |
| `OLLAMA_HOST` | If Ollama | — | Ollama URL (e.g. `http://ollama:11434`) |
| `OLLAMA_CONTEXT_LENGTH` | No | _(model default)_ | Override model context window size |
| `OLLAMA_TEMPERATURE` | No | _(model default)_ | Generation temperature |
| `OLLAMA_REQUEST_TIMEOUT_SECONDS` | No | `600` | Per-request timeout in seconds (`0` = no timeout) |

---

## Vision LLM (for OCR)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VISION_LLM_PROVIDER` | No | _(same as LLM_PROVIDER)_ | Provider for LLM Vision OCR |
| `VISION_LLM_MODEL` | No | _(same as LLM_MODEL)_ | Model for LLM Vision OCR |
| `VISION_LLM_MAX_TOKENS` | No | _(provider default)_ | Max tokens for OCR responses |
| `VISION_LLM_TEMPERATURE` | No | _(provider default)_ | Temperature for OCR generation |

---

## OCR

| Variable | Required | Default | Description |
|---|---|---|---|
| `OCR_PROVIDER` | No | `llm` | `llm` \| `azure` \| `google_docai` \| `docling` |
| `OCR_PROCESS_MODE` | No | `image` | `image` \| `pdf` \| `whole_pdf` |
| `OCR_LIMIT_PAGES` | No | `5` | Max pages to OCR per document (`0` = unlimited) |
| `PDF_SKIP_EXISTING_OCR` | No | `false` | Skip OCR if the PDF already has a text layer |

### Azure Document Intelligence

| Variable | Required | Default | Description |
|---|---|---|---|
| `AZURE_DOCAI_ENDPOINT` | If Azure | — | Azure resource endpoint URL |
| `AZURE_DOCAI_KEY` | If Azure | — | Azure API key |
| `AZURE_DOCAI_MODEL_ID` | No | `prebuilt-read` | Analysis model |
| `AZURE_DOCAI_TIMEOUT_SECONDS` | No | `120` | Polling timeout in seconds |
| `AZURE_DOCAI_OUTPUT_CONTENT_FORMAT` | No | `text` | `text` or `markdown` |

### Google Document AI

| Variable | Required | Default | Description |
|---|---|---|---|
| `GOOGLE_PROJECT_ID` | If Google | — | GCP project ID |
| `GOOGLE_LOCATION` | If Google | — | Processor region (e.g. `us`) |
| `GOOGLE_PROCESSOR_ID` | If Google | — | Document AI processor ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | If Google | — | Path to service account JSON |

### Docling

| Variable | Required | Default | Description |
|---|---|---|---|
| `DOCLING_URL` | If Docling | — | Docling server URL |
| `DOCLING_IMAGE_EXPORT_MODE` | No | `embedded` | `embedded` or `placeholder` |
| `DOCLING_OCR_PIPELINE` | No | `standard` | `standard` or `vlm` |
| `DOCLING_OCR_ENGINE` | No | `easyocr` | OCR engine used by Docling |

---

## PDF features

| Variable | Required | Default | Description |
|---|---|---|---|
| `PDF_UPLOAD` | No | `false` | Upload OCR'd PDF back to paperless-ngx |
| `PDF_REPLACE` | No | `false` | Replace original PDF with OCR version |
| `PDF_COPY_METADATA` | No | `false` | Copy metadata from original to new PDF |
| `PDF_OCR_TAGGING` | No | `false` | Add `OCR_COMPLETE_TAG` after successful upload |
| `CREATE_LOCAL_PDF` | No | `false` | Save OCR'd PDF to local path |
| `LOCAL_PDF_PATH` | No | — | Directory for local PDF output |
| `CREATE_LOCAL_HOCR` | No | `false` | Save hOCR XML to local path |
| `LOCAL_HOCR_PATH` | No | — | Directory for local hOCR output |

---

## Auto-generation

| Variable | Required | Default | Description |
|---|---|---|---|
| `MANUAL_AUTO_GENERATE` | No | `true` | Start generation automatically when a manual-tag document is detected |
| `AUTO_GENERATE_TITLE` | No | `true` | Generate title in auto mode |
| `AUTO_GENERATE_TAGS` | No | `true` | Generate tags in auto mode |
| `AUTO_GENERATE_CORRESPONDENTS` | No | `true` | Generate correspondent in auto mode |
| `AUTO_GENERATE_DOCUMENT_TYPE` | No | `true` | Generate document type in auto mode |
| `AUTO_GENERATE_CREATED_DATE` | No | `true` | Generate created date in auto mode |
| `AUTO_GENERATE_CUSTOM_FIELDS` | No | `false` | Generate custom fields in auto mode |

---

## Suggestion behaviour

| Variable | Required | Default | Description |
|---|---|---|---|
| `USE_EXISTING_DATA_ONLY` | No | `true` | Restrict suggestions to existing tags/correspondents/types |
| `CORRESPONDENT_BLACK_LIST` | No | _(empty)_ | Comma-separated list of correspondent names to never suggest |

---

## Authentication

| Variable | Required | Default | Description |
|---|---|---|---|
| `AUTH_ENABLED` | No | `true` | Enable JWT authentication |
| **`JWT_SECRET`** | Yes (if auth) | — | Signing secret — minimum 32 characters |

---

## Server

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `8080` | Internal API listen port |
| `LOG_LEVEL` | No | `info` | Pino log level: `trace` \| `debug` \| `info` \| `warn` \| `error` |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection string |
| `DATABASE_URL` | No | `file:./data/paperless-llm.db` | SQLite database file path |
| `POLL_INTERVAL_SECONDS` | No | `30` | Paperless-ngx polling interval in seconds |
