import { CONFIG } from 'src/shared/config';

import { SettingsView } from '../views/settings-view';

// ----------------------------------------------------------------------

const metadata = { title: `Pengaturan - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>
      <SettingsView />
    </>
  );
}
