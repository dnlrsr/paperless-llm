# Custom Prompts

paperless-llm uses [Handlebars](https://handlebarsjs.com/) templates to build the prompts sent to the LLM. All templates can be customized directly in the UI — changes take effect immediately without restarting the service.

---

## Managing templates

Open the **Prompts** page from the sidebar. You will see a list of all available templates:

| Template | Used by |
|---|---|
| `title` | Title stage |
| `tags` | Tags stage |
| `correspondent` | Correspondent stage |
| `document-type` | Document type stage |
| `created-date` | Created date stage |
| `summary` | Summary stage |
| `ocr` | OCR stage (LLM Vision provider) |

Templates marked **custom** have been modified from the built-in defaults. Click the badge to see the diff.

---

## Editing a template

1. Click the template name.
2. Edit the Handlebars source in the editor.
3. Click **Save**.

The template is saved to the persistent `prompts` volume (`/app/prompts/{name}.hbs`) and hot-reloaded into memory immediately.

---

## Resetting to defaults

Click **Reset to default** on any template to revert to the built-in version. Your edits are overwritten.

---

## Template variables

Each template receives a specific set of Handlebars variables depending on which stage it belongs to.

### `title`

| Variable | Type | Description |
|---|---|---|
| `Content` | string | Extracted document text |
| `Title` | string | Current (possibly garbled) title from paperless-ngx |
| `Language` | string | Value of `LLM_LANGUAGE` (defaults to `English`); only affects output if templates reference it |

### `tags`

| Variable | Type | Description |
|---|---|---|
| `Content` | string | Extracted document text |
| `Title` | string | Current document title |
| `AvailableTags` | string[] | All tags in paperless-ngx |
| `OriginalTags` | string[] | Tags currently on the document |
| `UseExistingOnly` | boolean | Whether to restrict to existing tags |
| `Language` | string | Language override |

### `correspondent`

| Variable | Type | Description |
|---|---|---|
| `Content` | string | Extracted document text |
| `Title` | string | Current document title |
| `AvailableCorrespondents` | string[] | All correspondents in paperless-ngx |
| `BlackList` | string[] | Names from `CORRESPONDENT_BLACK_LIST` |
| `UseExistingOnly` | boolean | Whether to restrict to existing correspondents |
| `Language` | string | Language override |

### `document-type`

| Variable | Type | Description |
|---|---|---|
| `Content` | string | Extracted document text |
| `Title` | string | Current document title |
| `AvailableDocumentTypes` | string[] | All document types in paperless-ngx |
| `UseExistingOnly` | boolean | Whether to restrict to existing types |
| `Language` | string | Language override |

### `created-date`

| Variable | Type | Description |
|---|---|---|
| `Content` | string | Extracted document text |
| `Title` | string | Current document title |
| `Language` | string | Language override |

### `summary`

| Variable | Type | Description |
|---|---|---|
| `Content` | string | Extracted document text |
| `Title` | string | Current document title |
| `Language` | string | Language override |

### `ocr`

| Variable | Type | Description |
|---|---|---|
| _(none)_ | — | The prompt is sent with the image directly |

---

## Writing effective prompts

A few guidelines for customizing templates:

- **Be explicit about output format.** Each stage parser expects a specific output:
    - Title / correspondent / document-type / created-date: plain text only (no explanation)
    - Tags: a JSON array, e.g. `["Invoice", "Tax"]`
    - Created date: `YYYY-MM-DD` or `"null"`
    - Summary: 2–4 sentences of plain text

- **Use `{{#if UseExistingOnly}}` blocks** to give the LLM different instructions depending on the restriction setting.

- **Keep prompts concise.** Long system prompts consume more tokens and can confuse smaller models.

- **Test with different documents.** A prompt that works well for invoices may perform poorly on contracts.

---

## Example: stricter title prompt

```handlebars
You are a document management assistant.
Generate a concise title for the document below.

Rules:
- Maximum 6 words
- Use the document's own language
- No dates, IDs, or generic words like "document" or "letter"
- Return only the title, nothing else

{{#if Title}}Current title: {{Title}}{{/if}}

Content:
{{Content}}
```
