import type { Metadata } from 'next';

import { MaintenanceView } from 'src/sections/maintenance/view/maintenance-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Maintenance`, robots: { index: false, follow: false } };

export default function Page() {
  return <MaintenanceView />;
}
