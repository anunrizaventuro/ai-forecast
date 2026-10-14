import type { Metadata } from 'next';

import { MegaMenuView } from 'src/sections/_examples/mega-menu-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Mega menu | Components` };

export default function Page() {
  return <MegaMenuView />;
}
