import type { ForecastSettings } from 'src/module/forecast/shared/types';

import axios from 'src/shared/lib/axios';
import { unwrapNullable } from 'src/shared/api';

import { forecastEndpoints } from './endpoints';
import {
  toRawSettings,
  forecastMetaSchema,
  forecastSeriesSchema,
  forecastSummarySchema,
  forecastSettingsSchema,
  forecastStoreRowsSchema,
  forecastRegionRowsSchema,
  forecastProductRowsSchema,
  forecastSettingsHistorySchema,
  forecastRecommendationsSchema,
} from './schemas';

export * from './schemas';
export * from './endpoints';

// ----------------------------------------------------------------------
// Query params & keys — setiap filter yang sampai ke request WAJIB ada di key.

export type ForecastRangeParams = {
  from: string;
  to: string;
  nit?: string | null;
  product?: string | null;
};

export type ForecastRecommendationParams = {
  asOf: string;
  nit?: string | null;
  product?: string | null;
};

const rangeKey = (p: ForecastRangeParams) => ({
  from: p.from,
  to: p.to,
  nit: p.nit ?? '',
  product: p.product ?? '',
});

export const forecastKeys = {
  all: ['forecast'] as const,
  meta: ['forecast', 'meta'] as const,
  settings: ['forecast', 'settings'] as const,
  settingsHistory: ['forecast', 'settings', 'history'] as const,
  summary: (p: ForecastRangeParams) => [...forecastKeys.all, 'summary', rangeKey(p)] as const,
  timeseries: (p: ForecastRangeParams, granularity: string) =>
    [...forecastKeys.all, 'timeseries', rangeKey(p), granularity] as const,
  products: (p: ForecastRangeParams) => [...forecastKeys.all, 'products', rangeKey(p)] as const,
  regions: (p: ForecastRangeParams) => [...forecastKeys.all, 'regions', rangeKey(p)] as const,
  stores: (p: ForecastRangeParams) => [...forecastKeys.all, 'stores', rangeKey(p)] as const,
  recommendations: (p: ForecastRecommendationParams) =>
    [
      ...forecastKeys.all,
      'recommendations',
      { asOf: p.asOf, nit: p.nit ?? '', product: p.product ?? '' },
    ] as const,
};

// ----------------------------------------------------------------------
// Fetchers — axios bersama skeleton (src/shared/lib/axios.ts): error sudah
// dinormalisasi jadi ApiError (status + errors per field), pembatalan lewat
// `signal` diteruskan sebagai CanceledError.

type FetchOptions = { signal?: AbortSignal };

// Batas waktu per request (sama dengan klien versi Next).
const TIMEOUT = 10_000;

// Param kosong / null tidak dikirim.
function clean(params: Record<string, string | null | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') out[key] = value;
  }
  return out;
}

const rangeParams = (p: ForecastRangeParams) =>
  clean({ from: p.from, to: p.to, nit: p.nit, product: p.product });

function get(url: string, params: Record<string, string>, { signal }: FetchOptions) {
  return unwrapNullable<unknown>(axios.get(url, { params, signal, timeout: TIMEOUT }));
}

export async function getForecastMeta(options: FetchOptions = {}) {
  return forecastMetaSchema.parse(await get(forecastEndpoints.meta, {}, options));
}

export async function getForecastSummary(p: ForecastRangeParams, options: FetchOptions = {}) {
  return forecastSummarySchema.parse(await get(forecastEndpoints.summary, rangeParams(p), options));
}

export async function getForecastTimeseries(
  p: ForecastRangeParams,
  granularity: string,
  options: FetchOptions = {}
) {
  return forecastSeriesSchema.parse(
    await get(forecastEndpoints.timeseries, { ...rangeParams(p), granularity }, options)
  );
}

export async function getForecastProducts(p: ForecastRangeParams, options: FetchOptions = {}) {
  return forecastProductRowsSchema.parse(
    await get(forecastEndpoints.products, rangeParams(p), options)
  );
}

export async function getForecastRegions(p: ForecastRangeParams, options: FetchOptions = {}) {
  return forecastRegionRowsSchema.parse(
    await get(forecastEndpoints.regions, rangeParams(p), options)
  );
}

export async function getForecastStores(p: ForecastRangeParams, options: FetchOptions = {}) {
  return forecastStoreRowsSchema.parse(
    await get(forecastEndpoints.stores, rangeParams(p), options)
  );
}

export async function getForecastRecommendations(
  p: ForecastRecommendationParams,
  options: FetchOptions = {}
) {
  return forecastRecommendationsSchema.parse(
    await get(
      forecastEndpoints.recommendations,
      clean({ as_of: p.asOf, nit: p.nit, product: p.product }),
      options
    )
  );
}

export async function getForecastSettings(options: FetchOptions = {}) {
  return forecastSettingsSchema.parse(await get(forecastEndpoints.settings, {}, options));
}

export async function getForecastSettingsHistory(options: FetchOptions = {}) {
  return forecastSettingsHistorySchema.parse(
    await get(forecastEndpoints.settingsHistory, {}, options)
  );
}

/** PUT → versi baru; 422 → ApiError.errors per field (snake_case). */
export async function updateForecastSettings(params: ForecastSettings, note: string) {
  const data = await unwrapNullable<unknown>(
    axios.put(
      forecastEndpoints.settings,
      { params: toRawSettings(params), note },
      { timeout: TIMEOUT }
    )
  );
  return forecastSettingsSchema.parse(data);
}
