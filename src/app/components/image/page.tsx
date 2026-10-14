import type { Metadata } from 'next';

import { ImageView } from 'src/sections/_examples/image-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Image | Components` };

export default function Page() {
  return <ImageView />;
}
