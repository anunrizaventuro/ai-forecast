const ROOTS = {
  AUTH: '/auth',
};

export const paths = {
  faqs: '/faqs',
  auth: {
    jwt: {
      signIn: `${ROOTS.AUTH}/jwt/sign-in`,
      signUp: `${ROOTS.AUTH}/jwt/sign-up`,
    },
  },
  /**
   * Dashboard AI Forecast
   */
  dashboard: {
    root: '/',
    recommendation: '/rekomendasi-stok',
    salesAnalysis: '/analisis-penjualan',
    stores: '/toko',
    products: '/produk',
    spk: '/spk',
    spkDetail: (id: number) => `/spk/${id}`,
    dataImport: '/import-data',
    settings: '/pengaturan',
  },
  /**
   * Modul core skeleton — hanya terdaftar bila auth aktif (CONFIG.auth.skip = false)
   */
  core: {
    settings: {
      branches: '/settings/branches',
      roles: '/settings/roles',
      users: '/settings/users',
      translationOverride: '/settings/translation-override',
    },
  },
};

/** Path lama versi Next.js (`/dashboard/*`) → path baru, supaya bookmark tidak putus. */
export const legacyRedirects: { from: string; to: string }[] = [
  { from: '/dashboard', to: paths.dashboard.root },
  { from: '/dashboard/rekomendasi-stok', to: paths.dashboard.recommendation },
  { from: '/dashboard/analisis-penjualan', to: paths.dashboard.salesAnalysis },
  { from: '/dashboard/toko', to: paths.dashboard.stores },
  { from: '/dashboard/produk', to: paths.dashboard.products },
  { from: '/dashboard/pengaturan', to: paths.dashboard.settings },
];
