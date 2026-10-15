'use client';

import type { Granularity, ForecastFilters } from '../forecast-utils';

import { useState, useCallback } from 'react';

import Grid from '@mui/material/Grid';

import { ForecastKpiGrid } from '../forecast-kpi-grid';
import { ForecastTrendCard } from '../forecast-trend-card';
import { ForecastFilterBar } from '../forecast-filter-bar';
import { ForecastDataState } from '../forecast-data-state';
import { DashboardTopProducts } from '../dashboard-top-products';
import { EMPTY_SUMMARY, DEFAULT_FILTERS } from '../forecast-utils';
import { ForecastSimulationAlert } from '../forecast-simulation-alert';
import { DashboardRecommendationSummary } from '../dashboard-recommendation-summary';
import {
  useForecastSeries,
  useForecastSummary,
  useForecastProducts,
  useForecastRecommendations,
} from '../use-forecast-data';

// ----------------------------------------------------------------------
// Data: use-forecast-data (simulasi atau ai-forecast-be, lihat
// NEXT_PUBLIC_FORECAST_SOURCE). Filter tanggal/toko/produk mencakup semua
// kartu di bawahnya; ringkasan rekomendasi memakai data s.d. tanggal akhir.

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
    <>
      <ForecastSimulationAlert />

      <ForecastFilterBar filters={filters} onChange={handleChange} />

      <ForecastDataState
        error={error}
        fetching={states.some((s) => s.fetching)}
        onRetry={() => states.forEach((s) => s.refetch())}
      />

      {/* Hero ringkasan distribusi (dashboard-hero.tsx) dan kartu nilai estimasi terjual
          sengaja tidak ditampilkan dulu — kebutuhannya belum dipastikan. */}
      <ForecastKpiGrid
        summary={summary.data ?? EMPTY_SUMMARY}
        points={series.data}
        hideSalesValue
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <ForecastTrendCard
            title="Tren kiriman & estimasi terjual"
            subheader="Estimasi terjual dicatat pada tanggal penarikan retur; kunjungan pertama tiap toko belum punya pembanding"
            points={series.data ?? []}
            seriesKeys={['kirim', 'estSold']}
            granularity={granularity}
            onGranularityChange={setGranularity}
            sx={{ height: 1 }}
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <DashboardTopProducts rows={productRows.data ?? []} sx={{ height: 1 }} />
        </Grid>

        <Grid size={12}>
          <DashboardRecommendationSummary
            recommendations={recommendations.data ?? []}
            asOf={filters.to}
          />
        </Grid>
      </Grid>
    </>
  );
}
