import type { Metadata } from 'next';

import { NavigationBarView } from 'src/sections/_examples/navigation-bar-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Navigation bar | Components` };

export default function Page() {
  return <NavigationBarView />;
}
