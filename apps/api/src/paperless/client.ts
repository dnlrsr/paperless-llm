/**
 * paperless-ngx API client — SRP: encapsulates all paperless-ngx communication.
 * DIP: routes and jobs depend on this interface, not on axios directly.
 */
import type {
    AppConfig,
    DocumentSuggestions,
    PaperlessCorrespondent,
    PaperlessDocument,
    PaperlessDocumentType,
    PaperlessListResponse,
    PaperlessTag,
} from '@paperless-llm/shared';
import axios, { type AxiosInstance } from 'axios';
import { getLogger } from '../config/logger.js';

export class PaperlessClient {
    private readonly http: AxiosInstance;
    private readonly baseUrl: string;

    constructor(config: Pick<AppConfig, 'PAPERLESS_BASE_URL' | 'PAPERLESS_API_TOKEN'>) {
        this.baseUrl = config.PAPERLESS_BASE_URL;
        this.http = axios.create({
            baseURL: `${config.PAPERLESS_BASE_URL}/api`,
            headers: {
                Authorization: `Token ${config.PAPERLESS_API_TOKEN}`,
                'Content-Type': 'application/json',
            },
            timeout: 30_000,
        });
    }

    // ─── Documents ────────────────────────────────────────────────────

    async getDocumentsByTag(tagId: number): Promise<PaperlessDocument[]> {
        const results: PaperlessDocument[] = [];
        let url = `/documents/?tags__id=${tagId}&page_size=100`;
        while (url) {
            const res = await this.http.get<PaperlessListResponse<PaperlessDocument>>(url);
            results.push(...res.data.results);
            url = res.data.next ? res.data.next.replace(this.baseUrl + '/api', '') : '';
        }
        return results;
    }

    async getDocument(id: number): Promise<PaperlessDocument> {
        const res = await this.http.get<PaperlessDocument>(`/documents/${id}/`);
        return res.data;
    }

    async downloadDocument(id: number): Promise<Uint8Array> {
        const res = await this.http.get<ArrayBuffer>(`/documents/${id}/download/`, {
            responseType: 'arraybuffer',
        });
        return new Uint8Array(res.data);
    }

    async updateDocument(
        id: number,
        updates: Partial<{
            title: string;
            tags: number[];
            correspondent: number | null;
            document_type: number | null;
            created: string;
            custom_fields: Array<{ field: number; value: unknown }>;
        }>,
    ): Promise<PaperlessDocument> {
        const res = await this.http.patch<PaperlessDocument>(`/documents/${id}/`, updates);
        return res.data;
    }

    async uploadDocument(pdfBuffer: Uint8Array, filename: string): Promise<number> {
        const formData = new FormData();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const blob = new Blob([pdfBuffer as unknown as BlobPart], { type: 'application/pdf' });
        formData.append('document', blob, filename);

        const res = await this.http.post<{ task_id: string }>('/documents/post_document/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        // Poll for the document ID
        const taskId = res.data.task_id;
        return this.pollTaskForDocumentId(taskId);
    }

    async deleteDocument(id: number): Promise<void> {
        await this.http.delete(`/documents/${id}/`);
    }

    // ─── Tags ──────────────────────────────────────────────────────────

    async getTags(): Promise<PaperlessTag[]> {
        return this.fetchAll<PaperlessTag>('/tags/');
    }

    async getTagByName(name: string): Promise<PaperlessTag | null> {
        const tags = await this.getTags();
        return tags.find((t) => t.name === name) ?? null;
    }

    async ensureTag(name: string): Promise<PaperlessTag> {
        const existing = await this.getTagByName(name);
        if (existing) return existing;
        const res = await this.http.post<PaperlessTag>('/tags/', { name });
        return res.data;
    }

    // ─── Correspondents ────────────────────────────────────────────────

    async getCorrespondents(): Promise<PaperlessCorrespondent[]> {
        return this.fetchAll<PaperlessCorrespondent>('/correspondents/');
    }

    async ensureCorrespondent(name: string): Promise<PaperlessCorrespondent> {
        const existing = (await this.getCorrespondents()).find((c) => c.name === name);
        if (existing) return existing;
        const res = await this.http.post<PaperlessCorrespondent>('/correspondents/', { name });
        return res.data;
    }

    // ─── Document Types ────────────────────────────────────────────────

    async getDocumentTypes(): Promise<PaperlessDocumentType[]> {
        return this.fetchAll<PaperlessDocumentType>('/document_types/');
    }

    async ensureDocumentType(name: string): Promise<PaperlessDocumentType> {
        const existing = (await this.getDocumentTypes()).find((dt) => dt.name === name);
        if (existing) return existing;
        const res = await this.http.post<PaperlessDocumentType>('/document_types/', { name });
        return res.data;
    }

    async applySuggestions(doc: PaperlessDocument, suggestions: Partial<DocumentSuggestions>): Promise<PaperlessDocument> {
        const log = getLogger();
        const updates: Parameters<PaperlessClient['updateDocument']>[1] = {};

        if (suggestions.title) updates.title = suggestions.title;

        if (suggestions.tags) {
            const tagEntities = await Promise.all(suggestions.tags.map((n) => this.ensureTag(n)));
            updates.tags = tagEntities.map((t) => t.id);
        }

        if ('correspondent' in suggestions) {
            if (suggestions.correspondent) {
                const entity = await this.ensureCorrespondent(suggestions.correspondent);
                updates.correspondent = entity.id;
            } else {
                updates.correspondent = null;
            }
        }

        if ('documentType' in suggestions) {
            if (suggestions.documentType) {
                const entity = await this.ensureDocumentType(suggestions.documentType);
                updates.document_type = entity.id;
            } else {
                updates.document_type = null;
            }
        }

        if (suggestions.createdDate) {
            updates.created = suggestions.createdDate;
        }

        if (suggestions.customFields) {
            updates.custom_fields = suggestions.customFields;
        }

        log.info({ documentId: doc.id, updates }, 'Applying suggestions to paperless-ngx');
        return this.updateDocument(doc.id, updates);
    }

    // ─── Connection Check ──────────────────────────────────────────────

    async ping(): Promise<boolean> {
        try {
            await this.http.get('/documents/?page_size=1');
            return true;
        } catch {
            return false;
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────

    private async fetchAll<T>(path: string): Promise<T[]> {
        const results: T[] = [];
        let url = `${path}?page_size=500`;
        while (url) {
            const res = await this.http.get<PaperlessListResponse<T>>(url);
            results.push(...res.data.results);
            url = res.data.next ? res.data.next.replace(this.baseUrl + '/api', '') : '';
        }
        return results;
    }

    private async pollTaskForDocumentId(taskId: string, maxWaitMs = 60_000): Promise<number> {
        const start = Date.now();
        while (Date.now() - start < maxWaitMs) {
            await sleep(2000);
            const res = await this.http.get<{ status: string; related_document: number | null }>(
                `/tasks/?task_id=${taskId}`,
            );
            const task = Array.isArray(res.data) ? res.data[0] : null;
            if (task?.status === 'SUCCESS' && task.related_document != null) {
                return task.related_document;
            }
            if (task?.status === 'FAILURE') {
                throw new Error(`Document upload task failed: ${taskId}`);
            }
        }
        throw new Error('Document upload polling timeout');
    }
}

function sleep(ms: number) {
    return new Promise<void>((r) => setTimeout(r, ms));
}
