# paperless-llm

> Let AI organize your documents — so you don't have to.

**paperless-llm** connects to your [paperless-ngx](https://github.com/paperless-ngx/paperless-ngx) instance and uses a large language model of your choice to automatically suggest titles, tags, correspondents, document types, creation dates, and summaries for your documents. You review the suggestions in a clean web UI and apply them with a single click.

Inspired by [paperless-gpt](https://github.com/icereed/paperless-gpt).

---

## What it does

Tag a document with `paperless-llm` in paperless-ngx — that's it. paperless-llm picks it up, analyzes the content, and presents you with AI-generated metadata suggestions. You stay in control: nothing is written back until you approve it.

**Suggested metadata:**
- 📄 Title
- 🏷️ Tags
- 👤 Correspondent
- 📁 Document type
- 📅 Creation date
- 📝 Summary *(optional)*

---

## Features

- **Works with your preferred LLM** — OpenAI, Anthropic, Mistral, Google Gemini, or a self-hosted Ollama model
- **Multiple OCR options** — use the existing text layer, LLM vision, Azure Document Intelligence, or a self-hosted Docling server
- **Review before applying** — all suggestions are shown in the web UI before anything is written back to paperless-ngx
- **Customizable prompts** — edit the prompts used for each metadata field directly in the UI, no restart required
- **Auto-processing mode** — optionally skip the review step and apply suggestions automatically
- **Live job monitor** — watch documents being processed in real time
- **English & German UI** — more languages can be added easily

---

## Getting started

### Prerequisites

- A running [paperless-ngx](https://github.com/paperless-ngx/paperless-ngx) instance
- Docker & Docker Compose
- An API key for your LLM provider (or a local Ollama setup)

### 1 — Configure

Copy the example environment file and fill in your details:

```bash
cp .env.example .env
```

Open `.env` and set at minimum:

```dotenv
# Your paperless-ngx instance
PAPERLESS_BASE_URL=http://your-paperless-host:8000
PAPERLESS_API_TOKEN=your-token-here    # Settings → API Tokens in paperless-ngx

# Your LLM provider
LLM_PROVIDER=openai                    # openai | anthropic | mistral | ollama
LLM_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...
```

### 2 — Run

```bash
docker compose up -d
```

Open **http://localhost:3000** — the web UI is ready.

> **Tip:** The `docker-compose.yml` also includes a full paperless-ngx stack (with Postgres, Redis, Gotenberg & Tika) if you don't have one yet.

### 3 — Process a document

1. In paperless-ngx, add the tag **`paperless-llm`** to any document.
2. paperless-llm picks it up automatically (checks every 60 seconds by default).
3. Open the **Documents** page in the web UI to review and apply the suggestions.

---

## LLM providers

Set `LLM_PROVIDER` and the matching API key in your `.env`:

| Provider | `LLM_PROVIDER` value | Required variable |
|---|---|---|
| OpenAI | `openai` | `OPENAI_API_KEY` |
| Anthropic | `anthropic` | `ANTHROPIC_API_KEY` |
| Mistral | `mistral` | `MISTRAL_API_KEY` |
| Google Gemini | `google` | `GOOGLE_GENERATIVE_AI_API_KEY` |
| Ollama (local) | `ollama` | `OLLAMA_HOST`, `OLLAMA_MODEL` |

---

## OCR options

If your documents don't have a text layer (e.g. scanned PDFs), you can enable OCR:

| `OCR_PROVIDER` value | Description |
|---|---|
| *(not set)* | Use the existing text layer only |
| `llm` | Send page images to your vision-capable LLM |
| `azure-document-intelligence` | Azure AI Document Intelligence |
| `docling` | Self-hosted [Docling](https://github.com/DS4SD/docling) server |

---

## Authentication

The web UI is protected by a login screen. paperless-llm does **not** manage its own users — it delegates authentication to your paperless-ngx instance. Use the same username and password you use to log in to paperless-ngx.

A JWT is issued on successful login and is valid for 8 hours.

To secure the API you must set a strong `JWT_SECRET` in your `.env`:

```bash
openssl rand -hex 32
```

Set `AUTH_ENABLED=false` to disable authentication entirely (development only — never expose this publicly).

---

## Configuration reference

All settings are controlled via environment variables in `.env`. Key options:

| Variable | Default | Description |
|---|---|---|
| `PAPERLESS_BASE_URL` | — | URL of your paperless-ngx instance |
| `PAPERLESS_API_TOKEN` | — | paperless-ngx API token |
| `MANUAL_TAG` | `paperless-llm` | Tag to trigger manual review processing |
| `AUTO_TAG` | `paperless-llm-auto` | Tag to trigger fully automatic processing |
| `PROCESSED_TAG` | `paperless-llm-processed` | Tag added after suggestions are applied |
| `LLM_PROVIDER` | — | LLM provider to use |
| `LLM_MODEL` | — | Model name |
| `OCR_PROVIDER` | — | OCR provider (leave unset to skip OCR) |
| `POLL_INTERVAL_SECONDS` | `30` | How often to check for new documents |
| `AUTH_ENABLED` | `true` | Enable/disable login protection |
| `JWT_SECRET` | — | Secret for signing JWTs (min 32 chars, required when auth is enabled) |

See `.env.example` for the full list including per-stage enable/disable toggles.

---

## Contributing

Contributions are welcome! Please open an issue to discuss larger changes before submitting a pull request.

- **Bug reports & feature requests** → [GitHub Issues](../../issues)
- **Pull requests** → target the `main` branch

---

## License

MIT

