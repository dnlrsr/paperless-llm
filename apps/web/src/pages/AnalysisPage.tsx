import { zodResolver } from '@hookform/resolvers/zod';
import { FlaskConical } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button, Card, CardHeader, Spinner } from '../components/ui';
import { useAnalysis } from '../hooks/useAnalysis';
import { cn } from '../lib/utils';

const schema = z.object({
  documentIds: z.string().min(1),
  prompt: z.string().min(5),
});

type FormValues = z.infer<typeof schema>;

export function AnalysisPage() {
  const { t } = useTranslation();
  const [result, setResult] = useState<string | null>(null);
  const analysis = useAnalysis();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    const ids = values.documentIds
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n));

    const res = await analysis.mutateAsync({ documentIds: ids, prompt: values.prompt });
    setResult(res.result);
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold">{t('nav.analysis')}</h1>

      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-700 flex items-center gap-2">
            <FlaskConical size={18} className="text-primary-500" />
            {t('analysis.title')}
          </h2>
        </CardHeader>

        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-4">
          <div>
            <label className="label">{t('analysis.documentIds')}</label>
            <input
              {...register('documentIds')}
              className={cn('input', errors.documentIds && 'border-red-400')}
              placeholder="1, 2, 3"
            />
            {errors.documentIds && <p className="text-xs text-red-600 mt-1">{errors.documentIds.message}</p>}
            <p className="text-xs text-gray-400 mt-1">{t('analysis.documentIdsHint')}</p>
          </div>

          <div>
            <label className="label">{t('analysis.prompt')}</label>
            <textarea
              {...register('prompt')}
              rows={5}
              className={cn('input resize-y', errors.prompt && 'border-red-400')}
              placeholder={t('analysis.promptPlaceholder')}
            />
            {errors.prompt && <p className="text-xs text-red-600 mt-1">{errors.prompt.message}</p>}
          </div>

          <Button type="submit" variant="primary" loading={analysis.isPending}>
            <FlaskConical size={14} /> {t('analysis.run')}
          </Button>
        </form>
      </Card>

      {analysis.isPending && (
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      )}

      {result && !analysis.isPending && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-700">{t('analysis.result')}</h2>
          </CardHeader>
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">{result}</pre>
        </Card>
      )}
    </div>
  );
}
