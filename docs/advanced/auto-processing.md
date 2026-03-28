# Auto-Processing

paperless-llm supports a fully automatic mode that generates **and** applies metadata without any manual review step. This is useful for high-volume workflows where you trust the LLM's output or want to process a backlog quickly.

---

## How it works

Instead of the `paperless-llm` manual review tag, tag a document with the **auto tag** (`paperless-llm-auto` by default):

```
paperless-llm-auto  →  LLM pipeline runs  →  metadata applied automatically
```

No suggestions are stored for review. The metadata is written directly to paperless-ngx once the pipeline completes, and the `paperless-llm-processed` tag is added.

---

## Enabling auto-processing

Auto-processing is always available — just tag documents with `AUTO_TAG`. You can rename the tag via environment variable:

```dotenv
AUTO_TAG=ai-auto-process
```

---

## Controlling which fields are generated

In auto mode, you can disable individual metadata fields to avoid overwriting existing data:

```dotenv
AUTO_GENERATE_TITLE=true          # Generate and apply title
AUTO_GENERATE_TAGS=true           # Generate and apply tags
AUTO_GENERATE_CORRESPONDENTS=true # Generate and apply correspondent
AUTO_GENERATE_DOCUMENT_TYPE=true  # Generate and apply document type
AUTO_GENERATE_CREATED_DATE=true   # Generate and apply created date
AUTO_GENERATE_CUSTOM_FIELDS=false # Custom fields off by default
```

Fields set to `false` are skipped entirely — the existing paperless-ngx value is preserved.

!!! note "Summary in auto mode"
    The summary stage is **never** run in auto mode — it is opt-in only via explicit stage selection on the manual Generate dialog.

---

## Auto-generate on manual tag

The `MANUAL_AUTO_GENERATE` setting controls whether generation starts automatically when a document appears in the manual review queue:

```dotenv
MANUAL_AUTO_GENERATE=true   # Start generation immediately (default)
MANUAL_AUTO_GENERATE=false  # Wait for the user to click Generate in the UI
```

When `true`, the document is processed as soon as it is detected, but suggestions are still saved for review — nothing is applied until you click Apply.

---

## OCR-only auto mode

Tag a document with the OCR tag (`paperless-llm-ocr` by default) to run OCR **without** metadata generation:

```dotenv
AUTO_OCR_TAG=paperless-llm-ocr
```

This downloads the document, runs the configured OCR provider, and optionally uploads the processed PDF back to paperless-ngx (see [PDF Features](pdf-features.md)).

---

## Bulk processing a backlog

To process a large number of existing documents automatically:

1. In paperless-ngx, use the bulk tag editor to add `paperless-llm-auto` to the documents you want processed.
2. paperless-llm will pick them up in batches on each poll cycle (every `POLL_INTERVAL_SECONDS` seconds).
3. Monitor progress in the [Job Monitor](../user-guide/jobs.md).

!!! warning "Rate limits"
    When processing many documents, you may hit LLM API rate limits. Use `LLM_REQUESTS_PER_MINUTE` to throttle the request rate, and ensure `LLM_MAX_RETRIES` is set high enough to absorb transient 429 errors.

    ```dotenv
    LLM_REQUESTS_PER_MINUTE=30
    LLM_MAX_RETRIES=5
    ```
