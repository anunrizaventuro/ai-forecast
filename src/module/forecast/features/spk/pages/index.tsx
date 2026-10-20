import { CONFIG } from 'src/shared/config';

import { SpkListView } from '../views/spk-list-view';

// ----------------------------------------------------------------------

const metadata = { title: `SPK - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>
      <SpkListView />
    </>
  );
}
