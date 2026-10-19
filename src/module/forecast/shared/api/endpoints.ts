// ----------------------------------------------------------------------
// ai-forecast-be — kontrak: ai-forecast-be/docs/api.md. Path relatif terhadap
// CONFIG.serverUrl (baseURL axios bersama).

export const forecastEndpoints = {
  meta: '/api/v1/forecast/meta',
  summary: '/api/v1/forecast/summary',
  timeseries: '/api/v1/forecast/timeseries',
  products: '/api/v1/forecast/products',
  regions: '/api/v1/forecast/regions',
  stores: '/api/v1/forecast/stores',
  recommendations: '/api/v1/forecast/recommendations',
  settings: '/api/v1/forecast/settings',
} as const;
