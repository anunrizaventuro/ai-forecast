import type { RecommendationParams } from 'src/types/forecast';

import { z } from 'zod';

// ----------------------------------------------------------------------
// Schema form pengaturan rekomendasi. Persen ditampilkan sebagai bilangan
// bulat (15 = 15%); dikonversi ke rasio di toParams. Rentang = Params.Validate
// di ai-forecast-be.

const int = (min: number, max: number) =>
  z
    .number({ message: 'Wajib diisi.' })
    .int('Harus bilangan bulat.')
    .min(min, `Minimal ${min}.`)
    .max(max, `Maksimal ${max}.`);

export const recParamsFormSchema = z
  .object({
    returnThresholdPct: int(1, 100),
    returnWindow: int(1, 8),
    returnStreak: int(1, 8),
    returnCutUnit: z.enum(['pcs', 'persen']),
    returnCut: int(1, 90),
    stockoutBonus: int(0, 20),
    window: int(1, 12),
    minObservations: int(1, 12),
    maxStepPct: int(5, 100),
    minStep: int(0, 50),
  })
  .superRefine((v, ctx) => {
    if (v.returnStreak > v.returnWindow) {
      ctx.addIssue({
        code: 'custom',
        path: ['returnStreak'],
        message: 'Tidak boleh melebihi jumlah kunjungan untuk rasio retur.',
      });
    }
    if (v.minObservations > v.window) {
      ctx.addIssue({
        code: 'custom',
        path: ['minObservations'],
        message: 'Tidak boleh melebihi jumlah kunjungan dasar.',
      });
    }
    if (v.returnCutUnit === 'pcs' && v.returnCut > 50) {
      ctx.addIssue({ code: 'custom', path: ['returnCut'], message: 'Maksimal 50 pcs.' });
    }
  });

export type RecParamsFormValues = z.infer<typeof recParamsFormSchema>;

const pct = (ratio: number) => Math.round(ratio * 100);

export const toFormValues = (p: RecommendationParams): RecParamsFormValues => ({
  returnThresholdPct: pct(p.returnThreshold),
  returnWindow: p.returnWindow,
  returnStreak: p.returnStreak,
  returnCutUnit: p.returnCutUnit,
  returnCut: p.returnCutUnit === 'persen' ? pct(p.returnCut) : p.returnCut,
  stockoutBonus: p.stockoutBonus,
  window: p.window,
  minObservations: p.minObservations,
  maxStepPct: pct(p.maxStepRatio),
  minStep: p.minStep,
});

export const toParams = (v: RecParamsFormValues): RecommendationParams => ({
  window: v.window,
  minObservations: v.minObservations,
  returnThreshold: v.returnThresholdPct / 100,
  returnWindow: v.returnWindow,
  returnStreak: v.returnStreak,
  returnCutUnit: v.returnCutUnit,
  returnCut: v.returnCutUnit === 'persen' ? v.returnCut / 100 : v.returnCut,
  stockoutBonus: v.stockoutBonus,
  maxStepRatio: v.maxStepPct / 100,
  minStep: v.minStep,
});

/** Kunci error 422 backend (snake_case) → field form. */
export const API_FIELD_TO_FORM: Record<string, keyof RecParamsFormValues> = {
  window: 'window',
  min_observations: 'minObservations',
  return_threshold: 'returnThresholdPct',
  return_window: 'returnWindow',
  return_streak: 'returnStreak',
  return_cut_unit: 'returnCutUnit',
  return_cut: 'returnCut',
  stockout_bonus: 'stockoutBonus',
  max_step_ratio: 'maxStepPct',
  min_step: 'minStep',
};

const storedSchema = z.object({
  params: z.object({
    window: z.number(),
    minObservations: z.number(),
    returnThreshold: z.number(),
    returnWindow: z.number(),
    returnStreak: z.number(),
    returnCutUnit: z.enum(['pcs', 'persen']),
    returnCut: z.number(),
    stockoutBonus: z.number(),
    maxStepRatio: z.number(),
    minStep: z.number(),
  }),
  updatedAt: z.string().nullable(),
});

export type StoredRecSettings = z.infer<typeof storedSchema>;

/** Isi localStorage → settings tervalidasi, atau null bila kosong/rusak/di luar rentang. */
export function parseStoredSettings(raw: string | null): StoredRecSettings | null {
  if (!raw) return null;
  try {
    const stored = storedSchema.parse(JSON.parse(raw));
    return recParamsFormSchema.safeParse(toFormValues(stored.params)).success ? stored : null;
  } catch {
    return null;
  }
}
