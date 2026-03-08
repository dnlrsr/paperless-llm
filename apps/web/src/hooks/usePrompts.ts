import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { promptsApi } from '../lib/api';
import { useNotifications } from '../store';

export const PROMPTS_KEY = 'prompts';

export function usePrompts() {
    return useQuery({
        queryKey: [PROMPTS_KEY],
        queryFn: () => promptsApi.list(),
    });
}

export function usePrompt(name: string | null) {
    return useQuery({
        queryKey: [PROMPTS_KEY, name],
        queryFn: () => promptsApi.get(name!),
        enabled: name !== null,
    });
}

export function useUpdatePrompt() {
    const qc = useQueryClient();
    const { push } = useNotifications();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: ({ name, content }: { name: string; content: string }) =>
            promptsApi.update(name, content),
        onSuccess: (_data, { name }) => {
            void qc.invalidateQueries({ queryKey: [PROMPTS_KEY] });
            void qc.invalidateQueries({ queryKey: [PROMPTS_KEY, name] });
            push({ kind: 'success', title: t('prompts.saved') });
        },
        onError: (err: Error) => {
            push({ kind: 'error', title: t('errors.saveFailed'), message: err.message });
        },
    });
}

export function useResetPrompt() {
    const qc = useQueryClient();
    const { push } = useNotifications();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: (name: string) => promptsApi.reset(name),
        onSuccess: (_data, name) => {
            void qc.invalidateQueries({ queryKey: [PROMPTS_KEY] });
            void qc.invalidateQueries({ queryKey: [PROMPTS_KEY, name] });
            push({ kind: 'info', title: t('prompts.reset') });
        },
        onError: (err: Error) => {
            push({ kind: 'error', title: t('errors.resetFailed'), message: err.message });
        },
    });
}
