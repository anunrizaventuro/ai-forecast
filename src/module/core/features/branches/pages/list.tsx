import { useTranslate } from 'src/locales';
import { CONFIG } from 'src/shared/config';

import { BranchesListView } from '../views/branches-list-view';

// ----------------------------------------------------------------------

export default function Page() {
  const { t } = useTranslate('branches');

  return (
    <>
      <title>{`${t('title')} - ${CONFIG.appName}`}</title>
      <BranchesListView />
    </>
  );
}
