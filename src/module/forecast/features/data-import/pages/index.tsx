import { CONFIG } from 'src/shared/config';

import { DataImportView } from '../views/data-import-view';

// ----------------------------------------------------------------------

const metadata = { title: `Import Data - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>
      <DataImportView />
    </>
  );
}
