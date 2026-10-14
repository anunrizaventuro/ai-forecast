import type { Metadata } from 'next';

import { StoreListView } from 'src/sections/forecast/view/store-list-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'Data Toko' };

export default function Page() {
  return <StoreListView />;
}
