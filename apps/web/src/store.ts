import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

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
    /** Global default: restrict AI suggestions to items already in paperless-ngx */
    useExistingOnly: boolean;
    setLanguage: (lang: 'en' | 'de') => void;
    setPageSize: (size: number) => void;
    setUseExistingOnly: (value: boolean) => void;
}

export const useUISettings = create<UISettings>()(
    persist(
        (set) => ({
            language: 'en',
            pageSize: 25,
            useExistingOnly: true,
            setLanguage: (language) => set({ language }),
            setPageSize: (pageSize) => set({ pageSize }),
            setUseExistingOnly: (useExistingOnly) => set({ useExistingOnly }),
        }),
        { name: 'paperless-llm-ui' },
    ),
);

// ─── Auth store (session-scoped) ─────────────────────────────────────────────

export interface AuthUser {
    id: number;
    username: string;
    email: string;
}

interface AuthState {
    token: string | null;
    user: AuthUser | null;
    setAuth: (token: string, user: AuthUser) => void;
    clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            token: null,
            user: null,
            setAuth: (token, user) => set({ token, user }),
            clearAuth: () => set({ token: null, user: null }),
        }),
        {
            name: 'paperless-llm-auth',
            storage: createJSONStorage(() => sessionStorage),
        },
    ),
);
