'use client';

import type { ArticleListFilters } from './articles';

import { useQuery, keepPreviousData } from '@tanstack/react-query';

import { articleKeys, getArticles, getArticleCategories } from './articles';

// ----------------------------------------------------------------------

export function useArticlesQuery(filters: ArticleListFilters) {
  return useQuery({
    queryKey: articleKeys.list(filters),
    // Meneruskan `signal` membuat TanStack membatalkan request yang masih
    // terbang saat unmount / ganti filter — tanpa ini responsnya dibuang
    // tapi koneksinya tetap jalan sampai selesai.
    queryFn: ({ signal }) => getArticles(filters, { signal }),
    // Keep showing the previous page while the next filter/page loads.
    placeholderData: keepPreviousData,
  });
}

export function useArticleCategoriesQuery() {
  return useQuery({
    queryKey: articleKeys.categories,
    queryFn: ({ signal }) => getArticleCategories(undefined, { signal }),
    staleTime: 5 * 60 * 1000,
  });
}
