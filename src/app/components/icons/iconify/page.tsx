import type { Metadata } from 'next';

import { IconifyView } from 'src/sections/_examples/icons-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Iconify Icon | Components` };

export default function Page() {
  return <IconifyView />;
}
