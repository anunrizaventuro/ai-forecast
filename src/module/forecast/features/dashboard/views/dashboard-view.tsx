import type { Granularity, ForecastFilters } from 'src/module/forecast/shared/types';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';

import { EMPTY_SUMMARY, DEFAULT_FILTERS } from 'src/module/forecast/shared/utils';
import {
  useForecastSeries,
  useForecastSummary,
  useForecastProducts,
  useForecastRecommendations,
} from 'src/module/forecast/shared/hooks';
import {
  SECTION_GAP,
  ForecastKpiGrid,
  ForecastTrendCard,
  ForecastFilterBar,
  ForecastDataState,
  ForecastPageHeader,
  ForecastSimulationAlert,
} from 'src/module/forecast/shared/components';

import { DashboardTopProducts } from '../components/dashboard-top-products';
import { DashboardRecommendationSummary } from '../components/dashboard-recommendation-summary';

// ----------------------------------------------------------------------
// Data: module/forecast/shared/hooks (simulasi atau ai-forecast-be, lihat
// VITE_FORECAST_SOURCE). Filter tanggal/toko/produk mencakup semua kartu di
// bawahnya; ringkasan rekomendasi memakai data s.d. tanggal akhir.

export function DashboardView() {
  const [filters, setFilters] = useState<ForecastFilters>(DEFAULT_FILTERS);
  const [granularity, setGranularity] = useState<Granularity>('harian');

  const handleChange = useCallback(
    (patch: Partial<ForecastFilters>) => setFilters((prev) => ({ ...prev, ...patch })),
    []
  );

  const summary = useForecastSummary(filters);
  const series = useForecastSeries(filters, granularity);
  const productRows = useForecastProducts(filters);
  const recommendations = useForecastRecommendations({
    asOf: filters.to,
    nit: filters.nit,
    product: filters.product,
  });

  const states = [summary, series, productRows, recommendations];
  const error = states.find((s) => s.error)?.error ?? null;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <ForecastPageHeader
        title="Dashboard"
        description="Ringkasan distribusi roti dan rekomendasi stok kunjungan berikutnya."
      />

      <ForecastSimulationAlert />

      <ForecastFilterBar filters={filters} onChange={handleChange} />

      <ForecastDataState
        error={error}
        fetching={states.some((s) => s.fetching)}
        onRetry={() => states.forEach((s) => s.refetch())}
      />

      <ForecastKpiGrid
        summary={summary.data ?? EMPTY_SUMMARY}
        points={series.data}
        hideSalesValue
      />

      <Grid container rowSpacing={SECTION_GAP} columnSpacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <ForecastTrendCard
            title="Tren kiriman & estimasi terjual"
            subheader="Estimasi terjual dicatat pada tanggal penarikan retur"
            points={series.data ?? []}
            seriesKeys={['kirim', 'estSold']}
            granularity={granularity}
            onGranularityChange={setGranularity}
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <DashboardTopProducts rows={productRows.data ?? []} />
        </Grid>

        <Grid size={12}>
          <DashboardRecommendationSummary
            recommendations={recommendations.data ?? []}
            asOf={filters.to}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
