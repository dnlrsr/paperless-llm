# LLM Providers

paperless-llm delegates all LLM inference to a configurable backend. Set `LLM_PROVIDER` to select one.

---

## OpenAI

**`LLM_PROVIDER=openai`**

Uses the OpenAI Chat Completions API via the [Vercel AI SDK](https://sdk.vercel.ai/).

```dotenv
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...
```

### Recommended models

| Model | Notes |
|---|---|
| `gpt-4o-mini` | Fast, cheap, good quality — best default choice |
| `gpt-4o` | Higher quality, higher cost |
| `gpt-4-turbo` | Large context window |

### Azure OpenAI

Set `OPENAI_API_TYPE=azure` and point `OPENAI_BASE_URL` to your Azure endpoint:

```dotenv
LLM_PROVIDER=openai
OPENAI_API_TYPE=azure
OPENAI_BASE_URL=https://your-resource.openai.azure.com/openai/deployments/your-deployment
OPENAI_API_KEY=your-azure-key
LLM_MODEL=gpt-4o-mini
```

---

## Anthropic

**`LLM_PROVIDER=anthropic`**

Uses the Anthropic Messages API via the [Vercel AI SDK](https://sdk.vercel.ai/).

```dotenv
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-5-haiku-20241022
ANTHROPIC_API_KEY=sk-ant-...
```

### Recommended models

| Model | Notes |
|---|---|
| `claude-3-5-haiku-20241022` | Fast and affordable |
| `claude-3-5-sonnet-20241022` | Higher quality |
| `claude-3-opus-20240229` | Best quality, highest cost |

---

## Mistral

**`LLM_PROVIDER=mistral`**

Uses the Mistral AI API via the [Vercel AI SDK](https://sdk.vercel.ai/).

```dotenv
LLM_PROVIDER=mistral
LLM_MODEL=mistral-small-latest
MISTRAL_API_KEY=...
```

### Recommended models

| Model | Notes |
|---|---|
| `mistral-small-latest` | Fast and cost-effective |
| `mistral-large-latest` | Higher accuracy |

---

## Google Gemini

**`LLM_PROVIDER=googleai`**

Uses the Google AI (Gemini) API.

```dotenv
LLM_PROVIDER=googleai
LLM_MODEL=gemini-2.0-flash
GOOGLEAI_API_KEY=...
```

### Recommended models

| Model | Notes |
|---|---|
| `gemini-2.0-flash` | Fast and affordable |
| `gemini-1.5-pro` | Large context, higher quality |

---

## Ollama

**`LLM_PROVIDER=ollama`**

Runs a fully local LLM — no cloud API required. Requires a running [Ollama](https://ollama.ai) instance.

```dotenv
LLM_PROVIDER=ollama
LLM_MODEL=llama3.2
OLLAMA_HOST=http://ollama:11434
```

### Docker Compose example (bundled Ollama)

```yaml
services:
  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_data:/root/.ollama
    # For GPU acceleration:
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - driver: nvidia
    #           count: all
    #           capabilities: [gpu]

  paperless-llm:
    image: ghcr.io/dnlrsr/paperless-llm:latest
    environment:
      LLM_PROVIDER: ollama
      LLM_MODEL: llama3.2
      OLLAMA_HOST: http://ollama:11434
    depends_on:
      - ollama

volumes:
  ollama_data:
```

Pull the model before starting (or use the Ollama API):

```bash
docker exec -it ollama ollama pull llama3.2
```

### Recommended models

| Model | Parameters | Notes |
|---|---|---|
| `llama3.2` | 3B | Fast on CPU, good quality |
| `llama3.1` | 8B | Better quality, needs more RAM |
| `qwen2.5` | 7B | Excellent multilingual support |
| `mistral` | 7B | Good for structured output |

### Ollama-specific settings

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_CONTEXT_LENGTH` | _(model default)_ | Override the model's context window |
| `OLLAMA_TEMPERATURE` | _(model default)_ | Generation temperature (0 = deterministic) |
| `OLLAMA_REQUEST_TIMEOUT_SECONDS` | `600` | Per-request timeout (`0` = no timeout) |

### Cold start handling

Ollama must load the model into memory before serving requests. This can take minutes on first run. paperless-llm handles this transparently — see [Ollama Cold Start](../advanced/ollama-cold-start.md) for details.

---

## Separate vision LLM

By default, the OCR stage uses the same provider/model as the main LLM. You can configure a separate, potentially cheaper vision-capable model for OCR:

```dotenv
# Main LLM for metadata generation
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-5-sonnet-20241022
ANTHROPIC_API_KEY=...

# Cheaper vision model for OCR
VISION_LLM_PROVIDER=openai
VISION_LLM_MODEL=gpt-4o-mini
OPENAI_API_KEY=...
```

This only applies when `OCR_PROVIDER=llm`.
