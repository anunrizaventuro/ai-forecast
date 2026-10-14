import type { Metadata } from 'next';

import { SalesAnalysisView } from 'src/sections/forecast/view/sales-analysis-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'Analisis Penjualan' };

export default function Page() {
  return <SalesAnalysisView />;
}
