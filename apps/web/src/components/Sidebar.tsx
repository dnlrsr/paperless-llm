import { useQuery } from '@tanstack/react-query';
import {
  Briefcase,
  FileText,
  FlaskConical,
  LayoutDashboard,
  MessageSquare,
  Settings,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import i18n from '../i18n';
import { healthApi, jobsApi } from '../lib/api';
import { cn } from '../lib/utils';
import { useUISettings } from '../store';

const navItems = [
  { to: '/',         labelKey: 'nav.dashboard',  Icon: LayoutDashboard },
  { to: '/documents', labelKey: 'nav.documents', Icon: FileText },
  { to: '/jobs',      labelKey: 'nav.jobs',       Icon: Briefcase },
  { to: '/analysis',  labelKey: 'nav.analysis',   Icon: FlaskConical },
  { to: '/prompts',   labelKey: 'nav.prompts',    Icon: MessageSquare },
  { to: '/settings',  labelKey: 'nav.settings',   Icon: Settings },
];

export function Sidebar() {
  const { t } = useTranslation();
  const { language, setLanguage } = useUISettings();

  function toggleLang() {
    const next = language === 'en' ? 'de' : 'en';
    setLanguage(next);
    void i18n.changeLanguage(next);
  }

  return (
    <aside className="flex h-screen w-56 flex-col bg-gray-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-700">
        <span className="text-primary-400 font-bold text-lg">📄 Paperless</span>
        <span className="text-gray-400 text-xs">LLM</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navItems.map(({ to, labelKey, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-primary-700 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white',
              )
            }
          >
            <Icon size={16} />
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>

      {/* Lang toggle */}
      <div className="px-4 py-3 border-t border-gray-700">
        <button
          onClick={toggleLang}
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          {language === 'en' ? '🇩🇪 Deutsch' : '🇬🇧 English'}
        </button>
      </div>

      {/* Status panel */}
      <SidebarStatus />
    </aside>
  );
}

// ─── Status panel ─────────────────────────────────────────────────────────────

function SidebarStatus() {
  const { t } = useTranslation();

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: healthApi.get,
    refetchInterval: 30_000,
  });

  const { data: jobs } = useQuery({
    queryKey: ['jobs', 1, 25],
    queryFn: () => jobsApi.list(1, 25),
    refetchInterval: 3_000,
  });

  const activeJobs = jobs?.jobs.filter(
    (j) => j.status === 'active' || j.status === 'waiting',
  ) ?? [];

  const checks: Array<{ key: string; label: string; sublabel?: string; ok: boolean | null }> = [
    { key: 'paperlessNgx', label: 'paperless-ngx',      ok: health?.checks.paperlessNgx ?? null },
    { key: 'redis',        label: 'Redis',               ok: health?.checks.redis        ?? null },
    { key: 'database',     label: t('dashboard.database'), ok: health?.checks.database   ?? null },
    ...(health?.checks.ollama !== undefined
      ? [{ key: 'ollama', label: 'Ollama', sublabel: health?.ollamaModel, ok: health.checks.ollama }]
      : []),
  ];

  return (
    <div className="px-4 py-3 border-t border-gray-700 space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {t('dashboard.systemStatus')}
      </p>

      {/* Service indicators */}
      <ul className="space-y-1">
        {checks.map(({ key, label, sublabel, ok }) => (
          <li key={key} className="flex items-center gap-2">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full shrink-0',
                ok === null  ? 'bg-gray-600'  :
                ok === true  ? 'bg-green-400' : 'bg-red-400',
              )}
            />
            <div className="min-w-0">
              <span className="text-xs text-gray-400 truncate block">{label}</span>
              {sublabel && <span className="text-[10px] text-gray-600 truncate block">{sublabel}</span>}
            </div>
          </li>
        ))}
      </ul>

      {/* Active jobs */}
      {activeJobs.length > 0 && (
        <div className="pt-1 space-y-1">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t('sidebar.activeJobs', { count: activeJobs.length })}
          </p>
          {activeJobs.slice(0, 3).map((job) => (
            <div key={job.id} className="space-y-0.5">
              <div className="flex justify-between text-xs text-gray-400">
                <span className="font-mono truncate max-w-[80px]">{job.id.slice(0, 8)}</span>
                <span>{job.progress}%</span>
              </div>
              <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all duration-500"
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            </div>
          ))}
          {activeJobs.length > 3 && (
            <p className="text-xs text-gray-600">
              +{activeJobs.length - 3} {t('sidebar.moreJobs')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
