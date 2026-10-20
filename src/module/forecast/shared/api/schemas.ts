import type {
  VisitRow,
  KecSummary,
  PairDetail,
  CellSummary,
  ForecastMeta,
  StoreSummary,
  PairAnalysis,
  SettingsState,
  ProductSummary,
  Recommendation,
  SettingsVersion,
  ForecastSettings,
} from 'src/module/forecast/shared/types';

import { z } from 'zod';

import { PRODUCT_CODES } from 'src/module/forecast/shared/types';

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

export const productCode = z.enum(PRODUCT_CODES);

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
  cells_complete: z.number(),
  cells_insufficient: z.number(),
  cells_check: z.number(),
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
  cellsComplete: raw.cells_complete,
  cellsInsufficient: raw.cells_insufficient,
  cellsCheck: raw.cells_check,
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

export const settingsParamsSchema = z
  .object({
    visit_interval_days: z.number(),
    history_days: z.number(),
    history_visits: z.number(),
    min_observations: z.number(),
    method: z.enum(['rata-rata', 'median']),
    stock_usable_pct: z.number(),
    bs_risk_pct: z.number(),
    max_change_pct: z.number(),
    round_to: z.number(),
    round_mode: z.enum(['atas', 'terdekat', 'bawah']),
    shelf_life_days: z.number(),
    product_shelf_life: z.partialRecord(productCode, z.number()).nullish(),
  })
  .transform(
    (p): ForecastSettings => ({
      visitIntervalDays: p.visit_interval_days,
      historyDays: p.history_days,
      historyVisits: p.history_visits,
      minObservations: p.min_observations,
      method: p.method,
      stockUsablePct: p.stock_usable_pct,
      bsRiskPct: p.bs_risk_pct,
      maxChangePct: p.max_change_pct,
      roundTo: p.round_to,
      roundMode: p.round_mode,
      shelfLifeDays: p.shelf_life_days,
      productShelfLife: p.product_shelf_life ?? {},
    })
  );

const settingsVersionShape = {
  version: z.number(),
  params: settingsParamsSchema,
  note: z.string(),
  created_at: z.string().nullable(),
};

export const forecastSettingsSchema = z
  .object({
    version: z.number(),
    params: settingsParamsSchema,
    defaults: settingsParamsSchema,
    note: z.string(),
    updated_at: z.string().nullable(),
  })
  .transform(
    (s): SettingsState => ({
      version: s.version,
      params: s.params,
      defaults: s.defaults,
      note: s.note,
      createdAt: s.updated_at,
    })
  );

export const forecastSettingsHistorySchema = list(
  z.object(settingsVersionShape).transform(
    (s): SettingsVersion => ({
      version: s.version,
      params: s.params,
      note: s.note,
      createdAt: s.created_at,
    })
  )
);

export const toRawSettings = (p: ForecastSettings) => ({
  visit_interval_days: p.visitIntervalDays,
  history_days: p.historyDays,
  history_visits: p.historyVisits,
  min_observations: p.minObservations,
  method: p.method,
  stock_usable_pct: p.stockUsablePct,
  bs_risk_pct: p.bsRiskPct,
  max_change_pct: p.maxChangePct,
  round_to: p.roundTo,
  round_mode: p.roundMode,
  shelf_life_days: p.shelfLifeDays,
  product_shelf_life: p.productShelfLife,
});

// ---------------------------------------------------------------------- Analisis

const cellStatus = z.enum(['lengkap', 'belum-cukup', 'perlu-diperiksa']);
const cellReason = z.enum([
  '',
  'kunjungan-pertama',
  'kiriman-sebelumnya-tidak-tercatat',
  'sisa-sebelumnya-tidak-tercatat',
  'sisa-tidak-tercatat',
  'bs-tidak-tercatat',
  'hasil-negatif',
  'kiriman-sebelumnya-pencilan',
]);

const pairAnalysisSchema = z
  .object({
    nit: z.string(),
    product: productCode,
    observations: z.number(),
    checks: z.number(),
    insufficient: z.number(),
    data_from: z.string().nullable(),
    data_to: z.string().nullable(),
    last_visit: z.string(),
    last_kirim: z.number(),
    last_stock: z.number(),
    last_bs: z.number(),
    avg_kirim: z.number(),
    sold_per_day: z.number().nullable(),
    sold_per_visit: z.number().nullable(),
    avg_stock: z.number().nullable(),
    bs_rate: z.number().nullable(),
    trend: z.enum(['naik', 'turun', 'stabil', 'belum-bisa-dinilai']),
    risk: z.enum(['kelebihan', 'kekurangan', 'wajar', 'belum-cukup']),
    risk_reason: z.string(),
  })
  .transform(
    (r): PairAnalysis => ({
      nit: r.nit,
      product: r.product,
      observations: r.observations,
      checks: r.checks,
      insufficient: r.insufficient,
      dataFrom: r.data_from,
      dataTo: r.data_to,
      lastVisit: r.last_visit,
      lastKirim: r.last_kirim,
      lastStock: r.last_stock,
      lastBs: r.last_bs,
      avgKirim: r.avg_kirim,
      soldPerDay: r.sold_per_day,
      soldPerVisit: r.sold_per_visit,
      avgStock: r.avg_stock,
      bsRate: r.bs_rate,
      trend: r.trend,
      risk: r.risk,
      riskReason: r.risk_reason,
    })
  );

export const forecastAnalysisSchema = list(pairAnalysisSchema);

const visitRowSchema = z
  .object({
    tgl: z.string(),
    prev_tgl: z.string().nullable(),
    days: z.number(),
    stock_start: z.number().nullable(),
    prev_kirim: z.number().nullable(),
    kirim: z.number(),
    stock: z.number(),
    bs: z.number(),
    est_sold: z.number().nullable(),
    per_day: z.number().nullable(),
    status: cellStatus,
    reason: cellReason,
    used: z.boolean(),
    nik: z.string(),
  })
  .transform(
    (r): VisitRow => ({
      tgl: r.tgl,
      prevTgl: r.prev_tgl,
      days: r.days,
      stockStart: r.stock_start,
      prevKirim: r.prev_kirim,
      kirim: r.kirim,
      stock: r.stock,
      bs: r.bs,
      estSold: r.est_sold,
      perDay: r.per_day,
      status: r.status,
      reason: r.reason,
      used: r.used,
      nik: r.nik,
    })
  );

export const forecastPairDetailSchema = z
  .object({ analysis: pairAnalysisSchema, history: list(visitRowSchema) })
  .transform((d): PairDetail => ({ analysis: d.analysis, history: d.history }));
