import type { IconifyName } from 'src/shared/ui/iconify';
import type { Granularity } from 'src/module/forecast/shared/utils';
import type { PairAnalysis } from 'src/module/forecast/shared/types';

import { useState } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';

import { Iconify } from 'src/shared/ui/iconify';
import { ChartCard } from 'src/shared/ui/dashboard-card';
import { fNumber, fPercent, historyFrom, EMPTY_SUMMARY } from 'src/module/forecast/shared/utils';
import {
  useForecastSeries,
  useForecastRegions,
  useForecastSummary,
  useForecastFilters,
  useForecastAnalysis,
  useForecastProducts,
  useForecastSettings,
} from 'src/module/forecast/shared/hooks';
import {
  SECTION_GAP,
  ForecastKpiGrid,
  ForecastBarList,
  ForecastTrendCard,
  ForecastFilterBar,
  ForecastDataState,
  ForecastPageHeader,
  ForecastSimulationAlert,
} from 'src/module/forecast/shared/components';

import { PairDetailDrawer } from '../components/pair-detail-drawer';
import { PairAnalysisTable } from '../components/pair-analysis-table';
import { AnalysisProductTable } from '../components/analysis-product-table';

// ----------------------------------------------------------------------
// Data: use-forecast-data (simulasi atau ai-forecast-be). Semua kartu
// mengikuti filter yang sama.

const METHOD_NOTES: { icon: IconifyName; title: string; text: string }[] = [
  {
    icon: 'carbon:chart-average',
    title: 'Estimasi terjual = sisa awal + kiriman − sisa akhir − BS',
    text: 'Dihitung per periode antar dua kunjungan. Sisa awal & kiriman dari kunjungan sebelumnya; sisa akhir & BS dari kunjungan ini. Dicatat pada tanggal kunjungan ini.',
  },
  {
    icon: 'solar:info-circle-outline',
    title: 'Permintaan riil kemungkinan lebih besar',
    text: 'Sekitar 90% kiriman tidak punya retur maupun sisa stok — roti habis, jadi permintaan tidak teramati penuh (censored demand).',
  },
  {
    icon: 'solar:filter-outline',
    title: 'Yang tidak dihitung',
    text: 'Kunjungan yang datanya belum cukup (kunjungan pertama, sisa atau BS tidak tercatat) dan hasil yang perlu diperiksa (negatif atau kiriman pencilan). Umur roti tidak dicatat, jadi stok kedaluwarsa tidak dihitung.',
  },
];

export function SalesAnalysisView() {
  const [filters, handleChange] = useForecastFilters();
  const [granularity, setGranularity] = useState<Granularity>('mingguan');
  const [selected, setSelected] = useState<PairAnalysis | null>(null);
  const { settings } = useForecastSettings();

  const summary = useForecastSummary(filters);
  const analysis = useForecastAnalysis(filters);
  const series = useForecastSeries(filters, granularity);
  const productRows = useForecastProducts(filters);
  const regions = useForecastRegions(filters);

  const states = [summary, series, productRows, regions, analysis];
  const sum = summary.data ?? EMPTY_SUMMARY;
  const totalCells = sum.cellsComplete + sum.cellsInsufficient + sum.cellsCheck;
  const points = series.data ?? [];

  const kecItems = (regions.data ?? [])
    .filter((row) => row.estSold > 0)
    .sort((a, b) => b.estSold - a.estSold)
    .map((row) => ({
      key: String(row.kec),
      label: row.kec ? `Kec. ${row.kec}` : 'Di luar master',
      caption: `${fNumber(row.stores)} toko`,
      value: row.estSold,
      detail: `Kiriman ${fNumber(row.kirim)} pcs · retur ${fPercent(row.returnRate)}`,
    }));

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
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

      {totalCells > 0 && (
        <Alert
          severity={sum.cellsComplete / totalCells >= 0.8 ? 'info' : 'warning'}
          variant="outlined"
          sx={{ mb: SECTION_GAP }}
        >
          <strong>Kelengkapan data:</strong> {fPercent(sum.cellsComplete / totalCells)} catatan toko
          × roti bisa dihitung ({fNumber(sum.cellsComplete)} lengkap,{' '}
          {fNumber(sum.cellsInsufficient)} belum cukup, {fNumber(sum.cellsCheck)} perlu diperiksa).
          Hanya yang lengkap masuk estimasi terjual dan rasio BS.
        </Alert>
      )}

      <ForecastKpiGrid summary={sum} points={points} />

      <Grid container rowSpacing={SECTION_GAP} columnSpacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <ForecastTrendCard
            title="Kiriman vs estimasi terjual"
            subheader="Selisih keduanya ≈ retur + sisa stok; mode mingguan hanya minggu penuh"
            points={points}
            seriesKeys={['kirim', 'estSold']}
            granularity={granularity}
            onGranularityChange={setGranularity}
            sx={{ height: 1 }}
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <ChartCard
            title="Estimasi terjual per wilayah"
            subheader="Arti kode kec masih perlu dikonfirmasi klien"
          >
            <CardContent>
              <ForecastBarList ranked items={kecItems} series="estSold" />
            </CardContent>
          </ChartCard>
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
          <Card sx={{ height: 1 }}>
            <CardHeader
              title="Cara membaca angka ini"
              subheader="Asumsi: sisa dicatat terpisah dari BS dan mencakup seluruh stok di toko"
            />
            <CardContent>
              <Box component="ul" sx={{ gap: 2.5, display: 'flex', flexDirection: 'column' }}>
                {METHOD_NOTES.map((note) => (
                  <Box key={note.title} component="li" sx={{ gap: 2, display: 'flex' }}>
                    <Box
                      sx={(theme) => ({
                        width: 40,
                        height: 40,
                        flexShrink: 0,
                        display: 'flex',
                        borderRadius: 1.25,
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'info.dark',
                        bgcolor: varAlpha(theme.vars.palette.info.mainChannel, 0.12),
                      })}
                    >
                      <Iconify icon={note.icon} width={22} />
                    </Box>
                    <Box>
                      <Typography variant="subtitle2">{note.title}</Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {note.text}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={12}>
          <PairAnalysisTable
            rows={analysis.data ?? []}
            historyFrom={historyFrom(filters.to, settings)}
            onSelect={setSelected}
          />
        </Grid>

        <Grid size={12}>
          <AnalysisProductTable rows={productRows.data ?? []} />
        </Grid>
      </Grid>

      <PairDetailDrawer pair={selected} filters={filters} onClose={() => setSelected(null)} />
    </Box>
  );
}
