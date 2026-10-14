import type { Metadata } from 'next';

import { IconsView } from 'src/sections/_examples/icons-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Icons | Components` };

export default function Page() {
  return <IconsView />;
}
