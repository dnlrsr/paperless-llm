# Reviewing Documents

The **Documents** page lists all documents that are tagged with your manual review tag (`paperless-llm` by default) and are awaiting review.

---

## Document list

Each row shows:

- Document title (from paperless-ngx)
- Document ID
- Status indicator — whether suggestions are pending, being generated, or not yet started
- A **Generate** button and an **Open in paperless-ngx** link

---

## Generating suggestions

Click **Generate** on a document to start the LLM pipeline. You can customize the run in the dialog:

### Stage selection

By default, all enabled stages run. You can deselect stages to skip them for this particular document:

- Title
- Tags
- Correspondent
- Document type
- Created date
- Summary _(off by default — opt-in required)_

### Use existing items only

When enabled (the default), the LLM is instructed to only suggest tags, correspondents, and document types that **already exist** in your paperless-ngx instance. This prevents the LLM from inventing new values.

You can flip the global default in [Settings](settings.md), or override it per-document here.

---

## Reviewing suggestions

Once generation completes, suggestions appear as an editable form:

| Field | Type | Notes |
|---|---|---|
| **Title** | Text input | Edit freely before applying |
| **Tags** | Tag chips | Add or remove individual tags |
| **Correspondent** | Text input | Single name |
| **Document type** | Text input | Single type name |
| **Created date** | Date input | YYYY-MM-DD format |
| **Summary** | Text area | Only shown when generated |

All fields are pre-populated with the LLM's suggestions. You can:

- **Accept as-is** — click Apply
- **Edit any field** — change the value, then click Apply  
- **Discard** — ignore the suggestions; the document stays tagged for later

!!! tip "Partial application"
    You can leave fields empty before applying — only non-empty fields are written back to paperless-ngx.

---

## Applying suggestions

Click **Apply** to:

1. Write the reviewed metadata to paperless-ngx
2. Remove the `paperless-llm` tag
3. Add the `paperless-llm-processed` tag
4. Remove the document from the review list

---

## Regenerating

If you want fresh suggestions after discarding, simply remove the `paperless-llm-processed` tag and re-add `paperless-llm` in paperless-ngx — then click **Generate** again.

---

## Real-time progress

While the pipeline runs, a progress bar updates in real time via Server-Sent Events. Each stage (OCR → Title → Tags → …) advances the bar as it completes.
