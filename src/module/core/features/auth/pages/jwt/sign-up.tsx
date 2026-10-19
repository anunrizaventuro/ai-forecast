import { useTranslate } from 'src/locales';
import { CONFIG } from 'src/shared/config';
import { JwtSignUpView } from 'src/module/core/features/auth/views/jwt';

// ----------------------------------------------------------------------

export default function Page() {
  const { t } = useTranslate('auth');

  return (
    <>
      <title>{`${t('signUp.pageTitle')} - ${CONFIG.appName}`}</title>

      <JwtSignUpView />
    </>
  );
}
