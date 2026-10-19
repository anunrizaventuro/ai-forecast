import { CONFIG } from 'src/shared/config';

import { ProductListView } from '../views/product-list-view';

// ----------------------------------------------------------------------

const metadata = { title: `Data Produk - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>
      <ProductListView />
    </>
  );
}
