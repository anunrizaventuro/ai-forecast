import { CONFIG } from 'src/shared/config';

import { SalesAnalysisView } from '../views/sales-analysis-view';

// ----------------------------------------------------------------------

const metadata = { title: `Analisis Penjualan - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>
      <SalesAnalysisView />
    </>
  );
}
