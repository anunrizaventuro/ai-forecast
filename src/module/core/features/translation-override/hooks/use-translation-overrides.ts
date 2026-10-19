import type { TranslationOverride } from '../types';

import i18n from 'i18next';
import { useRef, useState, useEffect, useCallback } from 'react';

import { useAuthContext } from 'src/module/core/features/auth/hooks/use-auth-context';

import { listTranslationOverrides } from '../api';

// ----------------------------------------------------------------------

type State = {
  data: TranslationOverride[];
  loading: boolean;
  error: string | null;
};

const INITIAL: State = { data: [], loading: false, error: null };

export function useTranslationOverrides() {
  const { client } = useAuthContext();
  const clientId = client?.id ?? null;

  const [state, setState] = useState<State>(INITIAL);
  const requestIdRef = useRef(0);

  const load = useCallback(async (id: string) => {
    const requestId = ++requestIdRef.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const response = await listTranslationOverrides(id);
      if (requestId !== requestIdRef.current) return;
      setState({ data: response.items ?? [], loading: false, error: null });
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setState({
        data: [],
        loading: false,
        error: err instanceof Error ? err.message : i18n.t('translation-override:errors.loadData'),
      });
    }
  }, []);

  useEffect(() => {
    if (!clientId) {
      setState(INITIAL);
      return;
    }
    load(clientId);
  }, [clientId, load]);

  const refresh = useCallback(() => {
    if (clientId) load(clientId);
  }, [clientId, load]);

  return { ...state, clientId, refresh };
}
