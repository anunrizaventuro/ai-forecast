import { redirect } from 'next/navigation';

import { paths } from 'src/routes/paths';

// ----------------------------------------------------------------------

// AI Forecast adalah aplikasi dashboard — root langsung ke Dashboard.
export default function Page() {
  redirect(paths.dashboard.root);
}
