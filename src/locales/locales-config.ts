import type { InitOptions } from 'i18next';

import resourcesToBackend from 'i18next-resources-to-backend';

// ----------------------------------------------------------------------

export const supportedLngs = ['id', 'en'] as const;
export type LangCode = (typeof supportedLngs)[number];

export const fallbackLng: LangCode = 'en';
export const defaultNS = 'common';

export const storageConfig = {
  localStorage: { key: 'i18nextLng', autoDetection: false },
} as const;

// ----------------------------------------------------------------------

export type LangOption = {
  value: LangCode;
  label: string;
  countryCode: string;
  adapterLocale: string;
  numberFormat: { code: string; currency: string };
};

export const allLangs: LangOption[] = [
  {
    value: 'en',
    label: 'English',
    countryCode: 'GB',
    adapterLocale: 'en',
    numberFormat: { code: 'en-US', currency: 'USD' },
  },
  {
    value: 'id',
    label: 'Bahasa Indonesia',
    countryCode: 'ID',
    adapterLocale: 'id',
    numberFormat: { code: 'id-ID', currency: 'IDR' },
  },
];

// ----------------------------------------------------------------------

export const i18nResourceLoader = resourcesToBackend(
  (lang: LangCode, namespace: string) => import(`./langs/${lang}/${namespace}.json`)
);

export function i18nOptions(
  lang: LangCode = fallbackLng,
  namespace: string = defaultNS
): InitOptions {
  return {
    supportedLngs,
    fallbackLng,
    lng: lang,
    fallbackNS: defaultNS,
    defaultNS,
    ns: namespace,
    interpolation: { escapeValue: false },
  };
}

export function getCurrentLang(lang?: string): LangOption {
  const fallback = allLangs.find((l) => l.value === fallbackLng) ?? allLangs[0];
  if (!lang) return fallback;
  return allLangs.find((l) => l.value === lang) ?? fallback;
}
