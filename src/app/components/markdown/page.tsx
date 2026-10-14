import type { Metadata } from 'next';

import { MarkdownView } from 'src/sections/_examples/markdown-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Markdown | Components` };

export default function Page() {
  return <MarkdownView />;
}
