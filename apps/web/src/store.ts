import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Notification store ───────────────────────────────────────────────────────

export type NotificationKind = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
    id: string;
    kind: NotificationKind;
    title: string;
    message?: string;
}

interface NotificationState {
    notifications: Notification[];
    push: (n: Omit<Notification, 'id'>) => void;
    dismiss: (id: string) => void;
}

export const useNotifications = create<NotificationState>((set) => ({
    notifications: [],
    push: (n) =>
        set((s) => ({
            notifications: [
                ...s.notifications,
                { ...n, id: crypto.randomUUID() },
            ],
        })),
    dismiss: (id) =>
        set((s) => ({
            notifications: s.notifications.filter((n) => n.id !== id),
        })),
}));

// ─── Settings store (persisted) ──────────────────────────────────────────────

interface UISettings {
    language: 'en' | 'de';
    pageSize: number;
    setLanguage: (lang: 'en' | 'de') => void;
    setPageSize: (size: number) => void;
}

export const useUISettings = create<UISettings>()(
    persist(
        (set) => ({
            language: 'en',
            pageSize: 25,
            setLanguage: (language) => set({ language }),
            setPageSize: (pageSize) => set({ pageSize }),
        }),
        { name: 'paperless-llm-ui' },
    ),
);
