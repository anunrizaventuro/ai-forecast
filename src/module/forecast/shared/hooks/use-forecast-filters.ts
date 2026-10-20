import type { ForecastFilters } from 'src/module/forecast/shared/types';

import { useMemo, useState, useCallback } from 'react';

import { useForecastMeta } from './use-forecast-data';

// ----------------------------------------------------------------------
// Filter halaman dengan rentang tanggal default = seluruh periode data
// (meta.period). Selama pengguna belum memilih tanggal, rentang ikut periode
// terbaru — mis. setelah impor data Oktober, rentang otomatis sampai Oktober.

/** Periode data: mode api dari meta backend, mode simulasi tetap. */
export function useDataPeriod() {
  return useForecastMeta().meta.period;
}

type FilterState = {
  from: string | null;
  to: string | null;
  nit: string | null;
  product: ForecastFilters['product'];
};

export function useForecastFilters() {
  const period = useDataPeriod();
  const [state, setState] = useState<FilterState>({
    from: null,
    to: null,
    nit: null,
    product: null,
  });

  const filters = useMemo<ForecastFilters>(
    () => ({
      from: state.from ?? period.start,
      to: state.to ?? period.end,
      nit: state.nit,
      product: state.product,
    }),
    [state, period.start, period.end]
  );

  const update = useCallback(
    (patch: Partial<ForecastFilters>) => setState((prev) => ({ ...prev, ...patch })),
    []
  );

  return [filters, update] as const;
}
