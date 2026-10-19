import type { TranslationKeyInfo } from '../types';

import { useMemo } from 'react';

import { getAllTranslationKeys } from '../utils/translation-keys';

// ----------------------------------------------------------------------

export function useTranslationKeys(): TranslationKeyInfo[] {
  // Catalog is computed once at module load from glob-imported JSON bundles —
  // useMemo here is just to keep the reference stable across renders.
  return useMemo(() => getAllTranslationKeys(), []);
}
