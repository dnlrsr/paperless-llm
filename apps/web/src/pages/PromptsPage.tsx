import { MessageSquare, RotateCcw, Save } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Card, CardHeader, Spinner } from '../components/ui';
import { usePrompt, usePrompts, useResetPrompt, useUpdatePrompt } from '../hooks/usePrompts';

export function PromptsPage() {
  const { t } = useTranslation();
  const { data: templates, isLoading } = usePrompts();
  const [selected, setSelected] = useState<string | null>(null);
  const { data: template, isLoading: templateLoading } = usePrompt(selected);
  const [content, setContent] = useState('');
  const update = useUpdatePrompt();
  const reset = useResetPrompt();

  function handleSelect(name: string) {
    setSelected(name);
    setContent(''); // will be populated by useEffect below
  }

  // sync content from loaded template
  if (template && content === '' && selected) {
    setContent(template.content);
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-32"><Spinner size="lg" /></div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">{t('nav.prompts')}</h1>

      <div className="flex gap-6">
        {/* Template list */}
        <aside className="w-48 shrink-0 space-y-1">
          {(templates ?? []).map((tpl) => (
            <button
              key={tpl.name}
              onClick={() => handleSelect(tpl.name)}
              className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors text-left
                ${selected === tpl.name ? 'bg-primary-50 text-primary-700 font-medium' : 'hover:bg-gray-100 text-gray-700'}`}
            >
              <span>{tpl.name}</span>
              {tpl.isCustom && <Badge color="blue">{t('prompts.custom')}</Badge>}
            </button>
          ))}
        </aside>

        {/* Editor */}
        <div className="flex-1 space-y-4">
          {selected === null && (
            <Card className="flex items-center justify-center py-16">
              <div className="text-center text-gray-400">
                <MessageSquare size={40} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">{t('prompts.selectHint')}</p>
              </div>
            </Card>
          )}

          {selected !== null && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold text-gray-700">{selected}.hbs</h2>
                <Button
                  variant="ghost"
                  onClick={() => {
                    reset.mutate(selected);
                    setContent('');
                  }}
                  loading={reset.isPending}
                >
                  <RotateCcw size={14} /> {t('prompts.resetToDefault')}
                </Button>
              </CardHeader>

              {templateLoading ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <textarea
                    className="input w-full resize-y font-mono text-xs"
                    rows={20}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                  <div className="flex justify-end mt-3">
                    <Button
                      variant="primary"
                      loading={update.isPending}
                      onClick={() => update.mutate({ name: selected, content })}
                    >
                      <Save size={14} /> {t('common.save')}
                    </Button>
                  </div>
                </>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
