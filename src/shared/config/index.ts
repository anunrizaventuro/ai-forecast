import { z } from 'zod';

import { paths } from 'src/routes/paths';

import packageJson from '../../../package.json';

// ----------------------------------------------------------------------
// Satu-satunya tempat env dibaca & divalidasi (zod), sekali saat module load.
// Vite meng-inline `import.meta.env.VITE_*` saat build — mengubah nilainya
// butuh build ulang. Var yang salah bentuk menggagalkan boot dengan pesan
// jelas, bukan diam-diam fallback lalu rusak di runtime.

// Var yang di-set tapi kosong ("") diperlakukan sama dengan tidak di-set.
const emptyToUndefined = (value: string | undefined) => (value === '' ? undefined : value);

const rawEnv = {
  VITE_SERVER_URL: emptyToUndefined(import.meta.env.VITE_SERVER_URL),
  VITE_ASSETS_DIR: emptyToUndefined(import.meta.env.VITE_ASSETS_DIR),
  VITE_FORECAST_SOURCE: emptyToUndefined(import.meta.env.VITE_FORECAST_SOURCE),
  VITE_COMPANY_SLUG: emptyToUndefined(import.meta.env.VITE_COMPANY_SLUG),
  VITE_FIREBASE_API_KEY: emptyToUndefined(import.meta.env.VITE_FIREBASE_API_KEY),
  VITE_FIREBASE_AUTH_DOMAIN: emptyToUndefined(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN),
  VITE_FIREBASE_PROJECT_ID: emptyToUndefined(import.meta.env.VITE_FIREBASE_PROJECT_ID),
};

const schema = z
  .object({
    VITE_SERVER_URL: z.url().optional(),
    VITE_ASSETS_DIR: z.string().default(''),
    // Sumber data forecast: 'simulasi' (generator dummy, tanpa backend) atau
    // 'api' (ai-forecast-be di VITE_SERVER_URL).
    VITE_FORECAST_SOURCE: z.enum(['simulasi', 'api']).default('simulasi'),
    // Header X-Company-Slug — hanya dikirim bila diisi.
    VITE_COMPANY_SLUG: z.string().default(''),
    VITE_FIREBASE_API_KEY: z.string().default(''),
    VITE_FIREBASE_AUTH_DOMAIN: z.string().default(''),
    VITE_FIREBASE_PROJECT_ID: z.string().default(''),
  })
  .refine((env) => env.VITE_FORECAST_SOURCE !== 'api' || !!env.VITE_SERVER_URL, {
    path: ['VITE_SERVER_URL'],
    message: "wajib diisi bila VITE_FORECAST_SOURCE='api'",
  });

const parsed = schema.safeParse(rawEnv);

if (!parsed.success) {
  const detail = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  throw new Error(
    `[env] Konfigurasi environment tidak valid:\n${detail}\n` +
      '→ Salin .env.example ke .env lalu isi variabelnya (lihat komentar di dalam file).'
  );
}

const env = parsed.data;

// ----------------------------------------------------------------------

export type ConfigValue = {
  appName: string;
  appVersion: string;
  serverUrl: string;
  assetsDir: string;
  forecastSource: 'simulasi' | 'api';
  companySlug: string;
  auth: {
    method: 'jwt';
    skip: boolean;
    redirectPath: string;
  };
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
  };
};

export const CONFIG: ConfigValue = {
  appName: 'AI Forecast',
  appVersion: packageJson.version,
  serverUrl: (env.VITE_SERVER_URL ?? '').replace(/\/+$/, ''),
  assetsDir: env.VITE_ASSETS_DIR,
  forecastSource: env.VITE_FORECAST_SOURCE,
  companySlug: env.VITE_COMPANY_SLUG,
  auth: {
    method: 'jwt',
    // Dashboard dibuka tanpa login — auth & modul core skeleton disimpan tapi
    // dimatikan (tidak ada request ke /core/v1/* selama ini true).
    skip: true,
    redirectPath: paths.dashboard.root,
  },
  firebase: {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
  },
};
