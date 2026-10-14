import type { MetadataRoute } from 'next';

// ----------------------------------------------------------------------
// AI Forecast adalah dashboard internal — tidak ada halaman publik untuk
// diindeks, jadi seluruh situs di-disallow dan tidak ada sitemap.

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  };
}
