import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Briefcase, CheckCircle, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge, Card, CardHeader, Spinner } from '../components/ui';
import { usePendingDocuments } from '../hooks/useDocuments';
import { useJobs, useJobSseUpdates } from '../hooks/useJobs';
import { healthApi } from '../lib/api';
import { formatDate } from '../lib/utils';

export function DashboardPage() {
  const { t } = useTranslation();
  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ['health'],
    queryFn: healthApi.get,
    refetchInterval: 30_000,
  });
  const { data: pending } = usePendingDocuments(1, 5);
  const { data: jobs } = useJobs(1, 5);

  // Subscribe to SSE for live job updates
  useJobSseUpdates();

  const activeJobs = jobs?.jobs.filter((j) => j.status === 'active' || j.status === 'waiting') ?? [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">{t('nav.dashboard')}</h1>

      {/* Health row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {healthLoading ? (
          <Card className="col-span-3 flex items-center justify-center py-8">
            <Spinner size="lg" />
          </Card>
        ) : (
          <>
            <StatCard
              label={t('dashboard.systemStatus')}
              value={health?.status === 'ok' ? t('common.ok') : t('common.degraded')}
              icon={health?.status === 'ok' ? <CheckCircle className="text-green-500" /> : <AlertCircle className="text-red-500" />}
            />
            <StatCard
              label={t('dashboard.pendingDocuments')}
              value={String(pending?.total ?? 0)}
              icon={<FileText className="text-primary-500" />}
            />
            <StatCard
              label={t('dashboard.activeJobs')}
              value={String(activeJobs.length)}
              icon={<Briefcase className="text-yellow-500" />}
            />
          </>
        )}
      </div>

      {/* Latest pending */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-700">{t('dashboard.latestPending')}</h2>
        </CardHeader>
        {pending?.documents.length === 0 && (
          <p className="text-sm text-gray-500">{t('documents.noPending')}</p>
        )}
        <ul className="divide-y divide-gray-100">
          {pending?.documents.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between py-2 text-sm">
              <span className="truncate max-w-xs text-gray-800">{doc.title}</span>
              <span className="text-gray-400">{formatDate(doc.created)}</span>
            </li>
          ))}
        </ul>
      </Card>

      {/* Active jobs */}
      {activeJobs.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-700">{t('dashboard.activeJobs')}</h2>
          </CardHeader>
          <ul className="divide-y divide-gray-100">
            {activeJobs.map((job) => (
              <li key={job.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-gray-700 font-mono text-xs">{job.id.slice(0, 8)}</span>
                <Badge color={job.status === 'active' ? 'blue' : 'yellow'}>{job.status}</Badge>
                <span className="text-gray-400">{job.progress}%</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="flex items-center gap-4">
      <div className="shrink-0 text-2xl">{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </Card>
  );
}
