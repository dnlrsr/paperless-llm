# Dashboard

The Dashboard gives you an at-a-glance view of your paperless-llm instance.

---

## System status

The top section shows the health of all connected services:

| Check | What it tests |
|---|---|
| **paperless-ngx** | API reachability and token validity |
| **Redis** | Queue backend connectivity |
| **Database** | Local SQLite availability |
| **Ollama** | Model availability (only shown when `LLM_PROVIDER=ollama`) |

A green badge means the check passed. A yellow or red badge indicates a problem — hover over it for details, or check the [Job Monitor](jobs.md) and container logs.

---

## Active jobs

The dashboard shows a live count of jobs currently running or waiting in the queue. Click **View all jobs** to open the full [Job Monitor](jobs.md).

---

## Ollama warmup indicator

When using Ollama, a warmup state indicator appears on the dashboard. Ollama must load the model into memory before it can process requests. States:

| State | Meaning |
|---|---|
| `idle` | No warmup requested yet |
| `warming` | Model is loading — jobs will wait |
| `ready` | Model is ready to serve requests |
| `error` | Warmup timed out — check Ollama logs |

The indicator updates in real time via Server-Sent Events. See [Ollama Cold Start](../advanced/ollama-cold-start.md) for details.
