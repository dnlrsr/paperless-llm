/**
 * OllamaWarmupService — SRP: owns the Ollama model pre-warm lifecycle.
 * DIP: depends on SseService interface, not on any concrete transport.
 *
 * Strategy:
 *  1. On startup (and after every job completes) send a zero-token "ping" to
 *     Ollama's /api/generate with keep_alive set. This triggers a model load
 *     without generating any tokens.
 *  2. The service tracks "ready" state and exposes a `waitUntilReady()` promise
 *     so workers can gate themselves instead of racing the cold-start.
 *  3. SSE events are emitted so the frontend can show a "warming up…" indicator.
 */
import { EventEmitter } from 'node:events';
import { getLogger } from '../../config/logger.js';
import type { SseService } from '../../sse/sse.service.js';

export type WarmupState = 'idle' | 'warming' | 'ready' | 'error';

export interface OllamaWarmupOptions {
    /** Base URL of the Ollama instance, e.g. http://localhost:11434 */
    baseURL: string;
    /** Model name to pre-load, e.g. qwen3:14b */
    model: string;
    /**
     * How long (ms) to wait for Ollama to load the model before giving up.
     * Defaults to 10 minutes.
     */
    warmupTimeoutMs?: number;
    /** Interval (ms) between warmup ping retries. Defaults to 5 s. */
    retryIntervalMs?: number;
    /** Optional SSE service to broadcast warmup state to connected clients. */
    sseService?: SseService;
}

export class OllamaWarmupService extends EventEmitter {
    private state: WarmupState = 'idle';
    /** Resolves when the model is confirmed loaded, rejects on timeout/error. */
    private readyPromise: Promise<void>;
    private resolveReady!: () => void;
    private rejectReady!: (err: Error) => void;

    constructor(private readonly opts: OllamaWarmupOptions) {
        super();
        this.readyPromise = this.createReadyPromise();
    }

    get currentState(): WarmupState {
        return this.state;
    }

    /**
     * Await this to block until the model is confirmed loaded.
     * Safe to call multiple times; resolves immediately if already ready.
     */
    waitUntilReady(): Promise<void> {
        if (this.state === 'ready') return Promise.resolve();
        return this.readyPromise;
    }

    /**
     * Reset to a new readyPromise (e.g. after Ollama evicts the model).
     * Called by the warmup loop to allow re-gating on the next cold start.
     */
    reset(): void {
        if (this.state === 'ready') {
            this.state = 'idle';
            this.readyPromise = this.createReadyPromise();
        }
    }

    /** Start the warmup ping loop. Resolves as soon as the model is loaded. */
    async start(): Promise<void> {
        if (this.state === 'warming' || this.state === 'ready') return;
        this.setState('warming');
        void this.runWarmupLoop();
    }

    // ─── Private ──────────────────────────────────────────────────────────────

    private createReadyPromise(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.resolveReady = resolve;
            this.rejectReady = reject;
        });
    }

    private setState(next: WarmupState): void {
        const prev = this.state;
        this.state = next;
        if (prev !== next) {
            getLogger().info({ state: next, model: this.opts.model }, 'Ollama warmup state changed');
            this.emit('stateChange', next);
            this.opts.sseService?.broadcast({
                type: 'ollama.warmup',
                payload: { state: next, model: this.opts.model },
            });
        }
    }

    private async runWarmupLoop(): Promise<void> {
        const log = getLogger();
        const {
            baseURL,
            model,
            warmupTimeoutMs = 10 * 60 * 1000,
            retryIntervalMs = 5_000,
        } = this.opts;

        // Normalise base URL (strip /api suffix — the warmup hits /api/generate directly)
        const apiBase = baseURL.replace(/\/api\/?$/, '');

        const deadline = Date.now() + warmupTimeoutMs;

        while (Date.now() < deadline) {
            try {
                log.debug({ model }, 'Ollama warmup: sending ping');

                const res = await fetch(`${apiBase}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model,
                        prompt: '',  // empty prompt → no tokens generated, just loads the model
                        stream: false,
                    }),
                    // keep_alive is intentionally omitted — Ollama uses its own
                    // OLLAMA_KEEP_ALIVE server env var, which is the right place to set it.
                    // Give each individual ping attempt its own abort deadline
                    // (the outer loop handles total elapsed time).
                    signal: AbortSignal.timeout(warmupTimeoutMs),
                });

                if (res.ok) {
                    log.info({ model }, 'Ollama warmup: model is loaded and ready');
                    this.setState('ready');
                    this.resolveReady();
                    return;
                }

                const body = await res.text().catch(() => '');
                log.warn({ status: res.status, body, model }, 'Ollama warmup: unexpected response, retrying');
            } catch (err: unknown) {
                const isAbort = err instanceof Error && err.name === 'AbortError';
                if (isAbort) break; // outer deadline hit
                log.warn({ err, model }, 'Ollama warmup: ping failed, retrying');
            }

            await sleep(retryIntervalMs);
        }

        const error = new Error(`Ollama warmup timed out after ${warmupTimeoutMs / 1000}s for model "${model}"`);
        log.error({ model }, error.message);
        this.setState('error');
        this.rejectReady(error);
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
