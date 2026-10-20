import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { Label } from 'src/shared/ui/label';
import { Iconify } from 'src/shared/ui/iconify';
import { fDate, fNumber, fDateTime } from 'src/module/forecast/shared/utils';
import { useForecastMeta, useForecastSettings } from 'src/module/forecast/shared/hooks';
import {
  TableEmptyRow,
  ForecastDataState,
  ForecastPageHeader,
  ForecastSimulationAlert,
} from 'src/module/forecast/shared/components';

import { useSpkList } from '../hooks';
import { SPK_STATUS } from '../components/spk-labels';
import { SpkCreateDialog } from '../components/spk-create-dialog';

// ----------------------------------------------------------------------

export function SpkListView() {
  const router = useRouter();
  const list = useSpkList();
  const meta = useForecastMeta();
  const { version } = useForecastSettings();
  const [creating, setCreating] = useState(false);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <ForecastPageHeader
        title="SPK"
        description="Surat Perintah Kerja: jumlah tiap roti yang dibawa kurir ke tiap toko. Buat draf dari saran sistem, koreksi angkanya, lalu finalisasi. SPK final tidak berubah walau pengaturan atau data berubah."
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => setCreating(true)}
            disabled={meta.loading}
          >
            Buat draf SPK
          </Button>
        }
      />

      <ForecastSimulationAlert />

      <ForecastDataState error={list.error ?? meta.error} onRetry={list.refetch} />

      <Card>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 860 }}>
            <TableHead>
              <TableRow>
                <TableCell>Tanggal</TableCell>
                <TableCell>Kurir</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Toko</TableCell>
                <TableCell align="right">Total roti</TableCell>
                <TableCell>Pengaturan</TableCell>
                <TableCell>Data s.d.</TableCell>
                <TableCell>Terakhir diubah</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(list.data ?? []).map((spk) => (
                <TableRow
                  key={spk.id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => router.push(paths.dashboard.spkDetail(spk.id))}
                >
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Typography variant="subtitle2">{fDate(spk.tgl)}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      #{spk.id}
                    </Typography>
                  </TableCell>
                  <TableCell>{spk.kurir}</TableCell>
                  <TableCell>
                    <Label variant="soft" color={SPK_STATUS[spk.status].color}>
                      {SPK_STATUS[spk.status].label}
                    </Label>
                    {spk.status === 'draft' && spk.emptyCount > 0 && (
                      <Typography variant="caption" component="div" sx={{ color: 'warning.main' }}>
                        {spk.emptyCount} kosong
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">{fNumber(spk.stores.length)}</TableCell>
                  <TableCell align="right">{fNumber(spk.totalQty)} pcs</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {spk.settingsVersion > 0 ? `Versi #${spk.settingsVersion}` : 'Default'}
                    {spk.status === 'draft' && spk.settingsVersion !== version && (
                      <Typography variant="caption" component="div" sx={{ color: 'warning.main' }}>
                        bukan versi aktif
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{fDate(spk.dataAsOf)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{fDateTime(spk.updatedAt)}</TableCell>
                </TableRow>
              ))}
              {!list.loading && !list.data?.length && (
                <TableEmptyRow
                  colSpan={8}
                  text='Belum ada SPK. Klik "Buat draf SPK" untuk mulai.'
                />
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {creating && (
        <SpkCreateDialog
          open
          onClose={() => setCreating(false)}
          onCreated={(spk) => router.push(paths.dashboard.spkDetail(spk.id))}
        />
      )}
    </Box>
  );
}
