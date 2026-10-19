import type { InitOptions } from 'i18next';

import i18next from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next, I18nextProvider as Provider } from 'react-i18next';

import { i18nOptions, fallbackLng, i18nResourceLoader } from './locales-config';

// ----------------------------------------------------------------------

// Bahasa dikunci ke 'id' (fallbackLng) — pilihan bahasa di localStorage diabaikan.
const initOptions: InitOptions = {
  ...i18nOptions(fallbackLng),
  detection: { order: [], caches: [] },
};

i18next.use(LanguageDetector).use(initReactI18next).use(i18nResourceLoader).init(initOptions);

// ----------------------------------------------------------------------

type I18nProviderProps = {
  children: React.ReactNode;
};

export function I18nProvider({ children }: I18nProviderProps) {
  return <Provider i18n={i18next}>{children}</Provider>;
}
