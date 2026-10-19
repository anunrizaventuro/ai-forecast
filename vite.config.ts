import path from 'path';
import checker from 'vite-plugin-checker';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

// ----------------------------------------------------------------------

const PORT = 8002;

// Split heavy vendor libraries into separate, cacheable chunks so no single
// bundle balloons past the size warning threshold.
function manualChunks(id: string): string | undefined {
  if (!id.includes('node_modules')) return undefined;
  if (/[\\/]node_modules[\\/]@mui[\\/]x-/.test(id)) return 'mui-x';
  if (/[\\/]node_modules[\\/](@mui|@emotion)[\\/]/.test(id)) return 'mui';
  if (/[\\/]node_modules[\\/](firebase|@firebase)[\\/]/.test(id)) return 'firebase';
  if (/[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) return 'motion';
  if (/[\\/]node_modules[\\/](lightweight-charts|fancy-canvas)[\\/]/.test(id))
    return 'lightweight-charts';
  if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id))
    return 'react-vendor';
  return 'vendor';
}

export default defineConfig({
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
    rollupOptions: {
      output: { manualChunks },
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
});
