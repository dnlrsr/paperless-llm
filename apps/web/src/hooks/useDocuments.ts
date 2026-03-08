import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { documentsApi } from '../lib/api';
import { useNotifications } from '../store';

export const DOCUMENTS_KEY = 'documents';

export function usePendingDocuments(page = 1, pageSize = 25) {
    return useQuery({
        queryKey: [DOCUMENTS_KEY, 'pending', page, pageSize],
        queryFn: () => documentsApi.listPending(page, pageSize),
    });
}

export function useDocumentSuggestions(id: number | null) {
    return useQuery({
        queryKey: [DOCUMENTS_KEY, id, 'suggestions'],
        queryFn: () => documentsApi.getSuggestions(id!),
        enabled: id !== null,
    });
}

export function useGenerateDocument() {
    const qc = useQueryClient();
    const { push } = useNotifications();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: ({ id, stages, useExistingOnly }: { id: number; stages?: string[]; useExistingOnly?: boolean }) =>
            documentsApi.generate(id, stages, useExistingOnly),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: ['jobs'] });
            push({ kind: 'info', title: t('pipeline.jobQueued') });
        },
        onError: (err: Error) => {
            push({ kind: 'error', title: t('errors.generateFailed'), message: err.message });
        },
    });
}

export function useApplySuggestions() {
    const qc = useQueryClient();
    const { push } = useNotifications();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: (id: number) => documentsApi.applyAll(id),
        onSuccess: (_data, id) => {
            void qc.invalidateQueries({ queryKey: [DOCUMENTS_KEY, id, 'suggestions'] });
            void qc.invalidateQueries({ queryKey: [DOCUMENTS_KEY, 'pending'] });
            push({ kind: 'success', title: t('documents.applied') });
        },
        onError: (err: Error) => {
            push({ kind: 'error', title: t('errors.applyFailed'), message: err.message });
        },
    });
}

export function useDeleteSuggestions() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: number) => documentsApi.deleteSuggestions(id),
        onSuccess: (_data, id) => {
            void qc.invalidateQueries({ queryKey: [DOCUMENTS_KEY, id, 'suggestions'] });
        },
    });
}
