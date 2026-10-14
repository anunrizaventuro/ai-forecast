import type { Metadata } from 'next';

import { UtilitiesView } from 'src/sections/_examples/utilities-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Utilities | Components` };

export default function Page() {
  return <UtilitiesView />;
}
