import type { Metadata } from 'next';

import { PlayerView } from 'src/sections/_examples/player-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Player | Components` };

export default function Page() {
  return <PlayerView />;
}
