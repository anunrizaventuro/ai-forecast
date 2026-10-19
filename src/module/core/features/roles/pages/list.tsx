import { useTranslate } from 'src/locales';
import { CONFIG } from 'src/shared/config';

import { RolesListView } from '../views/roles-list-view';

// ----------------------------------------------------------------------

export default function Page() {
  const { t } = useTranslate('roles');

  return (
    <>
      <title>{`${t('title')} - ${CONFIG.appName}`}</title>
      <RolesListView />
    </>
  );
}
