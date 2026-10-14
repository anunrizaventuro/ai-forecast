import type { Metadata } from 'next';

import { LightboxView } from 'src/sections/_examples/lightbox-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Lightbox | Components` };

export default function Page() {
  return <LightboxView />;
}
