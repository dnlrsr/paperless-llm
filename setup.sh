#!/usr/bin/env bash
set -euo pipefail

COMPOSE="docker compose"
ENV_FILE=".env"

echo "==> Starting infrastructure (redis, postgres, paperless-ngx, ollama)..."
$COMPOSE up -d redis postgres gotenberg tika ollama

echo "==> Waiting for paperless-ngx to be ready (this may take a minute)..."
$COMPOSE up -d paperless-ngx
timeout 180 bash -c 'until curl -sf http://localhost:8001/api/ > /dev/null 2>&1; do echo " waiting..."; sleep 5; done'
echo "    paperless-ngx is up!"

echo "==> Fetching API token for admin user..."
TOKEN=$(curl -sf -X POST http://localhost:8001/api/token/ \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [[ -z "$TOKEN" ]]; then
  echo "ERROR: Could not fetch token. Is paperless-ngx fully started?"
  exit 1
fi

echo "    Token obtained."

# Update .env
sed -i "s|^PAPERLESS_API_TOKEN=.*|PAPERLESS_API_TOKEN=$TOKEN|" "$ENV_FILE"
echo "    .env updated with real token."

echo "==> Starting paperless-llm API and Web..."
$COMPOSE up -d api web

echo ""
echo "All services are running:"
echo "  Paperless-ngx  →  http://localhost:8001  (admin / admin)"
echo "  paperless-llm  →  http://localhost:3000"
echo "  API health     →  http://localhost:8080/api/health"
echo "  Ollama         →  http://localhost:11434"
echo ""
echo "Note: Ollama will pull llama3.2 in the background (ollama-init container)."
echo "      Run 'docker compose logs -f ollama-init' to track progress."
