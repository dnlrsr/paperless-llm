# Configuration

All configuration is done through environment variables, typically in a `.env` file.

---

## Minimum required variables

| Variable | Description |
|---|---|
| `PAPERLESS_BASE_URL` | Full URL of your paperless-ngx instance |
| `PAPERLESS_API_TOKEN` | paperless-ngx API token (from Profile → API Token) |
| `LLM_PROVIDER` | Which LLM backend to use (`openai`, `anthropic`, `mistral`, `ollama`, `googleai`) |
| `LLM_MODEL` | Model name for the chosen provider (e.g. `gpt-4o-mini`) |
| `JWT_SECRET` | At least 32 random characters — signs login tokens |
| _(provider key)_ | API key for the chosen LLM provider (e.g. `OPENAI_API_KEY`) |

---

## Paperless-ngx connection

| Variable | Default | Description |
|---|---|---|
| `PAPERLESS_BASE_URL` | — | Base URL of paperless-ngx, e.g. `http://paperless-ngx:8000` |
| `PAPERLESS_API_TOKEN` | — | Service account API token |
| `PAPERLESS_PUBLIC_URL` | _(same as BASE_URL)_ | Public-facing URL used to generate document links in the UI |

---

## Tag names

paperless-llm uses paperless-ngx tags to trigger workflows. The tags are created automatically if they don't exist.

| Variable | Default | Description |
|---|---|---|
| `MANUAL_TAG` | `paperless-llm` | Tag a document with this to queue it for review |
| `AUTO_TAG` | `paperless-llm-auto` | Tag for fully automatic processing (no review) |
| `AUTO_OCR_TAG` | `paperless-llm-ocr-auto` | Tag to trigger OCR-only processing |
| `PROCESSED_TAG` | `paperless-llm-processed` | Applied to documents after suggestions are accepted |
| `OCR_COMPLETE_TAG` | `paperless-llm-ocr-complete` | Applied after successful OCR |

---

## LLM provider

| Variable | Default | Description |
|---|---|---|
| `LLM_PROVIDER` | — | `openai` \| `anthropic` \| `mistral` \| `ollama` \| `googleai` |
| `LLM_MODEL` | — | Provider-specific model name |
| `LLM_LANGUAGE` | _(auto-detect)_ | Override the language used in prompts |
| `LLM_REQUESTS_PER_MINUTE` | `120` | Rate limit for LLM API calls |
| `LLM_MAX_RETRIES` | `3` | Number of retries on transient LLM errors |
| `TOKEN_LIMIT` | `0` | Truncate document content to this many tokens before sending (`0` = unlimited) |

### OpenAI

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | — | Your OpenAI API key |
| `OPENAI_BASE_URL` | _(OpenAI default)_ | Override for Azure OpenAI or compatible APIs |
| `OPENAI_API_TYPE` | `openai` | `openai` or `azure` |

### Anthropic

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Your Anthropic API key |

### Mistral

| Variable | Default | Description |
|---|---|---|
| `MISTRAL_API_KEY` | — | Your Mistral API key |

### Google AI (Gemini)

| Variable | Default | Description |
|---|---|---|
| `GOOGLEAI_API_KEY` | — | Your Google AI Studio API key |

### Ollama

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_HOST` | — | URL of your Ollama instance, e.g. `http://ollama:11434` |
| `OLLAMA_CONTEXT_LENGTH` | _(model default)_ | Override context window size |
| `OLLAMA_TEMPERATURE` | _(model default)_ | Generation temperature |
| `OLLAMA_REQUEST_TIMEOUT_SECONDS` | `600` | Per-request timeout in seconds (`0` = no timeout) |

---

## Vision LLM (for OCR)

Used when `OCR_PROVIDER=llm`. Defaults to the same provider/model as the main LLM if not set.

| Variable | Default | Description |
|---|---|---|
| `VISION_LLM_PROVIDER` | _(same as LLM_PROVIDER)_ | Provider for image-based OCR |
| `VISION_LLM_MODEL` | _(same as LLM_MODEL)_ | Model name for the vision provider |
| `VISION_LLM_MAX_TOKENS` | _(provider default)_ | Max tokens for OCR responses |
| `VISION_LLM_TEMPERATURE` | _(provider default)_ | Temperature for OCR generation |

---

## OCR provider

