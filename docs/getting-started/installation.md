# Installation

## Docker image

The official image is published to GitHub Container Registry:

```
ghcr.io/dnlrsr/paperless-llm:latest
```

The image runs both the API (Node.js / Fastify) and the web UI (nginx) in a single container managed by **s6-overlay**. Port **80** is exposed inside the container; map it to any host port you prefer (e.g. `3000:80`).

---

## Volumes

| Mount path | Purpose |
|---|---|
| `/app/data` | SQLite database (jobs, suggestions, audit log, settings) |
| `/app/prompts` | User-customized Handlebars prompt templates |

Both volumes are optional on the first run (the container bootstraps itself), but **mount them for persistence** so data survives container upgrades.

```yaml
volumes:
  - db_data:/app/data
  - prompts_data:/app/prompts
```

---

## Docker Compose — standalone (with paperless-ngx)

The repository ships a full `docker-compose.yml` that starts:

- **redis** (BullMQ queue backend)
- **postgres** (paperless-ngx database)
- **paperless-ngx**
- **paperless-llm** (with local build)

To use it for development:

```bash
git clone https://github.com/dnlrsr/paperless-llm.git
cd paperless-llm
cp .env.example .env   # fill in your values
docker compose up -d
```

---

## Docker Compose — alongside an existing paperless-ngx

If you already have a running paperless-ngx instance, use a minimal compose file:

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

Point `PAPERLESS_BASE_URL` to the URL of your existing paperless-ngx, reachable from inside this container.

---

## Networking

paperless-llm must be able to reach:

1. **paperless-ngx** — for polling tagged documents, fetching metadata lists, and writing results back. Set via `PAPERLESS_BASE_URL`.
2. **Redis** — for the BullMQ job queue. Set via `REDIS_URL` (defaults to `redis://localhost:6379`).
3. **Your LLM provider** — outbound HTTPS to OpenAI / Anthropic / Mistral / Google, or inbound to your Ollama/Docling host.

### Reverse proxy

If you put paperless-llm behind a reverse proxy (nginx, Caddy, Traefik, etc.), the web UI and the API both live at the same origin on port 80 inside the container. No base-path configuration is required.

---

## Environment variables

See the full [Environment Variables reference](configuration.md) for every available option.

---

## Upgrading

```bash
docker compose pull paperless-llm
docker compose up -d paperless-llm
```

The SQLite database schema is managed via Drizzle ORM and migrates automatically on startup.
