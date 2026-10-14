import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------
// Resource hints — the Metadata API cannot emit preconnect/dns-prefetch, but
// React 19 hoists <link> elements rendered anywhere in the tree into <head>
// during SSR. Two different connection pools:
// - API origin: CORS pool (fetch/TanStack Query) → crossOrigin="anonymous"
// - GCS covers: no-CORS pool (plain <img>) → dns-prefetch, no crossOrigin

function getApiOrigin() {
  try {
    return CONFIG.apiUrl ? new URL(CONFIG.apiUrl).origin : '';
  } catch {
    return '';
  }
}

export function Preconnect() {
  const apiOrigin = getApiOrigin();

  return (
    <>
      {apiOrigin && <link rel="preconnect" href={apiOrigin} crossOrigin="anonymous" />}
      <link rel="dns-prefetch" href="https://storage.googleapis.com" />
    </>
  );
}
