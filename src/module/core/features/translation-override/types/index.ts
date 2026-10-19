import type { ApiEnvelope } from 'src/module/core/features/auth/types';

// ----------------------------------------------------------------------

export type TranslationOverride = {
  id: string;
  client_id: string;
  translation_key: string;
  value: string;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
};

export type CreateTranslationOverridePayload = {
  translation_key: string;
  value: string;
  notes?: string | null;
};

export type UpdateTranslationOverridePayload = {
  value: string;
  notes?: string | null;
};

// BE returns `{ data: { items, total }, meta: null }` for the list endpoint —
// not the standard paginated envelope. The list isn't paginated server-side
// because per-client override rows are bounded.
export type TranslationOverrideListData = {
  items: TranslationOverride[];
  total: number;
};

export type TranslationOverrideListEnvelope = ApiEnvelope<TranslationOverrideListData>;

// FE-side flattened catalog of translation keys derived from JSON bundles.
export type TranslationKeyInfo = {
  // Fully-qualified key in the form `<namespace>:<dotted.path>` —
  // matches the i18next lookup format and is what BE persists.
  key: string;
  namespace: string;
  path: string;
  en: string;
  id: string;
};
