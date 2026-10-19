import { useMemo } from 'react';

import { useAuthContext } from './use-auth-context';

export function usePermission() {
  const { permissions, isSuperAdmin } = useAuthContext();

  return useMemo(() => {
    const set = new Set(permissions);

    const can = (permission: string) => isSuperAdmin || set.has(permission);

    const canAny = (list: string[]) => isSuperAdmin || list.some((p) => set.has(p));

    const canAll = (list: string[]) => isSuperAdmin || list.every((p) => set.has(p));

    return { can, canAny, canAll, permissions, isSuperAdmin };
  }, [permissions, isSuperAdmin]);
}
