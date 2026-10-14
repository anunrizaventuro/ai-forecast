import { env } from 'src/lib/env';

import packageJson from '../package.json';

// ----------------------------------------------------------------------
// Semua env sudah divalidasi zod di src/lib/env.ts (fail-fast saat build bila
// var wajib hilang). Konsumsi konfigurasi lewat objek ini, bukan process.env.

export const CONFIG = {
  appName: 'AI Forecast',
  appDescription: 'Dashboard analisis distribusi roti dan rekomendasi stok.',
  appVersion: packageJson.version,
  assetsDir: env.NEXT_PUBLIC_ASSETS_DIR,
  /** Tampilkan galeri referensi /components di build production (dev selalu tampil). */
  showComponents: env.NEXT_PUBLIC_SHOW_COMPONENTS,
  /** Base URL backend Go (ai-forecast-be). */
  apiUrl: env.NEXT_PUBLIC_API_URL,
  /** Sumber data dashboard: 'simulasi' (dummy) atau 'api' (ai-forecast-be). */
  forecastSource: env.NEXT_PUBLIC_FORECAST_SOURCE,
  /** Tenant slug sent as X-Company-Slug on every public API call. */
  companySlug: env.NEXT_PUBLIC_COMPANY_SLUG,
  /**
   * Whitelabel client slug (level di atas company — lihat core/auth.md:
   * JWT membawa client_id + company_id). Dipakai untuk bootstrap translation
   * overrides (`GET /core/v1/translation-overrides?slug={client_slug}`) dan
   * endpoint yang me-resolve tenant via X-Client-Slug.
   */
  clientSlug: env.NEXT_PUBLIC_CLIENT_SLUG,
  /**
   * Public site origin — canonical URLs, OG tags, sitemap, robots.
   * Sudah ternormalisasi (tanpa trailing slash); production wajib di-set.
   */
  siteUrl: env.NEXT_PUBLIC_SITE_URL,
  /** Server-only: override URL API internal (k8s) untuk fetch RSC/sitemap. */
  serverApiUrl: env.API_URL,
};
