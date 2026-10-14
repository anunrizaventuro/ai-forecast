// ----------------------------------------------------------------------
// Centralized backend endpoint map (mirror of src/routes/paths.ts for API URLs).
// Contract: marketplace-be/docs/api-contract/marketplace/articles.md
//
// Paths are relative (no leading slash) so they resolve against ky's
// `baseUrl` even when it carries a path prefix.

export const endpoints = {
  articles: {
    list: 'api/articles',
    details: (slug: string) => `api/articles/${encodeURIComponent(slug)}`,
    categories: 'api/article-categories',
  },
  faq: {
    list: 'api/faq',
  },
  siteContent: {
    map: 'api/site-content',
  },
  /** ai-forecast-be — kontrak: ai-forecast-be/docs/api.md */
  forecast: {
    meta: 'api/v1/forecast/meta',
    summary: 'api/v1/forecast/summary',
    timeseries: 'api/v1/forecast/timeseries',
    products: 'api/v1/forecast/products',
    regions: 'api/v1/forecast/regions',
    stores: 'api/v1/forecast/stores',
    recommendations: 'api/v1/forecast/recommendations',
  },
};
