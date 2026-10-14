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
};
