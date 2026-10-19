import { useRef, useEffect, useCallback } from 'react';

import { useAuthContext } from 'src/module/core/features/auth/hooks/use-auth-context';

import { fetchPublicTranslationOverrides } from '../api';
import { resetOverridesI18n, applyOverridesToI18n } from '../utils/apply-overrides';

// ----------------------------------------------------------------------
// Headless app-shell sync. Pulls client-scoped translation overrides from
// the public bootstrap endpoint (no auth / admin role required) and pushes
// them into i18next so every user in the same client sees customized terms,
// not just admins who happen to open the management page.
//
// Refresh strategy:
//   - On mount + whenever `client.slug` changes (login, switch client)
//   - On tab focus, throttled to one fetch / 30s, so updates made by an
//     admin in another tab/session propagate within seconds when the user
//     comes back without hammering the endpoint.
//
// Mounted in `app.tsx` after `<AuthProvider>`. Renders nothing.
// ----------------------------------------------------------------------

const REFRESH_THROTTLE_MS = 30_000;

export function TranslationOverrideSync() {
  const { authenticated, client } = useAuthContext();
  const slug = client?.slug ?? null;

  const requestIdRef = useRef(0);
  const lastFetchAtRef = useRef(0);

  const refresh = useCallback(async (targetSlug: string) => {
    const requestId = ++requestIdRef.current;
    try {
      const map = await fetchPublicTranslationOverrides(targetSlug);
      if (requestId !== requestIdRef.current) return;
      lastFetchAtRef.current = Date.now();
      applyOverridesToI18n(map);
    } catch (err) {
      // Public endpoint failure must never break the app — fall back to defaults.
      console.error('[translation-override] sync failed:', err);
    }
  }, []);

  // Initial load + react to slug changes (login, switch client, logout).
  useEffect(() => {
    if (!authenticated || !slug) {
      requestIdRef.current += 1; // cancel any in-flight fetch
      lastFetchAtRef.current = 0;
      resetOverridesI18n();
      return;
    }
    refresh(slug);
  }, [authenticated, slug, refresh]);

  // Refetch when user tabs back, throttled so we don't refetch on every focus.
  useEffect(() => {
    if (!slug) return undefined;

    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastFetchAtRef.current < REFRESH_THROTTLE_MS) return;
      refresh(slug);
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [slug, refresh]);

  return null;
}
