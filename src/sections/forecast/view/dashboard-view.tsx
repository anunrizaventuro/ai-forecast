'use client';

import type { Granularity, ForecastFilters } from '../forecast-utils';

import { useMemo, useState, useCallback } from 'react';

import Grid from '@mui/material/Grid';

import { ForecastKpiGrid } from '../forecast-kpi-grid';
import { ForecastTrendCard } from '../forecast-trend-card';
import { ForecastFilterBar } from '../forecast-filter-bar';
import { ForecastPageHeader } from '../forecast-page-header';
import { DashboardTopProducts } from '../dashboard-top-products';
import { ForecastSimulationAlert } from '../forecast-simulation-alert';
import { DashboardRecommendationSummary } from '../dashboard-recommendation-summary';
import {
  summarize,
  timeSeries,
  filterCells,
  forecastCells,
  groupByProduct,
  DEFAULT_FILTERS,
  computeRecommendations,
} from '../forecast-utils';

// ----------------------------------------------------------------------
// Data: simulasi client-side (src/_mock/_forecast.ts) — belum ada backend.
// Filter tanggal/toko/produk mencakup semua kartu di bawahnya; ringkasan
// rekomendasi memakai data s.d. tanggal akhir rentang.

export function DashboardView() {
  const [filters, setFilters] = useState<ForecastFilters>(DEFAULT_FILTERS);
  const [granularity, setGranularity] = useState<Granularity>('harian');

  const handleChange = useCallback(
    (patch: Partial<ForecastFilters>) => setFilters((prev) => ({ ...prev, ...patch })),
    []
  );

  const cells = useMemo(() => filterCells(forecastCells, filters), [filters]);

  const summary = useMemo(() => summarize(cells), [cells]);

  const points = useMemo(
    () => timeSeries(cells, filters.from, filters.to, granularity),
    [cells, filters.from, filters.to, granularity]
  );

  const productRows = useMemo(() => groupByProduct(cells), [cells]);

  const recommendations = useMemo(() => {
    const scoped = filterCells(forecastCells, { nit: filters.nit, product: filters.product });
    return computeRecommendations(scoped, filters.to);
  }, [filters.nit, filters.product, filters.to]);

  return (
    <>
      <ForecastPageHeader
        title="Ringkasan Distribusi"
        description="Pantau kiriman, estimasi penjualan, retur, dan rekomendasi stok per toko × produk."
      />

      <ForecastSimulationAlert />

      <ForecastFilterBar filters={filters} onChange={handleChange} />

      <ForecastKpiGrid summary={summary} />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <ForecastTrendCard
            title="Tren kiriman & estimasi terjual"
            subheader="Estimasi terjual dicatat pada tanggal penarikan retur; kunjungan pertama tiap toko belum punya pembanding"
            points={points}
            seriesKeys={['kirim', 'estSold']}
            granularity={granularity}
            onGranularityChange={setGranularity}
            sx={{ height: 1 }}
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <DashboardTopProducts rows={productRows} sx={{ height: 1 }} />
        </Grid>

        <Grid size={12}>
          <DashboardRecommendationSummary recommendations={recommendations} asOf={filters.to} />
        </Grid>
      </Grid>
    </>
  );
}
