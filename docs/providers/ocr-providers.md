# OCR Providers

Many documents in paperless-ngx arrive as scanned PDFs without a text layer. paperless-llm can extract text from these documents using a configurable OCR backend. Set `OCR_PROVIDER` to select one.

!!! note "When is OCR triggered?"
    OCR only runs when explicitly requested — either by tagging a document with `AUTO_OCR_TAG`, or by selecting the OCR stage on the Generate dialog. Documents that already have a text layer in paperless-ngx are processed without OCR by default.

---

## Process modes

All OCR providers receive a `mode` that controls how the PDF is sliced before processing:

| Mode | Description |
|---|---|
| `image` | Convert each page to a JPEG image, process pages individually |
| `pdf` | Pass the raw PDF bytes, process pages individually |
| `whole_pdf` | Pass the entire PDF as one unit (not all providers support this) |

Set with `OCR_PROCESS_MODE`. The `image` mode is the most broadly compatible.

---

## LLM Vision (default)

**`OCR_PROVIDER=llm`**

Uses a vision-capable LLM to transcribe each page. No additional infrastructure required beyond your LLM provider.

```dotenv
OCR_PROVIDER=llm
# Optionally override with a dedicated vision model:
VISION_LLM_PROVIDER=openai
VISION_LLM_MODEL=gpt-4o-mini
```

**Supported modes:** `image` only

**How it works:** Each PDF page is converted to a JPEG and sent to the vision LLM along with the `ocr` prompt template. You can customize the transcription instructions in the [Prompts editor](../user-guide/prompts.md).

**Pros:**
- No extra services to run
- Good handwriting and complex layout support
- Follows explicit instructions (e.g. ignore stamps, focus on body text)

**Cons:**
- Slower than dedicated OCR services
- Costs LLM API credits per page
- Requires a vision-capable model

---

## Azure Document Intelligence

**`OCR_PROVIDER=azure`**

Submits the PDF to [Azure AI Document Intelligence](https://learn.microsoft.com/en-us/azure/ai-services/document-intelligence/) (formerly Form Recognizer).

```dotenv
OCR_PROVIDER=azure
AZURE_DOCAI_ENDPOINT=https://your-resource.cognitiveservices.azure.com/
AZURE_DOCAI_KEY=your-key-here
AZURE_DOCAI_MODEL_ID=prebuilt-read
```

**Supported modes:** `image`

**Settings:**

| Variable | Default | Description |
|---|---|---|
| `AZURE_DOCAI_MODEL_ID` | `prebuilt-read` | Model used for analysis |
| `AZURE_DOCAI_TIMEOUT_SECONDS` | `120` | Polling timeout waiting for results |
| `AZURE_DOCAI_OUTPUT_CONTENT_FORMAT` | `text` | `text` or `markdown` — `markdown` preserves tables |

**Pros:**
- High accuracy on structured documents (invoices, forms)
- Handles complex layouts and tables well (especially with `markdown` output)
- No GPU required

**Cons:**
- Requires an Azure account and resource
- Costs per page processed

---

## Google Document AI

**`OCR_PROVIDER=google_docai`**

Uses [Google Cloud Document AI](https://cloud.google.com/document-ai) for OCR.

```dotenv
OCR_PROVIDER=google_docai
GOOGLE_PROJECT_ID=my-gcp-project
GOOGLE_LOCATION=us
GOOGLE_PROCESSOR_ID=your-processor-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

!!! warning "Not yet fully implemented"
    Google Document AI support is present in the configuration but the provider implementation is incomplete in the current release. Use an alternative OCR provider.

---

## Docling

**`OCR_PROVIDER=docling`**

Uses a self-hosted [Docling](https://github.com/DS4SD/docling) server. Docling is an open-source document processing library that runs entirely on your own infrastructure.

```dotenv
OCR_PROVIDER=docling
DOCLING_URL=http://docling:5001
```

**Supported modes:** `image`, `pdf`, `whole_pdf`

**Docker Compose example:**

```yaml
services:
  docling:
    image: ds4sd/docling-serve:latest
    ports:
      - "5001:5001"

  paperless-llm:
    image: ghcr.io/dnlrsr/paperless-llm:latest
    environment:
      OCR_PROVIDER: docling
      DOCLING_URL: http://docling:5001
```

**Settings:**

| Variable | Default | Description |
|---|---|---|
| `DOCLING_IMAGE_EXPORT_MODE` | `embedded` | `embedded` includes images inline; `placeholder` replaces them with markers |
| `DOCLING_OCR_PIPELINE` | `standard` | `standard` (rule-based OCR) or `vlm` (vision LLM) |
| `DOCLING_OCR_ENGINE` | `easyocr` | OCR engine used by Docling internally |

**Pros:**
- Fully local — no cloud API calls
- Supports all process modes including `whole_pdf`
- Good table extraction with Markdown output

**Cons:**
- Requires running a separate service
- Slower than cloud APIs without GPU

---

## Skipping OCR on documents with existing text

Set `PDF_SKIP_EXISTING_OCR=true` to automatically skip OCR processing when the PDF already contains a readable text layer. This saves time and cost on documents that were already processed.

```dotenv
PDF_SKIP_EXISTING_OCR=true
```

---

## Limiting pages

`OCR_LIMIT_PAGES` controls how many pages are OCR'd per document (default: 5). For most metadata generation tasks, the first few pages contain all the relevant information (date, correspondent, subject). Increase or remove this limit for full-document transcription.

```dotenv
OCR_LIMIT_PAGES=10   # Process up to 10 pages
OCR_LIMIT_PAGES=0    # No limit — process all pages
```
