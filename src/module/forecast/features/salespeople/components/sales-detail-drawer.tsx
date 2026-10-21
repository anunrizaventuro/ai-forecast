import type { SalesSummary } from '../utils';

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

import { Iconify } from 'src/shared/ui/iconify';
import { Scrollbar } from 'src/shared/ui/scrollbar';
import { ReturnRateCell } from 'src/module/forecast/shared/components';
import { fDate, fNumber, fPercent } from 'src/module/forecast/shared/utils';

// ----------------------------------------------------------------------

type Props = {
  row: SalesSummary | null;
  returnThreshold: number;
  onClose: () => void;
};

export function SalesDetailDrawer({ row, returnThreshold, onClose }: Props) {
  const stats = row
    ? [
        { label: 'Toko', value: fNumber(row.stores.length) },
        { label: 'Kunjungan', value: fNumber(row.visits) },
        {
          label: 'Interval rata-rata',
          value: row.avgInterval === null ? '–' : `${fNumber(row.avgInterval, 1)} hari`,
        },
        { label: 'Total kiriman', value: `${fNumber(row.kirim)} pcs` },
        { label: 'Estimasi terjual', value: `${fNumber(row.estSold)} pcs` },
        { label: 'Rasio retur', value: fPercent(row.returnRate) },
      ]
    : [];

  const stores = row ? [...row.stores].sort((a, b) => b.kirim - a.kirim) : [];

  return (
    <Drawer
      anchor="right"
      open={!!row}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: { xs: 1, sm: 560 }, display: 'flex' } } }}
    >
      {row && (
        <>
          <Box sx={{ p: 2.5, gap: 2, display: 'flex', alignItems: 'flex-start' }}>
            <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
              <Typography variant="h6" noWrap>
                {row.sales}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Kunjungan terakhir {row.lastVisit ? fDate(row.lastVisit) : '–'}
              </Typography>
            </Box>
            <IconButton onClick={onClose} aria-label="Tutup detail sales">
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

              <Typography variant="subtitle1" sx={{ mt: 4, mb: 0.5 }}>
                Toko yang dilayani
              </Typography>
              <Typography
                variant="caption"
                sx={{ display: 'block', mb: 2, color: 'text.secondary' }}
              >
                Toko yang kunjungan terakhirnya di rentang ini dilakukan oleh {row.sales}
              </Typography>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Toko</TableCell>
                    <TableCell align="right">Kunjungan</TableCell>
                    <TableCell align="right">Kiriman</TableCell>
                    <TableCell align="right">Retur</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stores.map((store) => (
                    <TableRow key={store.store.nit}>
                      <TableCell>
                        <Typography variant="body2" noWrap sx={{ maxWidth: 240 }}>
                          {store.store.nama}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          NIT {store.store.nit} · Kec. {store.store.kec}
                          {store.lastVisit && ` · terakhir ${fDate(store.lastVisit)}`}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{fNumber(store.visits)}</TableCell>
                      <TableCell align="right">{fNumber(store.kirim)}</TableCell>
                      <TableCell align="right">
                        <ReturnRateCell value={store.returnRate} threshold={returnThreshold} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Scrollbar>
        </>
      )}
    </Drawer>
  );
}
