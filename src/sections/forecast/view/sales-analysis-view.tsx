'use client';

import type { Granularity, ForecastFilters } from '../forecast-utils';

import { useMemo, useState, useCallback } from 'react';

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
import { ForecastPageHeader } from '../forecast-page-header';
import { AnalysisProductTable } from '../analysis-product-table';
import { ForecastSimulationAlert } from '../forecast-simulation-alert';
import {
  summarize,
  groupByKec,
  timeSeries,
  filterCells,
  forecastCells,
  groupByProduct,
  DEFAULT_FILTERS,
} from '../forecast-utils';

// ----------------------------------------------------------------------
// Data: simulasi client-side. Semua kartu mengikuti filter yang sama.

export function SalesAnalysisView() {
  const [filters, setFilters] = useState<ForecastFilters>(DEFAULT_FILTERS);
  const [granularity, setGranularity] = useState<Granularity>('mingguan');

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
  const kecRows = useMemo(() => groupByKec(cells), [cells]);

  const kecItems = kecRows
    .filter((row) => row.estSold > 0)
    .map((row) => ({
      key: String(row.kec),
      label: `Kec. ${row.kec}`,
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

      <ForecastKpiGrid summary={summary} />

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
          <AnalysisProductTable rows={productRows} />
        </Grid>
      </Grid>
    </>
  );
}
