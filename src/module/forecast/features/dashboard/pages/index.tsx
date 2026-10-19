import { CONFIG } from 'src/shared/config';

import { DashboardView } from '../views/dashboard-view';

// ----------------------------------------------------------------------

const metadata = { title: `Dashboard - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>
      <DashboardView />
    </>
  );
}
