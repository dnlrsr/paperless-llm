// Document types mirroring the paperless-ngx API

export interface PaperlessDocument {
    id: number;
    title: string;
    content: string;
    tags: number[];
    document_type: number | null;
    correspondent: number | null;
    created: string; // ISO date string
    added: string;
    modified: string;
    original_file_name: string;
    archived_file_name: string | null;
    custom_fields: PaperlessCustomFieldValue[];
}

export interface PaperlessTag {
    id: number;
    name: string;
    slug: string;
    color: string;
    is_inbox_tag: boolean;
}

export interface PaperlessCorrespondent {
    id: number;
    name: string;
    slug: string;
}

export interface PaperlessDocumentType {
    id: number;
    name: string;
    slug: string;
}

export interface PaperlessCustomField {
    id: number;
    name: string;
    data_type: 'string' | 'integer' | 'float' | 'boolean' | 'date' | 'url' | 'monetary' | 'select';
    extra_data?: {
        select_options?: string[];
        default_currency?: string;
    };
}

export interface PaperlessCustomFieldValue {
    field: number;
    value: string | number | boolean | null;
}

export interface PaperlessListResponse<T> {
    count: number;
    next: string | null;
    previous: string | null;
    results: T[];
}
