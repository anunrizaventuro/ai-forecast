import type { Metadata } from 'next';

import { ProductListView } from 'src/sections/forecast/view/product-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'Data Produk' };

export default function Page() {
  return <ProductListView />;
}
