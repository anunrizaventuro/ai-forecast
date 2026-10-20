import type { PairAnalysis, ForecastFilters } from 'src/module/forecast/shared/types';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import Drawer from '@mui/material/Drawer';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';

import { Label } from 'src/shared/ui/label';
import { Iconify } from 'src/shared/ui/iconify';
import { Scrollbar } from 'src/shared/ui/scrollbar';
import {
  useForecastMeta,
  useForecastSettings,
  useForecastPairDetail,
} from 'src/module/forecast/shared/hooks';
import {
  fDate,
  fNumber,
  fPercent,
  historyFrom,
  CELL_REASON_LABEL,
} from 'src/module/forecast/shared/utils';

import { RISK_LABEL, TREND_LABEL, STATUS_LABEL } from './pair-labels';

// ----------------------------------------------------------------------
// Detail satu toko × roti: ringkasan, alasan indikator, dan riwayat setiap
// kunjungan dengan rumus terjual yang bisa diperiksa baris per baris.

type Props = {
  pair: PairAnalysis | null;
  filters: ForecastFilters;
  onClose: () => void;
};

export function PairDetailDrawer({ pair, filters, onClose }: Props) {
  const { storeMap, productMap } = useForecastMeta();
  const { settings, version } = useForecastSettings();
  const query = useForecastPairDetail({
    ...filters,
    nit: pair?.nit ?? null,
    product: pair?.product ?? null,
  });
  const detail = pair ? query.data : undefined;
  const a = detail?.analysis ?? pair;
  const history = [...(detail?.history ?? [])].reverse();

  const stats = a
    ? [
        {
          label: 'Terjual per hari',
          value: a.soldPerDay === null ? '—' : `${fNumber(a.soldPerDay, 1)} pcs`,
          hint: settings.method === 'median' ? 'median' : 'rata-rata',
        },
        {
          label: 'Terjual per kunjungan',
          value: a.soldPerVisit === null ? '—' : `${fNumber(a.soldPerVisit, 1)} pcs`,
        },
        { label: 'Rata-rata kiriman', value: `${fNumber(a.avgKirim, 1)} pcs` },
        {
          label: 'Rata-rata sisa',
          value: a.avgStock === null ? '—' : `${fNumber(a.avgStock, 1)} pcs`,
        },
        { label: 'BS dari stok tersedia', value: fPercent(a.bsRate) },
        { label: 'Tren', value: TREND_LABEL[a.trend] },
      ]
    : [];

  return (
    <Drawer
      anchor="right"
      open={!!pair}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: 1, md: 760 } } } }}
    >
      {a && (
        <>
          <Box sx={{ p: 2.5, gap: 1, display: 'flex', alignItems: 'flex-start' }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6">
                {storeMap.get(a.nit)?.nama ?? a.nit} · {a.product}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Toko {a.nit} · {productMap.get(a.product)?.nama ?? a.product}
              </Typography>
            </Box>
            <IconButton onClick={onClose} aria-label="Tutup">
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Box>
          {query.fetching && <LinearProgress sx={{ height: 2 }} />}

          <Scrollbar sx={{ px: 2.5, pb: 3 }}>
            <Alert
              severity={
                a.risk === 'wajar' ? 'success' : a.risk === 'belum-cukup' ? 'info' : 'warning'
              }
              variant="outlined"
              sx={{ mb: 2 }}
            >
              <strong>{RISK_LABEL[a.risk].text}.</strong> {a.riskReason}
            </Alert>

            <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
              Data yang dianalisis:{' '}
              {a.dataFrom
                ? `${fNumber(a.observations)} kunjungan berdata lengkap, ${fDate(a.dataFrom)} – ${fDate(a.dataTo!)}`
                : 'belum ada kunjungan berdata lengkap'}
              . Aturan: maksimal {settings.historyVisits} kunjungan terakhir dalam{' '}
              {settings.historyDays} hari sampai {fDate(filters.to)} (sejak{' '}
              {fDate(historyFrom(filters.to, settings))}), minimal {settings.minObservations}{' '}
              kunjungan — Pengaturan {version ? `versi #${version}` : 'default'}.
              {a.checks + a.insufficient > 0 &&
                ` ${fNumber(a.checks)} kunjungan perlu diperiksa dan ${fNumber(a.insufficient)} belum cukup datanya di rentang ini tidak dihitung.`}
            </Typography>

            <Box
              sx={{
                mb: 3,
                gap: 2,
                display: 'grid',
                gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
              }}
            >
              {stats.map((s) => (
                <Box key={s.label} sx={{ p: 1.5, borderRadius: 1, bgcolor: 'background.neutral' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {s.label}
                    {s.hint && ` (${s.hint})`}
                  </Typography>
                  <Typography variant="subtitle1">{s.value}</Typography>
                </Box>
              ))}
            </Box>

            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Riwayat kunjungan
            </Typography>
            <Typography
              variant="caption"
              sx={{ mb: 1.5, display: 'block', color: 'text.secondary' }}
            >
              Terjual = sisa awal + kiriman (keduanya dari kunjungan sebelumnya) − sisa − BS
              (kunjungan ini). Baris bertanda ✓ dipakai dalam perkiraan.
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Tanggal</TableCell>
                  <TableCell align="right">Sisa awal</TableCell>
                  <TableCell align="right">+ Kiriman</TableCell>
                  <TableCell align="right">− Sisa</TableCell>
                  <TableCell align="right">− BS</TableCell>
                  <TableCell align="right">= Terjual</TableCell>
                  <TableCell align="right">/ hari</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((row) => (
                  <TableRow key={row.tgl}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {row.used && (
                        <Iconify
                          icon="eva:checkmark-fill"
                          width={14}
                          sx={{ mr: 0.5, color: 'success.main', verticalAlign: 'middle' }}
                        />
                      )}
                      {fDate(row.tgl)}
                      {row.days > 0 && (
                        <Typography
                          variant="caption"
                          sx={{ display: 'block', color: 'text.secondary' }}
                        >
                          {row.days} hari sejak kunjungan lalu · kirim {fNumber(row.kirim)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">{row.stockStart ?? '—'}</TableCell>
                    <TableCell align="right">{row.prevKirim ?? '—'}</TableCell>
                    <TableCell align="right">{row.stock}</TableCell>
                    <TableCell align="right">{row.bs}</TableCell>
                    <TableCell align="right">
                      <strong>{row.estSold ?? '—'}</strong>
                    </TableCell>
                    <TableCell align="right">
                      {row.perDay === null ? '—' : fNumber(row.perDay, 1)}
                    </TableCell>
                    <TableCell>
                      <Tooltip title={row.reason ? CELL_REASON_LABEL[row.reason] : ''}>
                        <span>
                          <Label color={STATUS_LABEL[row.status].color} variant="soft">
                            {STATUS_LABEL[row.status].text}
                          </Label>
                        </span>
                      </Tooltip>
                      {row.reason && (
                        <Typography
                          variant="caption"
                          sx={{ display: 'block', color: 'text.secondary' }}
                        >
                          {CELL_REASON_LABEL[row.reason]}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Scrollbar>
        </>
      )}
    </Drawer>
  );
}
