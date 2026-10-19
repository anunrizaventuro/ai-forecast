import { useTranslate } from 'src/locales';
import { CONFIG } from 'src/shared/config';

import { UsersListView } from '../views/users-list-view';

// ----------------------------------------------------------------------

export default function Page() {
  const { t } = useTranslate('users');

  return (
    <>
      <title>{`${t('title')} - ${CONFIG.appName}`}</title>
      <UsersListView />
    </>
  );
}
