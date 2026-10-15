// ----------------------------------------------------------------------
// Semua string route terpusat di sini — jangan hardcode URL di komponen.
//
// Kebijakan trailing slash: entri di bawah TANPA trailing slash (Next
// menormalkan saat navigasi karena `trailingSlash: true`). Untuk URL yang
// dipublikasikan ke crawler (canonical, sitemap, JSON-LD), SELALU tambahkan
// '/' di akhir — gunakan `pathWithSlash()` supaya konsisten.

export const pathWithSlash = (path: string) => (path.endsWith('/') ? path : `${path}/`);

export const paths = {
  home: '/',
  /**
   * Dashboard AI Forecast (admin)
   */
  dashboard: {
    root: '/dashboard',
    recommendation: '/dashboard/rekomendasi-stok',
    salesAnalysis: '/dashboard/analisis-penjualan',
    stores: '/dashboard/toko',
    products: '/dashboard/produk',
    settings: '/dashboard/pengaturan',
  },
  /**
   * Common
   */
  maintenance: '/maintenance',
  comingSoon: '/coming-soon',
  page404: '/error/404',
  page500: '/error/500',
  /**
   * Others
   */
  blank: '/blank',
  components: '/components',
};
