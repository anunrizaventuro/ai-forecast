import type { SettingsVersion } from 'src/module/forecast/shared/types';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { Label } from 'src/shared/ui/label';
import { TableEmptyRow } from 'src/module/forecast/shared/components';
import { fDateTime, DEFAULT_SETTINGS } from 'src/module/forecast/shared/utils';

import { diffSettings } from './settings-fields';

// ----------------------------------------------------------------------
// Riwayat versi pengaturan (terbaru dulu). Perubahan dibandingkan dengan
// versi sebelumnya; versi pertama dibandingkan dengan nilai default.

export function SettingsHistory({ history }: { history: SettingsVersion[] }) {
  return (
    <Card>
      <CardHeader
        title="Riwayat pengaturan"
        subheader="Setiap simpan membuat versi baru. Versi lama tidak diubah, jadi SPK final tetap bisa ditelusuri ke pengaturan yang dipakai."
      />
      <TableContainer sx={{ mt: 2 }}>
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              <TableCell width={90}>Versi</TableCell>
              <TableCell width={180}>Disimpan</TableCell>
              <TableCell>Perubahan</TableCell>
              <TableCell>Catatan</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.map((v, index) => {
              const previous = history[index + 1]?.params ?? DEFAULT_SETTINGS;
              const changes = diffSettings(previous, v.params);
              return (
                <TableRow key={v.version}>
                  <TableCell>
                    #{v.version}{' '}
                    {index === 0 && (
                      <Label color="success" variant="soft" sx={{ ml: 0.5 }}>
                        Aktif
                      </Label>
                    )}
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {v.createdAt ? fDateTime(v.createdAt) : '—'}
                  </TableCell>
                  <TableCell>
                    {changes.length ? (
                      changes.map((c) => (
                        <Typography key={c.label} variant="caption" component="div">
                          {c.label}: {c.from} → {c.to}
                        </Typography>
                      ))
                    ) : (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        Sama dengan {history[index + 1] ? 'versi sebelumnya' : 'default'}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ color: v.note ? 'text.primary' : 'text.disabled' }}>
                    {v.note || '—'}
                  </TableCell>
                </TableRow>
              );
            })}
            {!history.length && (
              <TableEmptyRow
                colSpan={4}
                text="Belum pernah disimpan — semua parameter memakai nilai default."
              />
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
