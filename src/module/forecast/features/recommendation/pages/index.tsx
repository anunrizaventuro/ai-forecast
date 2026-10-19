import { CONFIG } from 'src/shared/config';

import { RecommendationView } from '../views/recommendation-view';

// ----------------------------------------------------------------------

const metadata = { title: `Rekomendasi Stok - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>
      <RecommendationView />
    </>
  );
}
