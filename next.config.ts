import type { NextConfig } from 'next';

// ----------------------------------------------------------------------

// CSP dijalankan REPORT-ONLY dulu: pantau pelanggaran di console/report,
// baru promosikan ke Content-Security-Policy setelah bersih di production.
// 'unsafe-inline'/'unsafe-eval' masih diperlukan oleh Next inline scripts,
// emotion (style), dan InitColorSchemeScript.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  // img https: — cover artikel dilayani dari host backend/storage per-client
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${process.env.NEXT_PUBLIC_API_URL ?? ''}`.trim(),
  // PlayerDialog (react-player) meng-embed YouTube
  'frame-src https://www.youtube.com https://www.youtube-nocookie.com',
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // Aktif hanya lewat HTTPS; aman di-set selalu.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'Content-Security-Policy-Report-Only', value: CSP_REPORT_ONLY },
];

const nextConfig: NextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  // Standalone hanya untuk build Docker (di-set Dockerfile) — tanpa gate ini
  // `yarn start` lokal mengeluarkan warning dan tidak memakai output-nya.
  ...(process.env.BUILD_STANDALONE === 'true' && { output: 'standalone' as const }),
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: SECURITY_HEADERS,
      },
    ];
  },
  // Without --turbopack (next dev)
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },
  // With --turbopack (next dev --turbopack)
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
};

export default nextConfig;
