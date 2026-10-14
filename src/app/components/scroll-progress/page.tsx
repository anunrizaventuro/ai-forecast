import type { Metadata } from 'next';

import { ScrollProgressView } from 'src/sections/_examples/scroll-progress-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Scroll progress | Components` };

export default function Page() {
  return <ScrollProgressView />;
}
