# PDF Features

After OCR processing, paperless-llm can optionally upload the processed PDF (with a text layer embedded) back to paperless-ngx, and/or save it to a local path.

---

## Upload OCR'd PDF to paperless-ngx

Set `PDF_UPLOAD=true` to upload the OCR-processed PDF back to paperless-ngx after the OCR stage completes.

```dotenv
PDF_UPLOAD=true
```

By default this creates a **new document** in paperless-ngx with the OCR'd content. To replace the original document's file instead, also set:

```dotenv
PDF_REPLACE=true
```

!!! warning "`PDF_REPLACE=true` is irreversible"
    Replacing the original PDF file cannot be undone from within paperless-llm. Ensure you have paperless-ngx backups before enabling this option.

---

## Copy metadata to uploaded PDF

When uploading a new PDF document, you can copy the original document's metadata (title, tags, correspondent, etc.) to the new document automatically:

```dotenv
PDF_COPY_METADATA=true
```

This is particularly useful when `PDF_REPLACE=false` so that the new OCR'd document inherits the same metadata as the original.

---

## Tag the document after OCR upload

Apply a tag to the document after a successful OCR PDF upload:

```dotenv
PDF_OCR_TAGGING=true
OCR_COMPLETE_TAG=paperless-llm-ocr-done
```

This makes it easy to filter documents that have been OCR-processed in paperless-ngx.

---

## Save PDF locally

You can save the OCR'd PDF to a directory on the host filesystem (via a volume mount):

```dotenv
CREATE_LOCAL_PDF=true
LOCAL_PDF_PATH=/app/output/pdfs
```

Mount the path in your Docker Compose file:

```yaml
volumes:
  - ./ocr-output:/app/output/pdfs
```

---

## Save hOCR XML locally

Some OCR providers (Azure Document Intelligence, Docling) produce [hOCR](https://kba.github.io/hocr-spec/) XML alongside the text — a structured format that includes bounding boxes for every word. Save it locally with:

```dotenv
CREATE_LOCAL_HOCR=true
LOCAL_HOCR_PATH=/app/output/hocr
```

---

## Typical workflow: scan → OCR → Metadata

A common pattern for scanned documents:

1. Drop scanned PDF into paperless-ngx (consume directory or upload).
2. Tag it with `paperless-llm-ocr` — OCR runs automatically, text layer is embedded and uploaded back.
3. Tag the OCR'd document with `paperless-llm` — LLM generates metadata from the real text.
4. Review and apply.

```dotenv
# OCR settings
OCR_PROVIDER=azure
AZURE_DOCAI_ENDPOINT=https://...
AZURE_DOCAI_KEY=...
PDF_UPLOAD=true
PDF_COPY_METADATA=true
PDF_OCR_TAGGING=true
OCR_COMPLETE_TAG=ocr-done
PDF_SKIP_EXISTING_OCR=true
```
