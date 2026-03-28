# Job Monitor

The **Jobs** page shows all processing jobs — active, completed, and failed.

---

## Job types

| Type | Description |
|---|---|
| `metadata` | Full LLM pipeline run (title, tags, correspondent, etc.) |
| `ocr` | OCR-only run — extracts text without generating metadata |
| `analysis` | Ad-hoc analysis query from the Analysis page |

---

## Job states

| State | Meaning |
|---|---|
| `waiting` | Queued, not yet picked up by a worker |
| `active` | Currently processing |
| `completed` | Finished successfully |
| `failed` | Encountered an error — see the error message |
| `delayed` | Scheduled to retry after a back-off delay |

---

## Real-time progress

Active jobs display a progress bar that updates in real time via Server-Sent Events. The progress reflects which pipeline stage is currently running:

- 0–15%: Setup (fetching document data, downloading PDF)
- 15–85%: Pipeline stages (each stage gets an equal share)
- 85–100%: Finalisation (saving suggestions to database)

---

## Failed jobs

If a job fails, the error message is shown in the job row. Common causes:

| Error | Likely cause |
|---|---|
| LLM provider error / rate limit | API key invalid, quota exceeded, or rate limit hit |
| Connection error | paperless-ngx or LLM provider unreachable |
| OCR timeout | Document too large or OCR service overloaded |
| Ollama error | Model not loaded — see [Ollama Cold Start](../advanced/ollama-cold-start.md) |

Failed jobs are **not** automatically retried after the queue drains (BullMQ retries transient errors a limited number of times — currently up to 3 attempts per job — before marking the job as failed). If a job permanently fails, you can re-trigger it by clicking **Generate** on the document again.

---

## Filtering and pagination

Use the status filter buttons to show only jobs of a specific state. The page size can be adjusted in [Settings](settings.md).
