import 'src/global.css';

import type { Metadata, Viewport } from 'next';

import localFont from 'next/font/local';

import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';

import { CONFIG } from 'src/global-config';
import { QueryProvider } from 'src/lib/query';
import { LocalizationProvider } from 'src/locales';
import { themeOverrides } from 'src/theme/theme-overrides';
import { themeConfig, ThemeProvider, primary as primaryColor } from 'src/theme';

import { Preconnect } from 'src/components/preconnect';
import { ProgressBar } from 'src/components/progress-bar';
import { MotionLazy } from 'src/components/animate/motion-lazy';

// ----------------------------------------------------------------------
// Font di-self-host via next/font/local (woff2 dari @fontsource, subset latin)
// — otomatis preload + size-adjusted fallback, tanpa CSS render-blocking dan
// tanpa fetch eksternal saat build. Theme membacanya lewat CSS variable
// (lihat theme-config.ts fontFamily).

const dmSans = localFont({
  src: '../assets/fonts/dm-sans-latin-wght-normal.woff2',
  weight: '100 1000',
  display: 'swap',
  variable: '--font-dm-sans',
});

const barlow = localFont({
  src: [
    { path: '../assets/fonts/barlow-latin-400-normal.woff2', weight: '400' },
    { path: '../assets/fonts/barlow-latin-500-normal.woff2', weight: '500' },
    { path: '../assets/fonts/barlow-latin-600-normal.woff2', weight: '600' },
    { path: '../assets/fonts/barlow-latin-700-normal.woff2', weight: '700' },
    { path: '../assets/fonts/barlow-latin-800-normal.woff2', weight: '800' },
  ],
  display: 'swap',
  variable: '--font-barlow',
});

// ----------------------------------------------------------------------

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: primaryColor.main,
};

export const metadata: Metadata = {
  metadataBase: new URL(CONFIG.siteUrl),
  // Child pages export a short title only — this template appends the brand.
  // Pages needing a fully custom title use `title: { absolute: '...' }`.
  title: {
    default: CONFIG.appName,
    template: `%s - ${CONFIG.appName}`,
  },
  description: CONFIG.appDescription,
  openGraph: {
    type: 'website',
    siteName: CONFIG.appName,
    locale: 'id_ID',
  },
  twitter: {
    card: 'summary_large_image',
  },
  icons: [
    {
      rel: 'icon',
      url: `${CONFIG.assetsDir}/favicon.ico`,
    },
    {
      rel: 'apple-touch-icon',
      url: `${CONFIG.assetsDir}/apple-touch-icon.png`,
    },
  ],
};

// ----------------------------------------------------------------------

type RootLayoutProps = {
  children: React.ReactNode;
};

export default async function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="id" className={`${dmSans.variable} ${barlow.variable}`} suppressHydrationWarning>
      <body>
        <InitColorSchemeScript
          attribute={themeConfig.cssVariables.colorSchemeSelector}
          modeStorageKey={themeConfig.modeStorageKey}
          defaultMode={themeConfig.defaultMode}
        />

        <Preconnect />

        <QueryProvider>
          <LocalizationProvider>
            <AppRouterCacheProvider options={{ key: 'css' }}>
              <ThemeProvider
                themeOverrides={themeOverrides}
                modeStorageKey={themeConfig.modeStorageKey}
                defaultMode={themeConfig.defaultMode}
              >
                <MotionLazy>
                  <ProgressBar />
                  {children}
                </MotionLazy>
              </ThemeProvider>
            </AppRouterCacheProvider>
          </LocalizationProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
