import { z } from 'zod';

// ----------------------------------------------------------------------
// Skema env — modul murni (tanpa import.meta / import src lain) supaya bisa
// dipakai di dua tempat: saat build (vite.config.ts → build gagal bila env
// salah) dan saat runtime (src/shared/config → CONFIG).

// Var yang di-set tapi kosong ("") diperlakukan sama dengan tidak di-set.
const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

const str = z.preprocess(emptyToUndefined, z.string().optional());

export const envSchema = z
  .object({
    VITE_SERVER_URL: z.preprocess(emptyToUndefined, z.url().optional()),
    VITE_ASSETS_DIR: str.transform((v) => v ?? ''),
    // Sumber data forecast: 'simulasi' (generator dummy, tanpa backend) atau
    // 'api' (ai-forecast-be di VITE_SERVER_URL).
    VITE_FORECAST_SOURCE: z.preprocess(
      emptyToUndefined,
      z.enum(['simulasi', 'api']).default('simulasi')
    ),
    // Header X-Company-Slug — hanya dikirim bila diisi.
    VITE_COMPANY_SLUG: str.transform((v) => v ?? ''),
    VITE_FIREBASE_API_KEY: str.transform((v) => v ?? ''),
    VITE_FIREBASE_AUTH_DOMAIN: str.transform((v) => v ?? ''),
    VITE_FIREBASE_PROJECT_ID: str.transform((v) => v ?? ''),
  })
  .refine((env) => env.VITE_FORECAST_SOURCE !== 'api' || !!env.VITE_SERVER_URL, {
    path: ['VITE_SERVER_URL'],
    message: "wajib diisi bila VITE_FORECAST_SOURCE='api'",
  });

export type AppEnv = z.output<typeof envSchema>;

/** Validasi env; lempar Error berisi daftar field yang salah. */
export function parseEnv(raw: Record<string, unknown>): AppEnv {
  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `[env] Konfigurasi environment tidak valid:\n${detail}\n` +
        '→ Salin .env.example ke .env (atau .env.prod untuk Docker) lalu isi variabelnya.'
    );
  }

  return parsed.data;
}
