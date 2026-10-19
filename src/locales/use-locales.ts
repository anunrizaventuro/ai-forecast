import type { Namespace } from 'i18next';
import type { LangCode } from './locales-config';

import dayjs from 'dayjs';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { fallbackLng, getCurrentLang } from './locales-config';

// ----------------------------------------------------------------------

export function useTranslate(namespace?: Namespace) {
  const { t, i18n } = useTranslation(namespace);

  const currentLang = getCurrentLang(i18n.resolvedLanguage);

  const handleChangeLang = useCallback(
    async (lang: LangCode) => {
      try {
        await i18n.changeLanguage(lang);
        dayjs.locale(getCurrentLang(lang).adapterLocale);
      } catch (error) {
        console.error(error);
      }
    },
    [i18n]
  );

  const handleResetLang = useCallback(() => {
    handleChangeLang(fallbackLng);
  }, [handleChangeLang]);

  return {
    t,
    i18n,
    currentLang,
    onChangeLang: handleChangeLang,
    onResetLang: handleResetLang,
  };
}
