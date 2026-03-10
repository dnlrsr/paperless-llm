import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────
// App configuration (validated at startup)
// ─────────────────────────────────────────────────────────────────

export const AppConfigSchema = z.object({
    // paperless-ngx connection
    PAPERLESS_BASE_URL: z.string().url('PAPERLESS_BASE_URL must be a valid URL'),
    PAPERLESS_API_TOKEN: z.string().min(1, 'PAPERLESS_API_TOKEN is required'),
    PAPERLESS_PUBLIC_URL: z.string().url().optional(),

    // Processing tags
    MANUAL_TAG: z.string().default('paperless-llm'),
    AUTO_TAG: z.string().default('paperless-llm-auto'),
    AUTO_OCR_TAG: z.string().default('paperless-llm-ocr-auto'),
    PROCESSED_TAG: z.string().default('paperless-llm-processed'),
    OCR_COMPLETE_TAG: z.string().default('paperless-llm-ocr-complete'),

    // LLM configuration
    LLM_PROVIDER: z.enum(['openai', 'ollama', 'anthropic', 'mistral', 'googleai']),
    LLM_MODEL: z.string().min(1),
    LLM_LANGUAGE: z.string().default('English'),
    LLM_REQUESTS_PER_MINUTE: z.coerce.number().int().positive().default(120),
    LLM_MAX_RETRIES: z.coerce.number().int().min(0).default(3),
    TOKEN_LIMIT: z.coerce.number().int().min(0).default(0),

    // LLM provider credentials
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_BASE_URL: z.string().url().optional(),
    OPENAI_API_TYPE: z.enum(['openai', 'azure']).default('openai'),
    ANTHROPIC_API_KEY: z.string().optional(),
    MISTRAL_API_KEY: z.string().optional(),
    GOOGLEAI_API_KEY: z.string().optional(),
    OLLAMA_HOST: z.string().url().optional(),
    OLLAMA_CONTEXT_LENGTH: z.coerce.number().int().min(0).default(0),
    OLLAMA_TEMPERATURE: z.coerce.number().min(0).max(2).optional(),
    // How long to wait for a single Ollama HTTP response (seconds).
    // Increase this when using large models that need time to cold-load.
    // 0 means no timeout (wait forever).
    OLLAMA_REQUEST_TIMEOUT_SECONDS: z.coerce.number().int().min(0).default(600),

    // Vision LLM (for OCR)
    VISION_LLM_PROVIDER: z.enum(['openai', 'ollama', 'anthropic', 'mistral']).optional(),
    VISION_LLM_MODEL: z.string().optional(),
    VISION_LLM_MAX_TOKENS: z.coerce.number().int().positive().optional(),
    VISION_LLM_TEMPERATURE: z.coerce.number().min(0).max(2).optional(),

    // OCR configuration
    OCR_PROVIDER: z.enum(['llm', 'azure', 'google_docai', 'docling']).default('llm'),
    OCR_PROCESS_MODE: z.enum(['image', 'pdf', 'whole_pdf']).default('image'),
    OCR_LIMIT_PAGES: z.coerce.number().int().min(0).default(5),
    PDF_SKIP_EXISTING_OCR: z.coerce.boolean().default(false),

    // Azure Document Intelligence
    AZURE_DOCAI_ENDPOINT: z.string().url().optional(),
    AZURE_DOCAI_KEY: z.string().optional(),
    AZURE_DOCAI_MODEL_ID: z.string().default('prebuilt-read'),
    AZURE_DOCAI_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(120),
    AZURE_DOCAI_OUTPUT_CONTENT_FORMAT: z.enum(['text', 'markdown']).default('text'),

    // Google Document AI
    GOOGLE_PROJECT_ID: z.string().optional(),
    GOOGLE_LOCATION: z.string().optional(),
    GOOGLE_PROCESSOR_ID: z.string().optional(),
    GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

    // Docling
    DOCLING_URL: z.string().url().optional(),
    DOCLING_IMAGE_EXPORT_MODE: z.enum(['embedded', 'placeholder']).default('embedded'),
    DOCLING_OCR_PIPELINE: z.enum(['vlm', 'standard']).default('vlm'),
    DOCLING_OCR_ENGINE: z.string().default('easyocr'),

    // PDF generation features
    PDF_UPLOAD: z.coerce.boolean().default(false),
    PDF_REPLACE: z.coerce.boolean().default(false),
    PDF_COPY_METADATA: z.coerce.boolean().default(true),
    PDF_OCR_TAGGING: z.coerce.boolean().default(true),
    CREATE_LOCAL_PDF: z.coerce.boolean().default(false),
    LOCAL_PDF_PATH: z.string().default('/app/pdf'),
    CREATE_LOCAL_HOCR: z.coerce.boolean().default(false),
    LOCAL_HOCR_PATH: z.string().default('/app/hocr'),

    // Auto-generation flags
    MANUAL_AUTO_GENERATE: z.coerce.boolean().default(true),
    AUTO_GENERATE_TITLE: z.coerce.boolean().default(true),
    AUTO_GENERATE_TAGS: z.coerce.boolean().default(true),
    AUTO_GENERATE_CORRESPONDENTS: z.coerce.boolean().default(true),
    AUTO_GENERATE_DOCUMENT_TYPE: z.coerce.boolean().default(true),
    AUTO_GENERATE_CREATED_DATE: z.coerce.boolean().default(true),
    AUTO_GENERATE_CUSTOM_FIELDS: z.coerce.boolean().default(false),

    // Restrict suggestions to items that already exist in paperless-ngx
    USE_EXISTING_DATA_ONLY: z.coerce.boolean().default(true),

    CORRESPONDENT_BLACK_LIST: z
        .string()
        .transform((val) => val.split(',').map((s) => s.trim()).filter(Boolean))
        .default(''),

    // Auth
    AUTH_ENABLED: z.coerce.boolean().default(true),
    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters').optional(),

    // Server
    PORT: z.coerce.number().int().positive().default(8080),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),
    DATABASE_URL: z.string().default('file:./data/paperless-llm.db'),
    POLL_INTERVAL_SECONDS: z.coerce.number().int().positive().default(30),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
