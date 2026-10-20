import type { StockRisk, PairAnalysis } from 'src/module/forecast/shared/types';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';

import { Label } from 'src/shared/ui/label';
import { Iconify } from 'src/shared/ui/iconify';
import { useForecastMeta } from 'src/module/forecast/shared/hooks';
import { fDate, fNumber, fPercent } from 'src/module/forecast/shared/utils';
import { TableEmptyRow, ForecastTablePagination } from 'src/module/forecast/shared/components';

import { RISK_LABEL, RISK_ORDER, TREND_LABEL } from './pair-labels';

// ----------------------------------------------------------------------
// Ringkasan analisis setiap kombinasi toko × jenis roti. Klik baris untuk
// melihat riwayat kunjungan dan cara perhitungannya.

type Props = {
  rows: PairAnalysis[];
  historyFrom: string;
  onSelect: (row: PairAnalysis) => void;
};

type RiskFilter = 'semua' | StockRisk;

export function PairAnalysisTable({ rows, historyFrom, onSelect }: Props) {
  const { storeMap } = useForecastMeta();
  const [risk, setRisk] = useState<RiskFilter>('semua');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const counts = useMemo(() => {
    const map = new Map<StockRisk, number>();
    rows.forEach((r) => map.set(r.risk, (map.get(r.risk) ?? 0) + 1));
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => risk === 'semua' || r.risk === risk)
      .filter(
        (r) =>
          !q ||
          r.nit.includes(q) ||
          r.product.includes(q) ||
          (storeMap.get(r.nit)?.nama ?? '').toLowerCase().includes(q)
      )
      .sort(
        (a, b) =>
          RISK_ORDER.indexOf(a.risk) - RISK_ORDER.indexOf(b.risk) ||
          (b.soldPerDay ?? -1) - (a.soldPerDay ?? -1)
      );
  }, [rows, risk, query, storeMap]);

  return (
    <Card>
      <CardHeader
        title="Analisis per toko × jenis roti"
        subheader={`Perkiraan dari kunjungan berdata lengkap sejak ${fDate(historyFrom)} (lihat Pengaturan). Klik baris untuk melihat perhitungannya.`}
        action={
          <TextField
            size="small"
            placeholder="Cari toko / roti"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" width={18} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ width: { xs: 1, sm: 220 }, mt: { xs: 1, sm: 0 } }}
          />
        }
        sx={{ flexWrap: 'wrap' }}
      />
      <Tabs
        value={risk}
        onChange={(_, value: RiskFilter) => {
          setRisk(value);
          setPage(0);
        }}
        variant="scrollable"
        sx={{ px: 2.5 }}
      >
        <Tab value="semua" label={`Semua (${fNumber(rows.length)})`} />
        {RISK_ORDER.map((r) => (
          <Tab key={r} value={r} label={`${RISK_LABEL[r].text} (${fNumber(counts.get(r) ?? 0)})`} />
        ))}
      </Tabs>
      <TableContainer>
        <Table size="small" sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow>
              <TableCell>Toko</TableCell>
              <TableCell>Roti</TableCell>
              <TableCell align="right">Data dipakai</TableCell>
              <TableCell align="right">Terjual / hari</TableCell>
              <TableCell align="right">Kiriman terakhir</TableCell>
              <TableCell align="right">Sisa terakhir</TableCell>
              <TableCell align="right">BS</TableCell>
              <TableCell>Tren</TableCell>
              <TableCell>Indikator</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((row) => (
              <TableRow
                key={`${row.nit}-${row.product}`}
                hover
                onClick={() => onSelect(row)}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <Typography variant="body2">{storeMap.get(row.nit)?.nama ?? row.nit}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {row.nit}
                  </Typography>
                </TableCell>
                <TableCell>{row.product}</TableCell>
                <TableCell align="right">{fNumber(row.observations)} kunj.</TableCell>
                <TableCell align="right">
                  {row.soldPerDay === null ? '—' : `${fNumber(row.soldPerDay, 1)} pcs`}
                </TableCell>
                <TableCell align="right">{fNumber(row.lastKirim)}</TableCell>
                <TableCell align="right">{fNumber(row.lastStock)}</TableCell>
                <TableCell align="right">{fPercent(row.bsRate)}</TableCell>
                <TableCell>{TREND_LABEL[row.trend]}</TableCell>
                <TableCell>
                  <Label color={RISK_LABEL[row.risk].color} variant="soft">
                    {RISK_LABEL[row.risk].text}
                  </Label>
                </TableCell>
              </TableRow>
            ))}
            {!filtered.length && <TableEmptyRow colSpan={9} />}
          </TableBody>
        </Table>
      </TableContainer>
      <ForecastTablePagination
        count={filtered.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
      />
      <Box sx={{ px: 2.5, pb: 2 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          Risiko kekurangan stok berarti roti habis di dua kunjungan terakhir — permintaan
          sebenarnya bisa lebih besar dari yang tercatat. Indikator ini bahan pemeriksaan, bukan
          keputusan otomatis.
        </Typography>
      </Box>
    </Card>
  );
}
