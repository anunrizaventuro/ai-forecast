import { CONFIG } from 'src/shared/config';

import { StoreListView } from '../views/store-list-view';

// ----------------------------------------------------------------------

const metadata = { title: `Data Toko - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>
      <StoreListView />
    </>
  );
}
