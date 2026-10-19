import path from 'path';
import checker from 'vite-plugin-checker';
import { loadEnv, defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

import { parseEnv } from './src/shared/config/env-schema';

// ----------------------------------------------------------------------

const PORT = 8002;

export default defineConfig(({ mode }) => {
  // Env salah (mis. VITE_FORECAST_SOURCE=api tanpa VITE_SERVER_URL) menggagalkan
  // dev/build di sini — tanpa ini bundle tetap jadi lalu crash (layar kosong) di browser.
  parseEnv(loadEnv(mode, process.cwd(), 'VITE_'));

  return {
    plugins: [
      react(),
      checker({
        typescript: true,
        eslint: {
          useFlatConfig: true,
          lintCommand: 'eslint "./src/**/*.{js,jsx,ts,tsx}"',
          dev: { logLevel: ['error'] },
        },
        overlay: {
          position: 'tl',
          initialIsOpen: false,
        },
      }),
    ],
    resolve: {
      alias: [
        {
          find: /^src(.+)/,
          replacement: path.resolve(process.cwd(), 'src/$1'),
        },
      ],
    },
    server: { port: PORT, host: true },
    preview: { port: PORT, host: true },
    build: {
      chunkSizeWarningLimit: 1000,
      // Tanpa manualChunks: split otomatis Rollup sudah memisah chunk per route lazy
      // (x-charts hanya di halaman forecast, firebase di-import dinamis saat login
      // Google). Grup manual `mui-x` dulu ikut menarik @mui/material ke chunk itu
      // sehingga 850 kB x-charts + date-pickers dimuat di startup; split `vendor`/`mui`
      // yang lebih lebar membuat chunk melingkar dan crash saat load.
      rollupOptions: {
        // The locale JSONs are eagerly globbed by the translation-override catalog
        // (needs every key at build time) AND dynamically imported by i18next.
        // Rollup notes the dynamic import won't get its own chunk — harmless for
        // tiny JSON files and intentional, so silence only that specific warning.
        onwarn(warning, warn) {
          const msg = warning.message ?? '';
          if (msg.includes('dynamic import will not move module into another chunk')) {
            return;
          }
          warn(warning);
        },
      },
    },
  };
});
