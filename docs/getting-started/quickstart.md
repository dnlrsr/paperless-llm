# Quickstart

This guide gets paperless-llm running alongside an existing paperless-ngx instance in about five minutes.

## Prerequisites

- Docker and Docker Compose installed
- A running paperless-ngx instance (local or remote)
- An API key for at least one LLM provider (or a local Ollama installation)

---

## 1. Create the environment file

Download the example and fill in the required values:

```bash
curl -O https://raw.githubusercontent.com/dnlrsr/paperless-llm/main/.env.example
cp .env.example .env
```

Open `.env` and set the minimum required variables:

```dotenv
# URL of your paperless-ngx instance (reachable from the Docker network)
PAPERLESS_BASE_URL=http://paperless-ngx:8000

# A paperless-ngx API token (Profile → API Token in the paperless-ngx UI)
PAPERLESS_API_TOKEN=your_paperless_api_token_here

# LLM backend — openai | anthropic | mistral | ollama | googleai
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini

# API key for the chosen provider
OPENAI_API_KEY=sk-...

# Secret used to sign JWT tokens — at least 32 random characters
JWT_SECRET=change_me_to_a_long_random_string_please
```

!!! tip "Generating a JWT secret"
    ```bash
    openssl rand -hex 32
    ```

---

## 2. Create `docker-compose.yml`

```yaml
services:
  paperless-llm:
    image: ghcr.io/dnlrsr/paperless-llm:latest
    ports:
      - "3000:80"
    env_file: .env
    volumes:
      - db_data:/app/data
      - prompts_data:/app/prompts
    restart: unless-stopped

volumes:
  db_data:
  prompts_data:
```

!!! note "Connecting to paperless-ngx"
    If your paperless-ngx is in a separate Docker Compose project, add it to the same network or reference it by its host IP / hostname.  
    Set `PAPERLESS_BASE_URL` to a URL reachable **from inside the paperless-llm container**.

---

## 3. Start the service

```bash
docker compose up -d
```

Open **http://localhost:3000** in your browser and log in with your paperless-ngx credentials.

---

## 4. Tag your first document

1. In paperless-ngx, find any document.
2. Add the tag **`paperless-llm`** to it.
3. Within 30 seconds (default poll interval), the document appears in the **Documents** tab of paperless-llm.
4. Click **Generate** to trigger the LLM pipeline, then review the suggestions.
5. Click **Apply** — the metadata is written back to paperless-ngx.

---

## Next steps

- [Configure all available options](configuration.md)
- [Understand the full workflow](../user-guide/workflow.md)
- [Set up Ollama for local processing](../providers/llm-providers.md#ollama)
- [Enable auto-processing (no review required)](../advanced/auto-processing.md)
