/**
 * Server-side i18n — used for log messages and error responses.
 * Uses i18next with the fs-backend to load locale files from packages/shared.
 */
import i18next from 'i18next';
import FsBackend from 'i18next-fs-backend';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const localesPath = resolve(__dirname, '..', '..', '..', '..', '..', 'packages', 'shared', 'src', 'locales');

export async function initI18n(language = 'en'): Promise<void> {
    await i18next.use(FsBackend).init({
        lng: language,
        fallbackLng: 'en',
        supportedLngs: ['en', 'de'],
        ns: ['translation'],
        defaultNS: 'translation',
        backend: {
            loadPath: `${localesPath}/{{lng}}.json`,
        },
        interpolation: {
            escapeValue: false,
        },
    });
}

export function t(key: string, options?: Record<string, unknown>): string {
    return i18next.t(key, options);
}
