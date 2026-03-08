import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { analysisApi, type AnalysisRequest } from '../lib/api';
import { useNotifications } from '../store';

export function useAnalysis() {
    const { push } = useNotifications();
    const { t } = useTranslation();

    return useMutation({
        mutationFn: (req: AnalysisRequest) => analysisApi.run(req),
        onError: (err: Error) => {
            push({ kind: 'error', title: t('errors.analysisFailed'), message: err.message });
        },
    });
}
