# Analysis

The **Analysis** page lets you send an ad-hoc prompt to the LLM across one or more documents at once. This is useful for cross-document queries, comparisons, or extracting specific information not covered by the standard metadata pipeline.

---

## How to use it

1. Select one or more documents from the list.
2. Write a free-form prompt in the text box.
3. Optionally choose a response language.
4. Click **Analyze**.

The LLM receives the combined text content of all selected documents along with your prompt, and returns a free-text response.

---

## Example prompts

- _"What is the total amount invoiced across these documents?"_
- _"Summarize the key decisions made in these meeting minutes."_
- _"Are there any contradictions between these two contracts?"_
- _"Extract all due dates mentioned in these documents."_

---

## Token limits

If `TOKEN_LIMIT` is set in your configuration, the combined document text is automatically truncated to fit within that limit before being sent to the LLM. This prevents API errors on very large document sets.

---

## Supported documents

Only documents that have an existing text layer (or have been OCR'd) can be analysed. Documents without any content are skipped automatically.
