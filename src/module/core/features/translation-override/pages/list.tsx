import { useTranslate } from 'src/locales';
import { CONFIG } from 'src/shared/config';

import { TranslationOverrideListView } from '../views/translation-override-list-view';

// ----------------------------------------------------------------------

export default function Page() {
  const { t } = useTranslate('translation-override');

  return (
    <>
      <title>{`${t('title')} - ${CONFIG.appName}`}</title>
      <TranslationOverrideListView />
    </>
  );
}
