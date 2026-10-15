import type {
  KecSummary,
  CellSummary,
  ForecastMeta,
  StoreSummary,
  ProductSummary,
  Recommendation,
  RecommendationParams,
  RecommendationSettings,
} from 'src/types/forecast';

import { z } from 'zod';

import { PRODUCT_CODES } from 'src/types/forecast';

import { apiFetch } from './client';
import { endpoints } from './endpoints';

// ----------------------------------------------------------------------
// Schemas — cermin ai-forecast-be/docs/api.md. JSON backend snake_case
// dipetakan ke tipe UI camelCase (src/types/forecast.ts) DI SINI, sehingga
// drift kontrak gagal keras di batas fetch, bukan di dalam komponen.

// Go me-marshal slice nil sebagai null — normalkan ke [].
const list = <T extends z.ZodTypeAny>(item: T) =>
  z
    .array(item)
    .nullish()
    .transform((value) => (value ?? []) as z.output<T>[]);

const productCode = z.enum(PRODUCT_CODES);

const summaryShape = {
  kirim: z.number(),
  bs: z.number(),
  stock: z.number(),
  est_sold: z.number(),
  basis: z.number(),
  return_rate: z.number().nullable(),
  sell_through: z.number().nullable(),
  sales_value: z.number(),
  visits: z.number(),
  stores: z.number(),
};

type RawSummary = z.infer<z.ZodObject<typeof summaryShape>>;

const toSummary = (raw: RawSummary): CellSummary => ({
  kirim: raw.kirim,
  bs: raw.bs,
  stock: raw.stock,
  estSold: raw.est_sold,
  basis: raw.basis,
  returnRate: raw.return_rate,
  sellThrough: raw.sell_through,
  salesValue: raw.sales_value,
  visits: raw.visits,
  stores: raw.stores,
});

const productSchema = z
  .object({
    nir: z.string(),
    code: productCode,
    nama: z.string(),
    harga_beli: z.number(),
    harga_jual: z.number(),
  })
  .transform((p) => ({
    nir: p.nir,
    code: p.code,
    nama: p.nama,
    hargaBeli: p.harga_beli,
    hargaJual: p.harga_jual,
  }));

const storeSchema = z
  .object({ nit: z.string(), nama: z.string(), kec: z.number(), in_master: z.boolean() })
  .transform((s) => ({ nit: s.nit, nama: s.nama, kec: s.kec, inMaster: s.in_master }));

export const forecastMetaSchema = z
  .object({
    period: z.object({ start: z.string(), end: z.string() }),
    products: list(productSchema),
    stores: list(storeSchema),
    sales: list(z.string()),
  })
  .transform((m): ForecastMeta => ({ source: 'api', ...m }));

export const forecastSummarySchema = z.object(summaryShape).transform(toSummary);

export const forecastSeriesSchema = list(
  z
    .object({ key: z.string(), kirim: z.number(), est_sold: z.number(), bs: z.number() })
    .transform((p) => ({ key: p.key, kirim: p.kirim, estSold: p.est_sold, bs: p.bs }))
);

export const forecastProductRowsSchema = list(
  z
    .object({ product: productSchema, ...summaryShape })
    .transform(({ product, ...raw }): ProductSummary => ({ product, ...toSummary(raw) }))
);

export const forecastRegionRowsSchema = list(
  z
    .object({ kec: z.number(), ...summaryShape })
    .transform(({ kec, ...raw }): KecSummary => ({ kec, ...toSummary(raw) }))
);

export const forecastStoreRowsSchema = list(
  z
    .object({
      store: storeSchema,
      ...summaryShape,
      last_visit: z.string().nullable(),
      last_sales: z.string().nullable(),
      avg_interval: z.number().nullable(),
      product_count: z.number(),
    })
    .transform(
      ({ store, last_visit, last_sales, avg_interval, product_count, ...raw }): StoreSummary => ({
        store,
        ...toSummary(raw),
        lastVisit: last_visit,
        lastSales: last_sales,
        avgInterval: avg_interval,
        productCount: product_count,
      })
    )
);

export const forecastRecommendationsSchema = list(
  z
    .object({
      nit: z.string(),
      product: productCode,
      last_tgl: z.string(),
      last_kirim: z.number(),
      last_bs: z.number(),
      est_sold: z.number().nullable(),
      return_rate: z.number().nullable(),
      recommended: z.number().nullable(),
      delta: z.number().nullable(),
      confidence: z.enum(['tinggi', 'sedang', 'rendah']),
      basis: z.string(),
      signals: list(z.enum(['habis', 'retur-tinggi', 'dibatasi', 'fallback', 'pencilan'])),
      observations: z.number(),
      next_visit: z.string(),
      excluded: z.boolean(),
    })
    .transform(
      (r): Recommendation => ({
        nit: r.nit,
        product: r.product,
        lastTgl: r.last_tgl,
        lastKirim: r.last_kirim,
        lastBs: r.last_bs,
        estSold: r.est_sold,
        returnRate: r.return_rate,
        recommended: r.recommended,
        delta: r.delta,
        confidence: r.confidence,
        basis: r.basis,
        signals: r.signals,
        observations: r.observations,
        nextVisit: r.next_visit,
        excluded: r.excluded,
      })
    )
);

