import { paths } from 'src/routes/paths';

import { parseEnv } from './env-schema';
import packageJson from '../../../package.json';

// ----------------------------------------------------------------------
// Satu-satunya tempat env dibaca. Vite meng-inline `import.meta.env.VITE_*`
// saat build — mengubah nilainya butuh build ulang. Skema yang sama sudah
// dijalankan vite.config.ts saat build, jadi env salah menggagalkan build;
// pemeriksaan di sini menjaga dev server / build tanpa config itu.

const env = parseEnv({
  VITE_SERVER_URL: import.meta.env.VITE_SERVER_URL,
  VITE_ASSETS_DIR: import.meta.env.VITE_ASSETS_DIR,
  VITE_FORECAST_SOURCE: import.meta.env.VITE_FORECAST_SOURCE,
  VITE_COMPANY_SLUG: import.meta.env.VITE_COMPANY_SLUG,
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
});

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
