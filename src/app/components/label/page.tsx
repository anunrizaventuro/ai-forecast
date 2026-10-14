import type { Metadata } from 'next';

import { LabelView } from 'src/sections/_examples/label-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Label | Components` };

export default function Page() {
  return <LabelView />;
}
