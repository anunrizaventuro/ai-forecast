import { useTranslate } from 'src/locales';
import { CONFIG } from 'src/shared/config';
import { JwtSignInView } from 'src/module/core/features/auth/views/jwt';

// ----------------------------------------------------------------------

export default function Page() {
  const { t } = useTranslate('auth');

  return (
    <>
      <title>{`${t('signIn.pageTitle')} - ${CONFIG.appName}`}</title>

      <JwtSignInView />
    </>
  );
}
