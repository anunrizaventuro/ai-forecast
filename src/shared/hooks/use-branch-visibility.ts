import { useMemo } from 'react';

import { useBranches } from 'src/module/core/features/branches/hooks/use-branches';

// ----------------------------------------------------------------------
// Single-branch users don't need to pick a branch — the field is hidden
// and the only branch is used by default. When there are 2+ branches, the
// field is shown and the BE's `is_default` flag picks the initial value.
//
// Reuse this across finance features (cash-transactions, fund-transfer,
// journal-entry, etc.) to keep behavior consistent.
// ----------------------------------------------------------------------

export function useBranchVisibility() {
  const { data, loading, error } = useBranches();

  const { showBranch, defaultBranchId, branchNameById } = useMemo(() => {
    const branches = data ?? [];
    const show = branches.length > 1;
    const fallback =
      branches.length === 1 ? branches[0].id : (branches.find((b) => b.is_default)?.id ?? '');
    const byId = new Map(branches.map((b) => [b.id, b.name] as const));
    return {
      showBranch: show,
      defaultBranchId: fallback,
      branchNameById: byId,
    };
  }, [data]);

  return {
    branches: data,
    showBranch,
    defaultBranchId,
    branchNameById,
    loading,
    error,
  };
}
