import { IS_API, useForecastQuery } from 'src/module/forecast/shared/hooks';

import { importKeys, getImportKinds, getImportHistory } from '../api';

// ----------------------------------------------------------------------
// Impor hanya ada di mode 'api' (butuh database kerja di backend).

export function useImportKinds() {
  return useForecastQuery(importKeys.kinds, (signal) => getImportKinds({ signal }), {
    enabled: IS_API,
  });
}

export function useImportHistory() {
  return useForecastQuery(importKeys.history, (signal) => getImportHistory({ signal }), {
    enabled: IS_API,
  });
}
