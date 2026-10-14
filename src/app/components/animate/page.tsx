import type { Metadata } from 'next';

import { AnimateView } from 'src/sections/_examples/animate-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Animate | Components` };

export default function Page() {
  return <AnimateView />;
}
