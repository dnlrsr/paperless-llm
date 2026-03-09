import { useEffect, useRef } from 'react';
import { useAuthStore } from '../store';

export interface SseEvent<T = unknown> {
    type: string;
    payload: T;
}

type SseHandler<T = unknown> = (event: SseEvent<T>) => void;

/**
 * Subscribe to the server-sent events endpoint.
 * Reconnects automatically with exponential back-off on disconnect.
 */
export function useSse<T = unknown>(
    url: string,
    onEvent: SseHandler<T>,
    enabled = true,
): void {
    const handlerRef = useRef(onEvent);
    handlerRef.current = onEvent;

    useEffect(() => {
        if (!enabled) return;

        const token = useAuthStore.getState().token;
        let urlWithToken = url;
        if (token) {
            const parsed = new URL(url, window.location.href);
            parsed.searchParams.set('token', token);
            urlWithToken = parsed.toString();
        }

        let es: EventSource;
        let retryDelay = 1000;
        let cancelled = false;

        function connect() {
            es = new EventSource(urlWithToken);

            es.onmessage = (e: MessageEvent<string>) => {
                try {
                    const parsed = JSON.parse(e.data) as SseEvent<T>;
                    handlerRef.current(parsed);
                } catch {
                    // ignore malformed events
                }
            };

            es.onerror = () => {
                es.close();
                if (!cancelled) {
                    setTimeout(() => {
                        retryDelay = Math.min(retryDelay * 2, 30_000);
                        connect();
                    }, retryDelay);
                }
            };

            es.onopen = () => {
                retryDelay = 1000; // reset on success
            };
        }

        connect();

        return () => {
            cancelled = true;
            es?.close();
        };
    }, [url, enabled]);
}
