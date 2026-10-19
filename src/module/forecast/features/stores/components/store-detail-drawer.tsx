import type { StoreSummary } from 'src/module/forecast/shared/utils';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';

import { Label } from 'src/shared/ui/label';
import { Iconify } from 'src/shared/ui/iconify';
import { Scrollbar } from 'src/shared/ui/scrollbar';
import { RecommendationDelta } from 'src/module/forecast/shared/components';
import { IS_API, useForecastRecommendations } from 'src/module/forecast/shared/hooks';
import { fDate, fNumber, fPercent, CONFIDENCE_LABEL } from 'src/module/forecast/shared/utils';

// ----------------------------------------------------------------------

type Props = {
  row: StoreSummary | null;
  asOf: string;
  onClose: () => void;
};

export function StoreDetailDrawer({ row, asOf, onClose }: Props) {
  const query = useForecastRecommendations({ asOf, nit: row?.store.nit ?? null }, !!row);
  const recommendations = query.data ?? [];

  const stats = row
    ? [
        { label: 'Kunjungan', value: fNumber(row.visits) },
        {
          label: 'Interval rata-rata',
          value: row.avgInterval === null ? '–' : `${fNumber(row.avgInterval, 1)} hari`,
        },
        { label: 'Total kiriman', value: `${fNumber(row.kirim)} pcs` },
        { label: 'Estimasi terjual', value: `${fNumber(row.estSold)} pcs` },
        { label: 'Retur (BS)', value: `${fNumber(row.bs)} pcs` },
        { label: 'Rasio retur', value: fPercent(row.returnRate) },
      ]
    : [];

  return (
    <Drawer
      anchor="right"
      open={!!row}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: 1, sm: 520 }, display: 'flex' } } }}
    >
      {row && (
        <>
          <Box sx={{ p: 2.5, gap: 2, display: 'flex', alignItems: 'flex-start' }}>
            <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
              <Typography variant="h6" noWrap>
                {row.store.nama}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                NIT {row.store.nit} · Kec. {row.store.kec} · Sales terakhir {row.lastSales ?? '–'}
              </Typography>
            </Box>
            <IconButton onClick={onClose} aria-label="Tutup detail toko">
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Box>

          <Divider />

          <Scrollbar sx={{ flex: '1 1 auto' }}>
            <Box sx={{ p: 2.5 }}>
              <Box
                sx={{
                  gap: 2,
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
                }}
              >
                {stats.map((stat) => (
                  <Box key={stat.label}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {stat.label}
                    </Typography>
                    <Typography variant="subtitle1">{stat.value}</Typography>
                  </Box>
                ))}
              </Box>

              <Box sx={{ mt: 4, mb: 1, gap: 1, display: 'flex', alignItems: 'center' }}>
                <Typography variant="subtitle1">Rekomendasi kunjungan berikutnya</Typography>
                <Label color={IS_API ? 'info' : 'warning'} variant="soft">
                  {IS_API ? 'Baseline' : 'Simulasi'}
                </Label>
              </Box>
              <Typography
                variant="caption"
                sx={{ display: 'block', mb: 2, color: 'text.secondary' }}
              >
                Data s.d. {fDate(asOf)}
                {recommendations[0] &&
                  ` · perkiraan kunjungan ${fDate(recommendations[0].nextVisit)}`}
              </Typography>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Produk</TableCell>
                    <TableCell align="right">Terakhir</TableCell>
                    <TableCell align="right">Est. terjual</TableCell>
                    <TableCell align="right">Rekomendasi</TableCell>
                    <TableCell>Kepercayaan</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recommendations.map((rec) => (
                    <TableRow key={rec.product}>
                      <TableCell>{rec.product}</TableCell>
                      <TableCell align="right">{fNumber(rec.lastKirim)}</TableCell>
                      <TableCell align="right">{fNumber(rec.estSold, 1)}</TableCell>
                      <TableCell align="right">
                        {rec.excluded ? (
                          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                            Dikecualikan
                          </Typography>
                        ) : (
                          <RecommendationDelta value={rec.recommended} delta={rec.delta} />
                        )}
                      </TableCell>
                      <TableCell>{CONFIDENCE_LABEL[rec.confidence]}</TableCell>
                    </TableRow>
                  ))}
                  {!recommendations.length && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        sx={{ py: 3, textAlign: 'center', color: 'text.secondary' }}
                      >
                        {query.loading
                          ? 'Memuat rekomendasi…'
                          : 'Belum ada kunjungan sebelum tanggal ini.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Scrollbar>
        </>
      )}
    </Drawer>
  );
}
