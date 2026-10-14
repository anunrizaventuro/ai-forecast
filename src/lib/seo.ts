import type { Article } from './api/articles';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

/**
 * Google Article structured data — all properties are "recommended" (none
 * required): https://developers.google.com/search/docs/appearance/structured-data/article
 */
export function articleJsonLd(article: Article, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    ...(article.excerpt && { description: article.excerpt }),
    ...(article.cover_url && { image: [article.cover_url] }),
    ...(article.published_at && { datePublished: article.published_at }),
    ...((article.updated_at ?? article.published_at) && {
      dateModified: article.updated_at ?? article.published_at,
    }),
    author: [{ '@type': 'Organization', name: article.author || CONFIG.appName }],
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };
}

/**
 * Google Organization structured data (knowledge panel / brand info):
 * https://developers.google.com/search/docs/appearance/structured-data/organization
 * Dirender di home page — contactPoint memakai link WhatsApp dari
 * site-content API bila tersedia.
 */
export function organizationJsonLd(options: { waLink?: string | null; email?: string } = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: CONFIG.appName,
    url: `${CONFIG.siteUrl}/`,
    logo: `${CONFIG.siteUrl}${CONFIG.assetsDir}/assets/brand/ai-forecast-icon.png`,
    ...(options.waLink || options.email
      ? {
          contactPoint: [
            {
              '@type': 'ContactPoint',
              contactType: 'customer service',
              ...(options.email && { email: options.email }),
              ...(options.waLink && { url: options.waLink }),
            },
          ],
        }
      : {}),
  };
}

/** WebSite structured data — identitas situs untuk hasil pencarian. */
export function webSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: CONFIG.appName,
    url: `${CONFIG.siteUrl}/`,
  };
}

/**
 * BreadcrumbList structured data:
 * https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
 * Item terakhir (halaman aktif) boleh tanpa `url`.
 */
export function breadcrumbListJsonLd(items: { name: string; url?: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      ...(item.url && { item: item.url }),
    })),
  };
}

/**
 * Serialize for a <script type="application/ld+json"> tag. Escaping `<`
 * blocks `</script>` breakout injection — official Next.js guidance:
 * https://nextjs.org/docs/app/guides/json-ld
 */
export function toJsonLdScript(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
