'use client';

import type { RecStatus } from '../recommendation-mix';
import type { ForecastFilters } from '../forecast-utils';
import type { Confidence, MasterStore, Recommendation } from 'src/types/forecast';

import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { fNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

import { RecommendationMix } from '../recommendation-mix';
import { ForecastFilterBar } from '../forecast-filter-bar';
import { ForecastDataState } from '../forecast-data-state';
import { ForecastPageHeader } from '../forecast-page-header';
import { RecommendationMethod } from '../recommendation-method';
import { RecommendationStoreList } from '../recommendation-store-list';
import { RecommendationSalesList } from '../recommendation-sales-list';
import { ForecastSimulationAlert } from '../forecast-simulation-alert';
import {
  fDate,
  DEFAULT_FILTERS,
  CONFIDENCE_LABEL,
  summarizeRecommendations,
} from '../forecast-utils';
import {
  IS_API,
  useStoreSales,
  useForecastMeta,
  useForecastRecommendations,
} from '../use-forecast-data';

// ----------------------------------------------------------------------
// Data: use-forecast-data (simulasi atau ai-forecast-be). Tanggal = "data s.d." (walk-forward): rekomendasi
// hanya memakai kunjungan sampai tanggal itu.

type Status = 'all' | RecStatus;

type Pov = 'toko' | 'sales';

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: 'all', label: 'Semua status' },
  { value: 'naik', label: 'Naik' },
  { value: 'turun', label: 'Turun' },
  { value: 'tetap', label: 'Tetap' },
  { value: 'dikecualikan', label: 'Dikecualikan' },
];

const matchStatus = (row: Recommendation, status: Status) => {
  if (status === 'all') return true;
  if (status === 'dikecualikan') return row.excluded;
  if (row.excluded) return false;
  if (status === 'naik') return (row.delta ?? 0) > 0;
  if (status === 'turun') return (row.delta ?? 0) < 0;
  return row.delta === 0;
};

function downloadCsv(
  rows: Recommendation[],
  asOf: string,
  storeMap: Map<string, MasterStore>,
  salesMap: Map<string, string>
) {
  const header = [
    'nit',
    'toko',
    'kec',
    'sales',
    'produk',
    'tgl_kiriman_terakhir',
    'kiriman_terakhir',
    'est_terjual_median',
    'bs_terakhir',
    'rekomendasi',
    'selisih',
    'kepercayaan',
    'dasar',
    'kunjungan_berikutnya',
  ];
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((row) =>
    [
      row.nit,
      storeMap.get(row.nit)?.nama,
      storeMap.get(row.nit)?.kec,
      salesMap.get(row.nit),
      row.product,
      row.lastTgl,
      row.lastKirim,
      row.estSold,
      row.lastBs,
      row.recommended,
      row.delta,
      row.confidence,
      row.basis,
      row.nextVisit,
    ]
      .map(escape)
      .join(',')
  );
  const note = IS_API
    ? `# Rekomendasi aturan baseline (parameter contoh, belum divalidasi) - data s.d. ${asOf}`
    : `# SIMULASI - bukan hasil prediksi (data s.d. ${asOf})`;
  const csv = [note, header.join(','), ...lines];
  const url = URL.createObjectURL(new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `rekomendasi-simulasi-${asOf}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function RecommendationView() {
  const [filters, setFilters] = useState<ForecastFilters>(DEFAULT_FILTERS);
  const [status, setStatus] = useState<Status>('all');
  const [confidence, setConfidence] = useState<Confidence | 'all'>('all');
  const [pov, setPov] = useState<Pov>('toko');

  const handleChange = useCallback(
    (patch: Partial<ForecastFilters>) => setFilters((prev) => ({ ...prev, ...patch })),
    []
  );

  const { storeMap } = useForecastMeta();
  const query = useForecastRecommendations({
    asOf: filters.to,
    nit: filters.nit,
    product: filters.product,
  });
  const recommendations = useMemo(() => query.data ?? [], [query.data]);
  const { salesMap } = useStoreSales(filters.to);

  const rows = useMemo(
    () =>
      recommendations.filter(
        (row) => matchStatus(row, status) && (confidence === 'all' || row.confidence === confidence)
      ),
    [recommendations, status, confidence]
  );

  const summary = summarizeRecommendations(recommendations);

  const resetKey = [filters.to, filters.nit, filters.product, status, confidence].join('|');

  return (
    <>
      <ForecastPageHeader
        title="Rekomendasi Stok"
        icon="carbon:delivery"
        description="Jumlah roti yang disarankan dibawa sales ke setiap toko pada kunjungan berikutnya — lihat per toko atau per sales."
        action={
          <Button
            variant="outlined"
            color="inherit"
            disabled={!rows.length}
            onClick={() => downloadCsv(rows, filters.to, storeMap, salesMap)}
            startIcon={<Iconify icon="solar:file-download-outline" />}
          >
            Unduh CSV
          </Button>
        }
      />

      <ForecastSimulationAlert />

      <RecommendationMethod />

      <ForecastFilterBar filters={filters} onChange={handleChange} dateMode="asOf">
        <TextField
          select
          size="small"
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value as Status)}
          sx={{ minWidth: { xs: 1, sm: 160 }, flex: { xs: '1 1 100%', sm: '0 1 auto' } }}
        >
          {STATUS_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Kepercayaan"
          value={confidence}
          onChange={(event) => setConfidence(event.target.value as Confidence | 'all')}
          sx={{ minWidth: { xs: 1, sm: 160 }, flex: { xs: '1 1 100%', sm: '0 1 auto' } }}
        >
          <MenuItem value="all">Semua tingkat</MenuItem>
          {(['tinggi', 'sedang', 'rendah'] as const).map((level) => (
            <MenuItem key={level} value={level}>
              {CONFIDENCE_LABEL[level]}
            </MenuItem>
          ))}
        </TextField>
      </ForecastFilterBar>

      <ForecastDataState error={query.error} fetching={query.fetching} onRetry={query.refetch} />

      <Card sx={{ p: 3, mb: 3 }}>
        <Box
          sx={{
            mb: 2.5,
            gap: 2,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography variant="h6">
              {fNumber(summary.totalRecommended)} pcs disarankan untuk kunjungan berikutnya
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Kiriman terakhir {fNumber(summary.totalLast)} pcs · data s.d. {fDate(filters.to)} ·
              klik status untuk memfilter tabel
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Menampilkan {fNumber(rows.length)} dari {fNumber(summary.total)} baris
          </Typography>
        </Box>
        <RecommendationMix
          summary={summary}
          selected={status === 'all' ? null : status}
          onSelect={(next) => setStatus((prev) => (prev === next ? 'all' : next))}
        />
      </Card>

      <Tabs value={pov} onChange={(_, value: Pov) => setPov(value)} sx={{ mb: 2 }}>
        <Tab
          value="toko"
          label="Per toko"
          icon={<Iconify icon="carbon:location" width={20} />}
          iconPosition="start"
        />
        <Tab
          value="sales"
          label="Per sales"
          icon={<Iconify icon="solar:user-rounded-outline" width={20} />}
          iconPosition="start"
        />
      </Tabs>

      {pov === 'toko' ? (
        <RecommendationStoreList rows={rows} salesMap={salesMap} resetKey={resetKey} />
      ) : (
        <RecommendationSalesList rows={rows} salesMap={salesMap} />
      )}
    </>
  );
}