| Variable | Default | Description |
|---|---|---|
| `OCR_PROVIDER` | `llm` | `llm` \| `azure` \| `google_docai` \| `docling` |
| `OCR_PROCESS_MODE` | `image` | `image` \| `pdf` \| `whole_pdf` — how the document is fed to the OCR engine |
| `OCR_LIMIT_PAGES` | `5` | Maximum number of pages to OCR per document |
| `PDF_SKIP_EXISTING_OCR` | `false` | Skip OCR if the PDF already has a text layer |

### Azure Document Intelligence

| Variable | Default | Description |
|---|---|---|
| `AZURE_DOCAI_ENDPOINT` | — | Azure resource endpoint URL |
| `AZURE_DOCAI_KEY` | — | Azure API key |
| `AZURE_DOCAI_MODEL_ID` | `prebuilt-read` | Model to use for analysis |
| `AZURE_DOCAI_TIMEOUT_SECONDS` | `120` | Polling timeout waiting for results |
| `AZURE_DOCAI_OUTPUT_CONTENT_FORMAT` | `text` | `text` or `markdown` |

### Google Document AI

| Variable | Default | Description |
|---|---|---|
| `GOOGLE_PROJECT_ID` | — | GCP project ID |
| `GOOGLE_LOCATION` | — | Processor location (e.g. `us`) |
| `GOOGLE_PROCESSOR_ID` | — | Document AI processor ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | — | Path to service account JSON key file |

### Docling

| Variable | Default | Description |
|---|---|---|
| `DOCLING_URL` | — | URL of your Docling server, e.g. `http://docling:5001` |
| `DOCLING_IMAGE_EXPORT_MODE` | `embedded` | `embedded` or `placeholder` |
| `DOCLING_OCR_PIPELINE` | `standard` | `standard` or `vlm` |
| `DOCLING_OCR_ENGINE` | `easyocr` | OCR engine used by Docling |

---

## PDF features

| Variable | Default | Description |
|---|---|---|
| `PDF_UPLOAD` | `false` | Upload the OCR-processed PDF back to paperless-ngx |
| `PDF_REPLACE` | `false` | Replace the original PDF with the OCR version |
| `PDF_COPY_METADATA` | `false` | Copy metadata from the original PDF to the OCR version |
| `PDF_OCR_TAGGING` | `false` | Tag the document after successful OCR upload |
| `CREATE_LOCAL_PDF` | `false` | Save the OCR PDF to a local path |
| `LOCAL_PDF_PATH` | — | Directory path for local PDF output |
| `CREATE_LOCAL_HOCR` | `false` | Save the hOCR XML output locally |
| `LOCAL_HOCR_PATH` | — | Directory path for local hOCR output |

---

## Auto-generation toggles

Control which metadata fields are generated in automatic mode (tag `AUTO_TAG`).

| Variable | Default | Description |
|---|---|---|
| `MANUAL_AUTO_GENERATE` | `true` | Automatically start generation when a manual-tag document is detected |
| `AUTO_GENERATE_TITLE` | `true` | Generate title in auto mode |
| `AUTO_GENERATE_TAGS` | `true` | Generate tags in auto mode |
| `AUTO_GENERATE_CORRESPONDENTS` | `true` | Generate correspondent in auto mode |
| `AUTO_GENERATE_DOCUMENT_TYPE` | `true` | Generate document type in auto mode |
| `AUTO_GENERATE_CREATED_DATE` | `true` | Generate creation date in auto mode |
| `AUTO_GENERATE_CUSTOM_FIELDS` | `false` | Generate custom fields in auto mode |

---

## Suggestions behaviour

| Variable | Default | Description |
|---|---|---|
| `USE_EXISTING_DATA_ONLY` | `true` | Restrict suggestions to tags / correspondents / types already in paperless-ngx |
| `CORRESPONDENT_BLACK_LIST` | _(empty)_ | Comma-separated list of correspondent names the LLM must never suggest |

---

## Authentication

| Variable | Default | Description |
|---|---|---|
| `AUTH_ENABLED` | `true` | Enable JWT authentication (disable only for local dev) |
| `JWT_SECRET` | — | Secret for signing tokens — minimum 32 characters |

!!! warning "Keep `AUTH_ENABLED=true` in production"
    Disabling authentication exposes the API and all connected paperless-ngx data to anyone who can reach the port.

---

## Server

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Internal API listen port (inside the container, not the host-mapped port) |
| `LOG_LEVEL` | `info` | Pino log level: `trace`, `debug`, `info`, `warn`, `error` |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string for BullMQ |
| `DATABASE_URL` | `./data/db.sqlite` | Path to the SQLite database file |
| `POLL_INTERVAL_SECONDS` | `30` | How often to poll paperless-ngx for newly tagged documents |
