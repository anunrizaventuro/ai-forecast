'use client';

import type { ForecastFilters } from '../forecast-utils';
import type { Confidence, Recommendation } from 'src/types/forecast';

import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { fNumber } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { ForecastFilterBar } from '../forecast-filter-bar';
import { ForecastPageHeader } from '../forecast-page-header';
import { RecommendationTable } from '../recommendation-table';
import { RecommendationMethod } from '../recommendation-method';
import { ForecastSimulationAlert } from '../forecast-simulation-alert';
import {
  fDate,
  storeMap,
  filterCells,
  forecastCells,
  DEFAULT_FILTERS,
  CONFIDENCE_LABEL,
  computeRecommendations,
  summarizeRecommendations,
} from '../forecast-utils';

// ----------------------------------------------------------------------
// Data: simulasi client-side. Tanggal = "data s.d." (walk-forward): rekomendasi
// hanya memakai kunjungan sampai tanggal itu.

type Status = 'all' | 'naik' | 'turun' | 'tetap' | 'dikecualikan';

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

function downloadCsv(rows: Recommendation[], asOf: string) {
  const header = [
    'nit',
    'toko',
    'kec',
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
  const csv = [`# SIMULASI - bukan hasil prediksi (data s.d. ${asOf})`, header.join(','), ...lines];
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

  const handleChange = useCallback(
    (patch: Partial<ForecastFilters>) => setFilters((prev) => ({ ...prev, ...patch })),
    []
  );

  const recommendations = useMemo(() => {
    const scoped = filterCells(forecastCells, { nit: filters.nit, product: filters.product });
    return computeRecommendations(scoped, filters.to);
  }, [filters.nit, filters.product, filters.to]);

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
        description="Jumlah roti yang disarankan dibawa sales ke setiap toko pada kunjungan berikutnya, per produk."
        action={
          <Button
            variant="outlined"
            color="inherit"
            disabled={!rows.length}
            onClick={() => downloadCsv(rows, filters.to)}
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

      <Box sx={{ mb: 2, gap: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="body2" sx={{ mr: 1, color: 'text.secondary' }}>
          {fNumber(rows.length)} dari {fNumber(summary.total)} baris · data s.d. {fDate(filters.to)}
        </Typography>
        <Label variant="soft" color="success">
          Naik {summary.increase}
        </Label>
        <Label variant="soft" color="warning">
          Turun {summary.decrease}
        </Label>
        <Label variant="soft" color="info">
          Tetap {summary.same}
        </Label>
        <Label variant="soft" color="default">
          Dikecualikan {summary.excluded}
        </Label>
        <Label variant="soft" color="default">
          Total rekomendasi {fNumber(summary.totalRecommended)} pcs
        </Label>
      </Box>

      <RecommendationTable rows={rows} resetKey={resetKey} />
    </>
  );
}
