import type { ApiEnvelope } from 'src/module/core/features/auth/types';
import type {
  TranslationOverride,
  TranslationOverrideListData,
  CreateTranslationOverridePayload,
  UpdateTranslationOverridePayload,
} from '../types';

import { CONFIG } from 'src/shared/config';
import axios, { endpoints } from 'src/shared/lib/axios';

// ----------------------------------------------------------------------

async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const res = await promise;
  const payload = res.data;
  if (payload.data === null || payload.data === undefined) {
    throw new Error(
      (typeof payload.errors === 'string' ? payload.errors : undefined) ??
        payload.message ??
        'Empty response'
    );
  }
  return payload.data;
}

// ----------------------------------------------------------------------

export async function listTranslationOverrides(
  clientId: string
): Promise<TranslationOverrideListData> {
  return unwrap<TranslationOverrideListData>(
    axios.get(endpoints.core.translationOverrides.base(clientId))
  );
}

export function createTranslationOverride(
  clientId: string,
  payload: CreateTranslationOverridePayload
): Promise<TranslationOverride> {
  return unwrap<TranslationOverride>(
    axios.post(endpoints.core.translationOverrides.base(clientId), payload)
  );
}

export function updateTranslationOverride(
  clientId: string,
  key: string,
  payload: UpdateTranslationOverridePayload
): Promise<TranslationOverride> {
  return unwrap<TranslationOverride>(
    axios.put(endpoints.core.translationOverrides.byKey(clientId, key), payload)
  );
}

export async function deleteTranslationOverride(
  clientId: string,
  key: string
): Promise<{ key: string }> {
  await axios.delete(endpoints.core.translationOverrides.byKey(clientId, key));
  return { key };
}

// ----------------------------------------------------------------------
// Public bootstrap endpoint — no auth required, no admin role.
// Returns flat `{ key: value }` map keyed by `<namespace>:<path>`.
// Uses raw `fetch` to bypass the shared axios instance: the public endpoint
// must not trigger Bearer attachment or the 401 refresh loop.
// ----------------------------------------------------------------------

type PublicTranslationsEnvelope = {
  data: {
    client_id: string;
    slug: string;
    translations: Record<string, string>;
  } | null;
  message: string;
};

export async function fetchPublicTranslationOverrides(
  slug: string
): Promise<Record<string, string>> {
  const url = `${CONFIG.serverUrl}${endpoints.core.translationOverrides.public}?slug=${encodeURIComponent(slug)}`;
  const res = await fetch(url);
  if (!res.ok) {
    // Unknown slug / network blip → fall back to defaults silently
    return {};
  }
  const body = (await res.json()) as PublicTranslationsEnvelope;
  return body?.data?.translations ?? {};
}
