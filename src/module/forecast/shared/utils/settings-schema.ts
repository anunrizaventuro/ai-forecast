import type {
  ProductCode,
  SettingsVersion,
  ForecastSettings,
} from 'src/module/forecast/shared/types';

import { z } from 'zod';

import { PRODUCT_CODES } from 'src/module/forecast/shared/types';

// ----------------------------------------------------------------------
// Pengaturan perhitungan — default & rentang SAMA dengan forecast.Settings
// (DefaultSettings / Validate) di ai-forecast-be. Dipakai form dan pembacaan
// localStorage (mode simulasi).

export const DEFAULT_SETTINGS: ForecastSettings = {
  visitIntervalDays: 3,
  historyDays: 42,
  historyVisits: 4,
  minObservations: 2,
  method: 'rata-rata',
  stockUsablePct: 50,
  bsRiskPct: 15,
  maxChangePct: 50,
  roundTo: 1,
  roundMode: 'atas',
  shelfLifeDays: 10,
  productShelfLife: {},
};

const int = (min: number, max: number, unit = '') =>
  z
    .number({ message: 'Wajib diisi.' })
    .int('Harus bilangan bulat.')
    .min(min, `Minimal ${min}${unit}.`)
    .max(max, `Maksimal ${max}${unit}.`);

export const settingsSchema = z
  .object({
    visitIntervalDays: int(1, 14, ' hari'),
    historyDays: int(7, 180, ' hari'),
    historyVisits: int(2, 12, ' kunjungan'),
    minObservations: int(1, 12, ' kunjungan'),
    method: z.enum(['rata-rata', 'median']),
    stockUsablePct: int(0, 100, '%'),
    bsRiskPct: int(1, 100, '%'),
    maxChangePct: int(10, 300, '%'),
    roundTo: int(1, 50, ' pcs'),
    roundMode: z.enum(['atas', 'terdekat', 'bawah']),
    shelfLifeDays: int(1, 60, ' hari'),
    // Input kosong di form = pakai nilai umum → buang sebelum validasi.
    productShelfLife: z.preprocess(
      (value) =>
        Object.fromEntries(
          Object.entries((value ?? {}) as Record<string, unknown>).filter(
            ([, days]) => typeof days === 'number' && !Number.isNaN(days)
          )
        ),
      z.partialRecord(z.enum(PRODUCT_CODES), int(1, 60, ' hari'))
    ),
  })
  .superRefine((v, ctx) => {
    if (v.minObservations > v.historyVisits) {
      ctx.addIssue({
        code: 'custom',
        path: ['minObservations'],
        message: 'Tidak boleh melebihi jumlah kunjungan historis yang dipakai.',
      });
    }
  });

/** Kunci error 422 backend (snake_case) → field form. */
export const SETTINGS_API_FIELD: Record<string, keyof ForecastSettings> = {
  visit_interval_days: 'visitIntervalDays',
  history_days: 'historyDays',
  history_visits: 'historyVisits',
  min_observations: 'minObservations',
  method: 'method',
  stock_usable_pct: 'stockUsablePct',
  bs_risk_pct: 'bsRiskPct',
  max_change_pct: 'maxChangePct',
  round_to: 'roundTo',
  round_mode: 'roundMode',
  shelf_life_days: 'shelfLifeDays',
  product_shelf_life: 'productShelfLife',
};

/** Masa kedaluwarsa satu produk (pengecualian atau nilai umum). */
export const shelfLife = (s: ForecastSettings, code: ProductCode) =>
  s.productShelfLife[code] ?? s.shelfLifeDays;

// ---------------------------------------------------------------------- localStorage

const storedSchema = z.object({
  versions: z.array(
    z.object({
      version: z.number(),
      params: settingsSchema,
      note: z.string(),
      createdAt: z.string().nullable(),
    })
  ),
});

/** Riwayat versi tersimpan di browser (mode simulasi), terbaru dulu; [] bila kosong/rusak. */
export function parseStoredVersions(raw: string | null): SettingsVersion[] {
  if (!raw) return [];
  try {
    return storedSchema.parse(JSON.parse(raw)).versions as SettingsVersion[];
  } catch {
    return [];
  }
}

/** Sama isi (urutan kunci pengecualian produk tidak berpengaruh). */
export function sameSettings(a: ForecastSettings, b: ForecastSettings) {
  const norm = (s: ForecastSettings) =>
    JSON.stringify({
      ...s,
      productShelfLife: Object.fromEntries(
        Object.entries(s.productShelfLife).sort(([x], [y]) => x.localeCompare(y))
      ),
    });
  return norm(a) === norm(b);
}
