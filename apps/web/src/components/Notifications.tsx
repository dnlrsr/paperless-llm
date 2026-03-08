import { X } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '../lib/utils';
import { useNotifications, type Notification } from '../store';

const kindStyle: Record<Notification['kind'], string> = {
  info:    'bg-blue-50 border-blue-300 text-blue-800',
  success: 'bg-green-50 border-green-300 text-green-800',
  warning: 'bg-yellow-50 border-yellow-300 text-yellow-800',
  error:   'bg-red-50 border-red-300 text-red-800',
};

function Toast({ n }: { n: Notification }) {
  const { dismiss } = useNotifications();

  useEffect(() => {
    const id = setTimeout(() => dismiss(n.id), n.kind === 'error' ? 8000 : 4000);
    return () => clearTimeout(id);
  }, [n.id, n.kind, dismiss]);

  return (
    <div className={cn('flex items-start gap-3 rounded-lg border px-4 py-3 shadow-md', kindStyle[n.kind])}>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{n.title}</p>
        {n.message && <p className="text-xs mt-0.5 opacity-80">{n.message}</p>}
      </div>
      <button onClick={() => dismiss(n.id)} className="shrink-0 opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}

export function Notifications() {
  const { notifications } = useNotifications();
  if (notifications.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 w-80"
    >
      {notifications.map((n) => (
        <Toast key={n.id} n={n} />
      ))}
    </div>
  );
}
