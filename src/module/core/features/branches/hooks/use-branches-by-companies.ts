import type { Branch } from '../types';

import i18n from 'i18next';
import { useMemo, useState, useEffect } from 'react';

import { useAuthContext } from 'src/module/core/features/auth/hooks/use-auth-context';

import { listBranchesByCompanies } from '../api';

// ----------------------------------------------------------------------

type State = {
  data: Branch[];
  loading: boolean;
  error: string | null;
};

export function useBranchesByCompanies(companyIds: string[]) {
  const { companyVersion } = useAuthContext();

  // Sort so toggling in different order doesn't refetch unnecessarily.
  const key = useMemo(() => [...companyIds].sort().join(','), [companyIds]);

  const [state, setState] = useState<State>({ data: [], loading: false, error: null });

  useEffect(() => {
    if (!key) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    setState((s) => ({ ...s, loading: true, error: null }));
    listBranchesByCompanies({ company_ids: key.split(','), is_active: true, limit: 100 })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err) =>
        setState({
          data: [],
          loading: false,
          error: err instanceof Error ? err.message : i18n.t('branches:errors.loadData'),
        })
      );
  }, [key, companyVersion]);

  return state;
}
