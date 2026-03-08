import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Badge, Card, CardHeader } from '../components/ui';
import i18n from '../i18n';
import { healthApi } from '../lib/api';
import { useUISettings } from '../store';

export function SettingsPage() {
  const { t } = useTranslation();
  const { language, setLanguage, pageSize, setPageSize } = useUISettings();
  const { data: health } = useQuery({ queryKey: ['health'], queryFn: healthApi.get });

  function handleLang(lang: 'en' | 'de') {
    setLanguage(lang);
    void i18n.changeLanguage(lang);
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">{t('nav.settings')}</h1>

      {/* Language */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-700">{t('settings.language')}</h2>
        </CardHeader>
        <div className="flex gap-3">
          {(['en', 'de'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => handleLang(lang)}
              className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                language === lang
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {lang === 'en' ? '🇬🇧 English' : '🇩🇪 Deutsch'}
            </button>
          ))}
        </div>
      </Card>

      {/* Page size */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-700">{t('settings.pageSize')}</h2>
        </CardHeader>
        <select
          className="input w-40"
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </Card>

      {/* System info */}
      {health && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-700">{t('settings.systemInfo')}</h2>
          </CardHeader>
          <dl className="space-y-2 text-sm">
            <div className="flex gap-2">
              <dt className="text-gray-500 w-24">{t('settings.version')}</dt>
              <dd className="text-gray-800">{health.version}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-gray-500 w-24">{t('settings.status')}</dt>
              <dd>
                <Badge color={health.status === 'ok' ? 'green' : 'red'}>{health.status}</Badge>
              </dd>
            </div>
            {Object.entries(health.checks).map(([key, ok]) => (
              <div key={key} className="flex gap-2">
                <dt className="text-gray-500 w-24">{key}</dt>
                <dd><Badge color={ok ? 'green' : 'red'}>{ok ? '✓' : '✗'}</Badge></dd>
              </div>
            ))}
          </dl>
        </Card>
      )}
    </div>
  );
}
