import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { jobsApi } from '../lib/api';
import type { SseEvent } from '../lib/sse';
import { useSse } from '../lib/sse';
import { useNotifications } from '../store';

const HEALTH_KEY = 'health';

export const JOBS_KEY = 'jobs';

export function useJobs(page = 1, pageSize = 25) {
    return useQuery({
        queryKey: [JOBS_KEY, page, pageSize],
        queryFn: () => jobsApi.list(page, pageSize),
        refetchInterval: 5000,
    });
}

export function useJob(id: string | null) {
    return useQuery({
        queryKey: [JOBS_KEY, id],
        queryFn: () => jobsApi.get(id!),
        enabled: id !== null,
    });
}

/** Polls a job at 1.5 s while it is active/waiting, stops when done. */
export function useActiveJob(id: string | null) {
    return useQuery({
        queryKey: [JOBS_KEY, 'active', id],
        queryFn: () => jobsApi.get(id!),
        enabled: id !== null,
        refetchInterval: (query) => {
            const status = query.state.data?.status;
            if (!status || status === 'active' || status === 'waiting') return 1500;
            return false;
        },
    });
}

/**
 * Polls for an active/waiting metadata job for a given documentId.
 * Useful to detect poller-initiated auto-generation in the UI.
 */
export function useActiveJobForDocument(documentId: number | null) {
    return useQuery({
        queryKey: [JOBS_KEY, 'active-for-document', documentId],
        queryFn: () => jobsApi.getActiveForDocument(documentId!),
        enabled: documentId !== null,
        refetchInterval: (query) => {
            // Keep polling while there is an active job; stop when null (done)
            return query.state.data !== undefined ? 1500 : false;
        },
    });
}

export function useCancelJob() {
    const qc = useQueryClient();
    const { push } = useNotifications();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: (id: string) => jobsApi.cancel(id),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: [JOBS_KEY] });
            push({ kind: 'info', title: t('jobs.cancelled') });
        },
        onError: (err: Error) => {
            push({ kind: 'error', title: t('errors.cancelFailed'), message: err.message });
        },
    });
}

/** Subscribe to live job progress via SSE and invalidate the jobs query. */
export function useJobSseUpdates() {
    const qc = useQueryClient();
    const { push } = useNotifications();
    const { t } = useTranslation();

    useSse<Record<string, unknown>>(
        '/api/events',
        (event: SseEvent<Record<string, unknown>>) => {
            if (event.type === 'job.progress' || event.type === 'job.completed' || event.type === 'job.failed') {
                void qc.invalidateQueries({ queryKey: [JOBS_KEY] });
            }

            if (event.type === 'ollama.warmup') {
                const state = event.payload['state'] as string | undefined;
                // Invalidate health so the dashboard reflects the new warmup state.
                void qc.invalidateQueries({ queryKey: [HEALTH_KEY] });
                if (state === 'warming') {
                    push({ kind: 'info', title: t('ollama.warming') });
                } else if (state === 'ready') {
                    push({ kind: 'success', title: t('ollama.ready') });
                } else if (state === 'error') {
                    push({ kind: 'error', title: t('ollama.error') });
                }
            }
        },
    );
}
