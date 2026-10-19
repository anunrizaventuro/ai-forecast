import type { Role } from '../types';

import i18n from 'i18next';
import { useMemo, useState, useEffect } from 'react';

import { registerCompanyCacheInvalidator } from 'src/shared/lib/cache-registry';
import { useAuthContext } from 'src/module/core/features/auth/hooks/use-auth-context';

import { listRoles } from '../api';

// ----------------------------------------------------------------------
// Module-level cache for roles (small dataset, rarely changes)
// ----------------------------------------------------------------------

let cache: Role[] | null = null;
let inFlight: Promise<Role[]> | null = null;

function ensure(): Promise<Role[]> {
  if (cache) return Promise.resolve(cache);
  if (!inFlight) {
    inFlight = listRoles({ limit: 100, include_global: true })
      .then((res) => {
        cache = res.data;
        return res.data;
      })
      .catch((err) => {
        inFlight = null;
        throw err;
      });
  }
  return inFlight;
}

export function invalidateRolesCache() {
  cache = null;
  inFlight = null;
}

registerCompanyCacheInvalidator(invalidateRolesCache);

type State = {
  data: Role[];
  loading: boolean;
  error: string | null;
};

export function useRoles() {
  const { companyVersion } = useAuthContext();
  const [state, setState] = useState<State>(() => ({
    data: cache ?? [],
    loading: !cache,
    error: null,
  }));

  useEffect(() => {
    if (cache) {
      setState({ data: cache, loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    ensure()
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err) =>
        setState({
          data: [],
          loading: false,
          error: err instanceof Error ? err.message : i18n.t('roles:errors.loadData'),
        })
      );
  }, [companyVersion]);

  const byId = useMemo(() => new Map(state.data.map((r) => [r.id, r])), [state.data]);

  return {
    ...state,
    getById: (id: string | null | undefined) => (id ? byId.get(id) : undefined),
  };
}
