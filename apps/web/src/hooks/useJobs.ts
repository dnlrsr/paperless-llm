import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { jobsApi } from '../lib/api';
import type { SseEvent } from '../lib/sse';
import { useSse } from '../lib/sse';
import { useNotifications } from '../store';

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

    useSse<{ jobId: string; progress: number; status: string }>(
        '/api/events',
        (event: SseEvent<{ jobId: string; progress: number; status: string }>) => {
            if (event.type === 'job:progress' || event.type === 'job:complete' || event.type === 'job:failed') {
                void qc.invalidateQueries({ queryKey: [JOBS_KEY] });
            }
        },
    );
}