const recParamsSchema = z
  .object({
    window: z.number(),
    min_observations: z.number(),
    return_signal_enabled: z.boolean(),
    return_threshold: z.number(),
    return_window: z.number(),
    return_streak: z.number(),
    return_cut_unit: z.enum(['pcs', 'persen']),
    return_cut: z.number(),
    stockout_enabled: z.boolean(),
    stockout_streak: z.number(),
    stockout_bonus_unit: z.enum(['pcs', 'persen']),
    stockout_bonus: z.number(),
    max_step_ratio: z.number(),
    min_step: z.number(),
  })
  .transform(
    (p): RecommendationParams => ({
      window: p.window,
      minObservations: p.min_observations,
      returnSignalEnabled: p.return_signal_enabled,
      returnThreshold: p.return_threshold,
      returnWindow: p.return_window,
      returnStreak: p.return_streak,
      returnCutUnit: p.return_cut_unit,
      returnCut: p.return_cut,
      stockoutEnabled: p.stockout_enabled,
      stockoutStreak: p.stockout_streak,
      stockoutBonusUnit: p.stockout_bonus_unit,
      stockoutBonus: p.stockout_bonus,
      maxStepRatio: p.max_step_ratio,
      minStep: p.min_step,
    })
  );

export const forecastSettingsSchema = z
  .object({ params: recParamsSchema, defaults: recParamsSchema, updated_at: z.string().nullable() })
  .transform(
    (s): RecommendationSettings => ({
      params: s.params,
      defaults: s.defaults,
      updatedAt: s.updated_at,
    })
  );

const toRawParams = (p: RecommendationParams) => ({
  window: p.window,
  min_observations: p.minObservations,
  return_signal_enabled: p.returnSignalEnabled,
  return_threshold: p.returnThreshold,
  return_window: p.returnWindow,
  return_streak: p.returnStreak,
  return_cut_unit: p.returnCutUnit,
  return_cut: p.returnCut,
  stockout_enabled: p.stockoutEnabled,
  stockout_streak: p.stockoutStreak,
  stockout_bonus_unit: p.stockoutBonusUnit,
  stockout_bonus: p.stockoutBonus,
  max_step_ratio: p.maxStepRatio,
  min_step: p.minStep,
});

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
// Fetchers — dipanggil dari hooks client (dashboard tidak di-render server).

type FetchOptions = { signal?: AbortSignal };

const rangeParams = (p: ForecastRangeParams) => ({
  from: p.from,
  to: p.to,
  nit: p.nit,
  product: p.product,
});

export async function getForecastMeta(options: FetchOptions = {}) {
  const { data } = await apiFetch<unknown>(endpoints.forecast.meta, options);
  return forecastMetaSchema.parse(data);
}

export async function getForecastSummary(p: ForecastRangeParams, options: FetchOptions = {}) {
  const { data } = await apiFetch<unknown>(endpoints.forecast.summary, {
    params: rangeParams(p),
    ...options,
  });
  return forecastSummarySchema.parse(data);
}

export async function getForecastTimeseries(
  p: ForecastRangeParams,
  granularity: string,
  options: FetchOptions = {}
) {
  const { data } = await apiFetch<unknown>(endpoints.forecast.timeseries, {
    params: { ...rangeParams(p), granularity },
    ...options,
  });
  return forecastSeriesSchema.parse(data);
}

export async function getForecastProducts(p: ForecastRangeParams, options: FetchOptions = {}) {
  const { data } = await apiFetch<unknown>(endpoints.forecast.products, {
    params: rangeParams(p),
    ...options,
  });
  return forecastProductRowsSchema.parse(data);
}

export async function getForecastRegions(p: ForecastRangeParams, options: FetchOptions = {}) {
  const { data } = await apiFetch<unknown>(endpoints.forecast.regions, {
    params: rangeParams(p),
    ...options,
  });
  return forecastRegionRowsSchema.parse(data);
}

export async function getForecastStores(p: ForecastRangeParams, options: FetchOptions = {}) {
  const { data } = await apiFetch<unknown>(endpoints.forecast.stores, {
    params: rangeParams(p),
    ...options,
  });
  return forecastStoreRowsSchema.parse(data);
}

export async function getForecastRecommendations(
  p: ForecastRecommendationParams,
  options: FetchOptions = {}
) {
  const { data } = await apiFetch<unknown>(endpoints.forecast.recommendations, {
    params: { as_of: p.asOf, nit: p.nit, product: p.product },
    ...options,
  });
  return forecastRecommendationsSchema.parse(data);
}

export async function getForecastSettings(options: FetchOptions = {}) {
  const { data } = await apiFetch<unknown>(endpoints.forecast.settings, options);
  return forecastSettingsSchema.parse(data);
}

/** PUT params lengkap; 422 → ApiError.errors per field (snake_case). */
export async function updateForecastSettings(params: RecommendationParams) {
  const { data } = await apiFetch<unknown>(endpoints.forecast.settings, {
    method: 'put',
    body: toRawParams(params),
  });
  return forecastSettingsSchema.parse(data);
}
