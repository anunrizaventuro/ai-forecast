import type { Metadata } from 'next';

import { ComingSoonView } from 'src/sections/coming-soon/view/coming-soon-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Coming soon`, robots: { index: false, follow: false } };

export default function Page() {
  return <ComingSoonView />;
}
