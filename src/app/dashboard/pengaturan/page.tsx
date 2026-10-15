import type { Metadata } from 'next';

import { SettingsView } from 'src/sections/forecast/view/settings-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'Pengaturan' };

export default function Page() {
  return <SettingsView />;
}
