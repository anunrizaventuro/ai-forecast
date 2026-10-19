import type { Branch } from '../types';

import { useMemo, useState, useEffect } from 'react';

import { registerCompanyCacheInvalidator } from 'src/shared/lib/cache-registry';
import { useAuthContext } from 'src/module/core/features/auth/hooks/use-auth-context';

import { listBranches } from '../api';

// ----------------------------------------------------------------------
// Module-level cache so multiple components don't N+1 fetch.
// Cache stays for app lifetime; if company switch ever needs to invalidate,
// call `invalidateBranchesCache()` from auth context.
// ----------------------------------------------------------------------

let cache: Branch[] | null = null;
let inFlight: Promise<Branch[]> | null = null;

function ensure(): Promise<Branch[]> {
  if (cache) return Promise.resolve(cache);
  if (!inFlight) {
    inFlight = listBranches({ is_active: true, limit: 100 })
      .then((data) => {
        cache = data;
        return data;
      })
      .catch((err) => {
        inFlight = null; // allow retry
        throw err;
      });
  }
  return inFlight;
}

export function invalidateBranchesCache() {
  cache = null;
  inFlight = null;
}

registerCompanyCacheInvalidator(invalidateBranchesCache);

type State = {
  data: Branch[];
  loading: boolean;
  error: string | null;
};

export function useBranches() {
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
          error: err instanceof Error ? err.message : 'Gagal memuat cabang.',
        })
      );
  }, [companyVersion]);

  const byId = useMemo(() => new Map(state.data.map((b) => [b.id, b])), [state.data]);

  return {
    ...state,
    getById: (id: string | null | undefined) => (id ? byId.get(id) : undefined),
  };
}
