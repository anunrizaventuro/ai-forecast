import type { Metadata } from 'next';

import { CarouselView } from 'src/sections/_examples/carousel-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Carousel | Components` };

export default function Page() {
  return <CarouselView />;
}
