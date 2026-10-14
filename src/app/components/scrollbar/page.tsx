import type { Metadata } from 'next';

import { ScrollbarView } from 'src/sections/_examples/scrollbar-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Scrollbar | Components` };

export default function Page() {
  return <ScrollbarView />;
}
