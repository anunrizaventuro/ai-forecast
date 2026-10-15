'use client';

import type {
  KecSummary,
  CellSummary,
  Granularity,
  MasterStore,
  SeriesPoint,
  ForecastMeta,
  StoreSummary,
  MasterProduct,
  ProductSummary,
  Recommendation,
  ForecastFilters,
} from 'src/types/forecast';

import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';

import { CONFIG } from 'src/global-config';
import {
  forecastKeys,
  getForecastMeta,
  getForecastStores,
  getForecastRegions,
  getForecastSummary,
  getForecastProducts,
  getForecastTimeseries,
  getForecastRecommendations,
} from 'src/lib/api';

import { useRecommendationParams } from './use-recommendation-params';
import {
  PERIOD,
  stores,
  products,
  summarize,
  salesCodes,
  timeSeries,
  groupByKec,
  filterCells,
  seriesLabel,
  groupByStore,
  forecastCells,
  groupByProduct,
  computeRecommendations,
} from './forecast-utils';

// ----------------------------------------------------------------------
// Satu antarmuka data untuk semua halaman dashboard, dua sumber:
// - 'simulasi' → dihitung di client dari generator dummy (forecast-utils).
// - 'api'      → ai-forecast-be via src/lib/api (TanStack Query).
// Sumber dipilih saat build lewat NEXT_PUBLIC_FORECAST_SOURCE, jadi cabang di
// bawah konstan selama runtime (urutan hook tidak pernah berubah).

export const IS_API = CONFIG.forecastSource === 'api';

export type ForecastResult<T> = {
  data: T | undefined;
  /** Belum ada data sama sekali (muat pertama). */
  loading: boolean;
  /** Sedang mengambil ulang; data lama tetap ditampilkan. */
  fetching: boolean;
  error: Error | null;
  refetch: () => void;
};

const noop = () => undefined;

function useForecastSource<T>(
  queryKey: readonly unknown[],
  fetcher: (signal: AbortSignal) => Promise<T>,
  simulate: () => T,
  enabled = true
): ForecastResult<T> {
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => fetcher(signal),
    enabled: IS_API && enabled,
    placeholderData: keepPreviousData,
  });

  const keyString = JSON.stringify(queryKey);
  const simulated = useMemo(
    () => (IS_API || !enabled ? undefined : simulate()),
    // Key sudah memuat seluruh input simulasi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [keyString, enabled]
  );

  if (!IS_API) {
    return { data: simulated, loading: false, fetching: false, error: null, refetch: noop };
  }

  return {
    data: query.data,
    loading: enabled && query.isPending,
    fetching: query.isFetching,
    error: query.error,
    refetch: () => {
      query.refetch();
    },
  };
}

// ---------------------------------------------------------------------- Meta

const SIMULATED_META: ForecastMeta = {
  source: 'simulasi',
  period: { start: PERIOD.start, end: PERIOD.end },
  products,
  stores,
  sales: salesCodes,
};

export type ForecastMetaResult = ForecastResult<ForecastMeta> & {
  meta: ForecastMeta;
  storeMap: Map<string, MasterStore>;
  productMap: Map<string, MasterProduct>;
};

const EMPTY_META: ForecastMeta = {
  source: 'api',
  period: { start: PERIOD.start, end: PERIOD.end },
  products: [],
  stores: [],
  sales: [],
};

/** Master toko/produk/sales + periode. Di-cache permanen per sesi. */
export function useForecastMeta(): ForecastMetaResult {
  const query = useQuery({
    queryKey: forecastKeys.meta,
    queryFn: ({ signal }) => getForecastMeta({ signal }),
    enabled: IS_API,
    staleTime: Infinity,
  });

  const meta = IS_API ? (query.data ?? EMPTY_META) : SIMULATED_META;

  const maps = useMemo(
    () => ({
      storeMap: new Map(meta.stores.map((s) => [s.nit, s])),
      productMap: new Map(meta.products.map((p) => [p.code as string, p])),
    }),
    [meta]
  );

  return {
    meta,
    ...maps,
    data: meta,
    loading: IS_API && query.isPending,
    fetching: IS_API && query.isFetching,
    error: IS_API ? query.error : null,
    refetch: () => {
      query.refetch();
    },
  };
}

// ---------------------------------------------------------------------- Data

export function useForecastSummary(filters: ForecastFilters) {
  return useForecastSource<CellSummary>(
    forecastKeys.summary(filters),
    (signal) => getForecastSummary(filters, { signal }),
    () => summarize(filterCells(forecastCells, filters))
  );
}

export function useForecastSeries(filters: ForecastFilters, granularity: Granularity) {
  const result = useForecastSource(
    forecastKeys.timeseries(filters, granularity),
    (signal) => getForecastTimeseries(filters, granularity, { signal }),
    () => timeSeries(filterCells(forecastCells, filters), filters.from, filters.to, granularity)
  );

  // Label dibentuk di client agar format tanggal konsisten untuk kedua sumber.
  const data = useMemo<SeriesPoint[] | undefined>(
    () => result.data?.map((point) => ({ ...point, label: seriesLabel(point.key, granularity) })),
    [result.data, granularity]
  );

  return { ...result, data };
}

export function useForecastProducts(filters: ForecastFilters) {
  return useForecastSource<ProductSummary[]>(
    forecastKeys.products(filters),
    (signal) => getForecastProducts(filters, { signal }),
    () => groupByProduct(filterCells(forecastCells, filters))
  );
}

export function useForecastRegions(filters: ForecastFilters) {
  return useForecastSource<KecSummary[]>(
    forecastKeys.regions(filters),
    (signal) => getForecastRegions(filters, { signal }),
    () => groupByKec(filterCells(forecastCells, filters))
  );
}

export function useForecastStores(filters: ForecastFilters) {
  return useForecastSource<StoreSummary[]>(
    forecastKeys.stores(filters),
    (signal) => getForecastStores(filters, { signal }),
    // Sama dengan API: hanya toko yang aktif di rentang.
    () => groupByStore(filterCells(forecastCells, filters)).filter((row) => row.visits > 0)
  );
}

export function useForecastRecommendations(
  params: { asOf: string; nit?: string | null; product?: string | null },
  enabled = true
) {
  const { params: recParams } = useRecommendationParams();

  return useForecastSource<Recommendation[]>(
    // Mode simulasi: params aturan ikut key agar hasil dihitung ulang saat
    // pengaturan berubah. Mode api: server memakai params tersimpan.
    IS_API
      ? forecastKeys.recommendations(params)
      : [...forecastKeys.recommendations(params), recParams],
    (signal) => getForecastRecommendations(params, { signal }),
    () =>
      computeRecommendations(
        filterCells(forecastCells, {
          nit: params.nit ?? null,
          product: (params.product ?? null) as ForecastFilters['product'],
        }),
        params.asOf,
        recParams
      ),
    enabled
  );
}
