import type { NavSectionProps } from 'src/components/nav-section';

import { paths } from 'src/routes/paths';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

export const navDashboardData: NavSectionProps['data'] = [
  {
    subheader: 'AI Forecast',
    items: [
      {
        title: 'Dashboard',
        path: paths.dashboard.root,
        icon: <Iconify icon="solar:home-angle-linear" />,
      },
      {
        title: 'Rekomendasi Stok',
        path: paths.dashboard.recommendation,
        icon: <Iconify icon="carbon:delivery" />,
      },
      {
        title: 'Analisis Penjualan',
        path: paths.dashboard.salesAnalysis,
        icon: <Iconify icon="solar:presentation-graph-outline" />,
      },
    ],
  },
  {
    subheader: 'Data Master',
    items: [
      {
        title: 'Data Toko',
        path: paths.dashboard.stores,
        icon: <Iconify icon="carbon:location" />,
      },
      {
        title: 'Data Produk',
        path: paths.dashboard.products,
        icon: <Iconify icon="carbon:list-boxes" />,
      },
    ],
  },
];
