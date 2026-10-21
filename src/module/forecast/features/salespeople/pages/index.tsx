import { CONFIG } from 'src/shared/config';

import { SalesListView } from '../views/sales-list-view';

// ----------------------------------------------------------------------

const metadata = { title: `Data Sales - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>
      <SalesListView />
    </>
  );
}
