import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

void i18n
    .use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        fallbackLng: 'en',
        supportedLngs: ['en', 'de'],
        ns: ['common'],
        defaultNS: 'common',
        backend: {
            loadPath: '/api/locales/{{lng}}/{{ns}}',
        },
        detection: {
            order: ['querystring', 'navigator', 'htmlTag'],
            caches: ['localStorage'],
        },
        interpolation: {
            escapeValue: false,
        },
        react: {
            useSuspense: true,
        },
        debug: import.meta.env.DEV,
    });

export default i18n;
