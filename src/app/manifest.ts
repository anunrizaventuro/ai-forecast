import type { MetadataRoute } from 'next';

import { paths } from 'src/routes/paths';

import { primary } from 'src/theme';
import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------
// Web app manifest (file convention → /manifest.webmanifest).
// Catatan per-client: untuk PWA penuh tambahkan ikon 192x192 & 512x512.

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: CONFIG.appName,
    short_name: CONFIG.appName,
    description: CONFIG.appDescription,
    start_url: paths.dashboard.root,
    display: 'browser',
    background_color: '#ffffff',
    theme_color: primary.main,
    icons: [
      { src: '/favicon.ico', sizes: 'any' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
