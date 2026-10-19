import type { CompanyMembership } from '../types';

import { useState, useEffect, useCallback } from 'react';

import { getMyCompanies } from '../api';
import { useAuthContext } from './use-auth-context';

type State = {
  companies: CompanyMembership[];
  loading: boolean;
  error: string | null;
};

export function useCompanies() {
  const { authenticated } = useAuthContext();
  const [state, setState] = useState<State>({ companies: [], loading: false, error: null });

  const fetch = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getMyCompanies();
      setState({ companies: data, loading: false, error: null });
    } catch (error) {
      setState({
        companies: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load companies',
      });
    }
  }, []);

  useEffect(() => {
    if (authenticated) fetch();
  }, [authenticated, fetch]);

  return { ...state, refetch: fetch };
}
