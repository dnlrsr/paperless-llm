# Settings

The **Settings** page controls display preferences and the global behaviour of the suggestion pipeline.

---

## Language

Switch the UI language between **English** and **German**. The setting is stored in the browser and applies immediately without a page reload.

!!! note "Document language"
    The UI language is separate from the language used in LLM prompts. By default, document language for prompts is detected automatically from the content. The `LLM_LANGUAGE` environment variable overrides this (defaulting to `English`), but it only affects LLM responses if your prompt templates explicitly reference the `Language` variable. The built-in templates do not use it — customise your templates if you need language-specific output.

---

## Page size

Choose how many items to display per page in the Documents and Jobs lists:

- 10
- 25 _(default)_
- 50
- 100

---

## Use existing items only

This global toggle controls whether suggestions are restricted to tags, correspondents, and document types that **already exist** in your paperless-ngx instance.

| Setting | Behaviour |
|---|---|
| **On** (default) | LLM only picks from your existing lists. No new tags/correspondents/types are created. |
| **Off** | LLM may suggest new values not yet in paperless-ngx. These are created automatically when you apply. |

This setting affects all jobs triggered from the UI. You can also override it per-document on the Generate dialog.

---

## System info

The bottom of the Settings page shows a live snapshot of service health:

| Item | Description |
|---|---|
| **Version** | Current paperless-llm version |
| **Status** | `ok` (all checks pass) or `degraded` (at least one check failing) |
| **Checks** | Per-service status badges (paperless-ngx, Redis, database, Ollama) |

This data is fetched from the `/api/health` endpoint. Refresh the page to update it.
