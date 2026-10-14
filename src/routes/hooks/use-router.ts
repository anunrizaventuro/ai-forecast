import { useMemo, useCallback } from 'react';
import { isEqualPath } from 'minimal-shared/utils';
import { useRouter as useNextRouter } from 'next/navigation';

import { startProgress } from 'src/components/progress-bar/tiny-progress';

// ----------------------------------------------------------------------

/**
 * Customized useRouter hook with top progress-bar integration.
 */

export function useRouter() {
  const nextRouter = useNextRouter();

  const push: ReturnType<typeof useNextRouter>['push'] = useCallback(
    (href, options) => {
      if (
        typeof window !== 'undefined' &&
        !isEqualPath(href, window.location.href, { deep: false })
      ) {
        startProgress();
      }
      nextRouter.push(href, options);
    },
    [nextRouter]
  );

  const replace: ReturnType<typeof useNextRouter>['replace'] = useCallback(
    (href, options) => {
      if (
        typeof window !== 'undefined' &&
        !isEqualPath(href, window.location.href, { deep: false })
      ) {
        startProgress();
      }
      nextRouter.replace(href, options);
    },
    [nextRouter]
  );

  const router = useMemo(
    () => ({
      ...nextRouter,
      push,
      replace,
    }),
    [nextRouter, push, replace]
  );

  return router;
}
