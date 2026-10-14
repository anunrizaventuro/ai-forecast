import type { Metadata } from 'next';

import { RecommendationView } from 'src/sections/forecast/view/recommendation-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'Rekomendasi Stok' };

export default function Page() {
  return <RecommendationView />;
}
