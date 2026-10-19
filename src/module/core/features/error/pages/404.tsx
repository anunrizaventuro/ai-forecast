import { useTranslate } from 'src/locales';
import { CONFIG } from 'src/shared/config';
import { NotFoundView } from 'src/module/core/features/error/components/not-found-view';

// ----------------------------------------------------------------------

export default function Page() {
  const { t } = useTranslate('error');

  return (
    <>
      <title>{`${t('notFound.pageTitle')} | Error - ${CONFIG.appName}`}</title>

      <NotFoundView />
    </>
  );
}
