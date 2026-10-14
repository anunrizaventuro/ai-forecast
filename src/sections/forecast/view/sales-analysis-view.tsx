'use client';

import type { Granularity, ForecastFilters } from '../forecast-utils';

import { useState, useCallback } from 'react';

import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import { fNumber, fPercent } from 'src/utils/format-number';

import { ForecastKpiGrid } from '../forecast-kpi-grid';
import { ForecastBarList } from '../forecast-bar-list';
import { ForecastTrendCard } from '../forecast-trend-card';
import { ForecastFilterBar } from '../forecast-filter-bar';
import { ForecastDataState } from '../forecast-data-state';
import { ForecastPageHeader } from '../forecast-page-header';
import { AnalysisProductTable } from '../analysis-product-table';
import { EMPTY_SUMMARY, DEFAULT_FILTERS } from '../forecast-utils';
import { ForecastSimulationAlert } from '../forecast-simulation-alert';
import {
  useForecastSeries,
  useForecastRegions,
  useForecastSummary,
  useForecastProducts,
} from '../use-forecast-data';

// ----------------------------------------------------------------------
// Data: use-forecast-data (simulasi atau ai-forecast-be). Semua kartu
// mengikuti filter yang sama.

export function SalesAnalysisView() {
  const [filters, setFilters] = useState<ForecastFilters>(DEFAULT_FILTERS);
  const [granularity, setGranularity] = useState<Granularity>('mingguan');

  const handleChange = useCallback(
    (patch: Partial<ForecastFilters>) => setFilters((prev) => ({ ...prev, ...patch })),
    []
  );

  const summary = useForecastSummary(filters);
  const series = useForecastSeries(filters, granularity);
  const productRows = useForecastProducts(filters);
  const regions = useForecastRegions(filters);

  const states = [summary, series, productRows, regions];
  const points = series.data ?? [];

  const kecItems = (regions.data ?? [])
    .filter((row) => row.estSold > 0)
    .map((row) => ({
      key: String(row.kec),
      label: row.kec ? `Kec. ${row.kec}` : 'Di luar master',
      caption: `${fNumber(row.stores)} toko`,
      value: row.estSold,
      detail: `Kiriman ${fNumber(row.kirim)} pcs · retur ${fPercent(row.returnRate)}`,
    }));

  return (
    <>
      <ForecastPageHeader
        title="Analisis Penjualan"
        description="Bandingkan kiriman, estimasi terjual, dan retur per periode, produk, serta wilayah."
      />

      <ForecastSimulationAlert />

      <ForecastFilterBar filters={filters} onChange={handleChange} />

      <ForecastDataState
        error={states.find((s) => s.error)?.error ?? null}
        fetching={states.some((s) => s.fetching)}
        onRetry={() => states.forEach((s) => s.refetch())}
      />

      <ForecastKpiGrid summary={summary.data ?? EMPTY_SUMMARY} />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <ForecastTrendCard
            title="Kiriman vs estimasi terjual"
            subheader="Selisih keduanya ≈ retur + sisa stok. Mode mingguan hanya menampilkan minggu penuh (Senin–Sabtu)."
            points={points}
            seriesKeys={['kirim', 'estSold']}
            granularity={granularity}
            onGranularityChange={setGranularity}
            sx={{ height: 1 }}
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: 1 }}>
            <CardHeader
              title="Estimasi terjual per wilayah"
              subheader="Arti kode kec masih perlu dikonfirmasi klien"
            />
            <CardContent>
              <ForecastBarList items={kecItems} series="estSold" />
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <ForecastTrendCard
            title="Tren retur (BS)"
            subheader="Retur dalam pcs per periode"
            points={points}
            seriesKeys={['bs']}
            granularity={granularity}
            height={240}
            sx={{ height: 1 }}
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 6 }}>
          <Alert severity="info" variant="outlined" sx={{ height: 1 }}>
            <strong>Catatan metode.</strong> Estimasi terjual memakai rumus B: kiriman kunjungan
            sebelumnya dikurangi BS hari ini. Di studi kelayakan, sekitar 90% kiriman tidak punya
            retur maupun sisa stok, jadi permintaan riil kemungkinan lebih besar dari angka ini (
            <em>censored demand</em>). Kunjungan pertama setiap toko tidak punya pembanding sehingga
            tidak dihitung, begitu juga kiriman pencilan. Rumus akhir menunggu konfirmasi arti BS
            dan STOCK dari klien.
          </Alert>
        </Grid>

        <Grid size={12}>
          <AnalysisProductTable rows={productRows.data ?? []} />
        </Grid>
      </Grid>
    </>
  );
}
