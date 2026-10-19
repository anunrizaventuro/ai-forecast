import { useState, useCallback } from 'react';

// ----------------------------------------------------------------------

export type TranslationOverrideDialogMode = 'new' | 'edit';

type State = {
  mode: TranslationOverrideDialogMode | null;
  // For 'new' mode: the translation_key being prefilled (when admin clicks
  // a row that has no existing override). For 'edit' mode: same key, the
  // existing row is looked up by key.
  key: string | null;
};

const INITIAL: State = { mode: null, key: null };

export function useTranslationOverrideDialog() {
  const [state, setState] = useState<State>(INITIAL);

  const open = useCallback((mode: TranslationOverrideDialogMode, key?: string) => {
    setState({ mode, key: key ?? null });
  }, []);

  const close = useCallback(() => setState(INITIAL), []);

  return { mode: state.mode, key: state.key, open, close };
}
