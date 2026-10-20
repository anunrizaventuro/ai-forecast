import type { ImportBatch } from '../api';

import { useState } from 'react';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import CardHeader from '@mui/material/CardHeader';
import TableContainer from '@mui/material/TableContainer';

import { fDate, fNumber, fDateTime } from 'src/module/forecast/shared/utils';
import { TableEmptyRow, ForecastTablePagination } from 'src/module/forecast/shared/components';

// ----------------------------------------------------------------------

export function ImportHistory({ history }: { history: ImportBatch[] }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  return (
    <Card>
      <CardHeader title="Riwayat impor" subheader="50 impor terakhir yang sudah disimpan." />
      <TableContainer sx={{ mt: 2 }}>
        <Table size="small" sx={{ minWidth: 820 }}>
          <TableHead>
            <TableRow>
              <TableCell>Waktu simpan</TableCell>
              <TableCell>Jenis data</TableCell>
              <TableCell>File</TableCell>
              <TableCell>Periode data</TableCell>
              <TableCell align="right">Baru</TableCell>
              <TableCell align="right">Diperbarui</TableCell>
              <TableCell align="right">Tidak berubah</TableCell>
              <TableCell align="right">Dilewati (error)</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {history.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((b) => (
              <TableRow key={b.id}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {b.committedAt ? fDateTime(b.committedAt) : '—'}
                </TableCell>
                <TableCell>{b.kindLabel}</TableCell>
                <TableCell sx={{ wordBreak: 'break-all' }}>{b.fileName}</TableCell>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>
                  {b.periodFrom
                    ? b.periodTo && b.periodTo !== b.periodFrom
                      ? `${fDate(b.periodFrom)} – ${fDate(b.periodTo)}`
                      : fDate(b.periodFrom)
                    : '—'}
                </TableCell>
                <TableCell align="right">{fNumber(b.inserted)}</TableCell>
                <TableCell align="right">{fNumber(b.updated)}</TableCell>
                <TableCell align="right">{fNumber(b.unchanged)}</TableCell>
                <TableCell align="right">{fNumber(b.errorRows)}</TableCell>
              </TableRow>
            ))}
            {!history.length && <TableEmptyRow colSpan={8} text="Belum ada data yang diimpor." />}
          </TableBody>
        </Table>
      </TableContainer>
      <ForecastTablePagination
        count={history.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
      />
    </Card>
  );
}
