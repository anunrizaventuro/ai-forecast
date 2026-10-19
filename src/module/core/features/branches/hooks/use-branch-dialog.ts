import { useState, useCallback } from 'react';

// ----------------------------------------------------------------------

type DialogMode = 'new' | 'edit' | 'view';

type State = { mode: DialogMode | null; id: string | null };

export function useBranchDialog() {
  const [state, setState] = useState<State>({ mode: null, id: null });
  const open = useCallback((mode: DialogMode, id?: string) => {
    setState({ mode, id: id ?? null });
  }, []);
  const close = useCallback(() => setState({ mode: null, id: null }), []);
  return { mode: state.mode, id: state.id, open, close };
}
