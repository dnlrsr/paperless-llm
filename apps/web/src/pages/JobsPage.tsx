import { Briefcase, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Card, EmptyState, ProgressBar, Spinner } from '../components/ui';
import { useCancelJob, useJobs, useJobSseUpdates } from '../hooks/useJobs';
import type { JobRecord } from '../lib/api';
import { formatDate } from '../lib/utils';

const statusColor: Record<JobRecord['status'], 'blue' | 'green' | 'yellow' | 'red' | 'gray'> = {
  waiting:   'yellow',
  active:    'blue',
  completed: 'green',
  failed:    'red',
  delayed:   'gray',
};

export function JobsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch } = useJobs(page, 25);
  const cancel = useCancelJob();

  useJobSseUpdates();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  const jobs = data?.jobs ?? [];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('nav.jobs')}</h1>
        <Button variant="secondary" onClick={() => void refetch()}>
          <RefreshCw size={14} /> {t('common.refresh')}
        </Button>
      </div>

      {jobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase size={40} />}
          title={t('jobs.noJobs')}
          description={t('jobs.noJobsDesc')}
        />
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <Card key={job.id} className="flex items-center gap-4 py-3 px-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs text-gray-500">{job.id.slice(0, 8)}…</span>
                  <Badge color={statusColor[job.status]}>{job.status}</Badge>
                  {job.documentId && (
                    <span className="text-xs text-gray-500">{t('jobs.document')} #{job.documentId}</span>
                  )}
                </div>
                {(job.status === 'active' || job.status === 'waiting') && (
                  <ProgressBar value={job.progress} className="mt-1" />
                )}
                {job.error && (
                  <p className="text-xs text-red-600 mt-1 truncate">{job.error}</p>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-3">
                <span className="text-xs text-gray-400">{formatDate(job.createdAt)}</span>
                {(job.status === 'active' || job.status === 'waiting') && (
                  <Button
                    variant="ghost"
                    onClick={() => cancel.mutate(job.id)}
                    loading={cancel.isPending && cancel.variables === job.id}
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {(data?.total ?? 0) > 25 && (
        <div className="flex items-center justify-center gap-4 pt-2">
          <Button variant="secondary" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            {t('common.prev')}
          </Button>
          <span className="text-sm text-gray-600">{t('common.page')} {page}</span>
          <Button variant="secondary" disabled={jobs.length < 25} onClick={() => setPage((p) => p + 1)}>
            {t('common.next')}
          </Button>
        </div>
      )}
    </div>
  );
}
