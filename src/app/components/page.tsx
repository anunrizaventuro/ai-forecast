import type { Metadata } from 'next';

import { ComponentsView } from 'src/sections/_examples/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Components` };

export default function ComponentsPage() {
  return <ComponentsView />;
}
