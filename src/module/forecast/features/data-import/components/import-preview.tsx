import type { ImportBatch } from '../api';

import { useState } from 'react';

import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Card from '@mui/material/Card';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { Label } from 'src/shared/ui/label';
import { fDate, fNumber } from 'src/module/forecast/shared/utils';
import {
  TableEmptyRow,
  ForecastStatStrip,
  ForecastTablePagination,
} from 'src/module/forecast/shared/components';

import { tableLabel, LEVEL_LABEL, STATUS_LABEL } from './import-labels';

// ----------------------------------------------------------------------
// Hasil pemeriksaan file sebelum disimpan: ringkasan angka, catatan asumsi,
// daftar masalah per baris, dan contoh baris beserta statusnya terhadap
// database (baru / diperbarui / tidak berubah).

type Props = {
  batch: ImportBatch;
  committing: boolean;
  onCommit: () => void;
  onCancel: () => void;
};

export function ImportPreview({ batch, committing, onCommit, onCancel }: Props) {
  const theme = useTheme();
  const toSave = batch.inserted + batch.updated;
  const tables = Object.entries(batch.tables);

  return (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      <ForecastStatStrip
        items={[
          {
            label: 'Baris dibaca',
            value: fNumber(batch.totalRows),
            caption: batch.fileName,
            icon: 'carbon:list-boxes',
            color: theme.vars.palette.primary.main,
          },
          {
            label: 'Siap diimpor',
            value: fNumber(batch.validRows),
            caption: `${fNumber(batch.warningRows)} dengan peringatan`,
            icon: 'solar:check-circle-bold',
            color: theme.vars.palette.success.main,
          },
          {
            label: 'Bermasalah (dilewati)',
            value: fNumber(batch.errorRows),
            caption: batch.errorRows ? 'Perbaiki di file lalu unggah ulang' : 'Tidak ada',
            icon: 'solar:danger-triangle-bold',
            color: theme.vars.palette.error.main,
          },
          {
            label: 'Periode data',
            value: batch.periodFrom ? fDate(batch.periodFrom) : '—',
            caption:
              batch.periodTo && batch.periodTo !== batch.periodFrom
                ? `s.d. ${fDate(batch.periodTo)}`
                : batch.periodFrom
                  ? 'satu tanggal'
                  : 'data master (tanpa tanggal)',
            icon: 'solar:calendar-date-bold',
            color: theme.vars.palette.info.main,
          },
        ]}
      />

      <Alert severity={toSave ? 'info' : 'success'} variant="outlined">
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          {toSave
            ? `Yang akan disimpan: ${fNumber(batch.inserted)} data baru dan ${fNumber(batch.updated)} data diperbarui. ${fNumber(batch.unchanged)} data sudah sama dan dilewati.`
            : `Semua ${fNumber(batch.unchanged)} data sudah ada dan isinya sama — tidak ada yang perlu disimpan.`}
        </Typography>
        {tables.length > 1 && (
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            {tables.map(([table, c]) => (
              <li key={table}>
                {tableLabel(table)}: {fNumber(c.baru)} baru · {fNumber(c.diperbarui)} diperbarui ·{' '}
                {fNumber(c.sama)} tidak berubah
              </li>
            ))}
          </Box>
        )}
        {batch.notes.length > 0 && (
          <Box component="ul" sx={{ m: 0, mt: 1, pl: 2.5, color: 'text.secondary' }}>
            {batch.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </Box>
        )}
      </Alert>

      {batch.issuesTotal > 0 && <IssueTable batch={batch} />}

      <OpTable batch={batch} />

      <Box sx={{ gap: 1.5, display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <Button variant="outlined" color="inherit" onClick={onCancel} disabled={committing}>
          Batal
        </Button>
        <Button variant="contained" onClick={onCommit} disabled={!toSave} loading={committing}>
          {toSave ? `Simpan ${fNumber(toSave)} data` : 'Tidak ada perubahan'}
        </Button>
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------

type LevelFilter = 'semua' | 'error' | 'peringatan';

function IssueTable({ batch }: { batch: ImportBatch }) {
  const [filter, setFilter] = useState<LevelFilter>(batch.errorRows ? 'error' : 'semua');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const rows = batch.issues.filter((issue) => filter === 'semua' || issue.level === filter);
  const count = (level: LevelFilter) =>
    batch.issues.filter((i) => level === 'semua' || i.level === level).length;

  return (
    <Card>
      <CardHeader
        title="Masalah di file"
        subheader={
          batch.issuesTotal > batch.issues.length
            ? `Menampilkan ${fNumber(batch.issues.length)} dari ${fNumber(batch.issuesTotal)} masalah. Baris error tidak ikut disimpan; baris dengan peringatan tetap disimpan.`
            : 'Baris error tidak ikut disimpan; baris dengan peringatan tetap disimpan.'
        }
      />
      <Tabs
        value={filter}
        onChange={(_, value: LevelFilter) => {
          setFilter(value);
          setPage(0);
        }}
        sx={{ px: 2.5 }}
      >
        {(['semua', 'error', 'peringatan'] as const).map((level) => (
          <Tab
            key={level}
            value={level}
            label={`${level === 'semua' ? 'Semua' : LEVEL_LABEL[level].text} (${fNumber(count(level))})`}
          />
        ))}
      </Tabs>
      <TableContainer>
        <Table size="small" sx={{ minWidth: 640 }}>
          <TableHead>
            <TableRow>
              <TableCell width={80}>Baris</TableCell>
              <TableCell width={120}>Tingkat</TableCell>
              <TableCell width={120}>Kolom</TableCell>
              <TableCell>Keterangan</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((issue, index) => (
              <TableRow key={`${issue.row}-${issue.column}-${index}`}>
                <TableCell>{issue.row || 'File'}</TableCell>
                <TableCell>
                  <Label color={LEVEL_LABEL[issue.level].color} variant="soft">
                    {LEVEL_LABEL[issue.level].text}
                  </Label>
                </TableCell>
                <TableCell>{issue.column || '—'}</TableCell>
                <TableCell>{issue.message}</TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableEmptyRow colSpan={4} text="Tidak ada masalah di kategori ini." />
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <ForecastTablePagination
        count={rows.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
      />
    </Card>
  );
}

// ----------------------------------------------------------------------

type StatusFilter = 'semua' | 'baru' | 'diperbarui' | 'sama';

function OpTable({ batch }: { batch: ImportBatch }) {
  const [filter, setFilter] = useState<StatusFilter>('semua');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const rows = batch.ops.filter((op) => filter === 'semua' || op.status === filter);
  const hasTotal = batch.ops.some((op) => op.total !== null && op.total !== undefined);

  return (
    <Card>
      <CardHeader
        title="Contoh data yang dibaca"
        subheader={
          batch.opsTotal > batch.ops.length
            ? `${fNumber(batch.ops.length)} baris pertama dari ${fNumber(batch.opsTotal)}.`
            : `${fNumber(batch.opsTotal)} baris.`
        }
      />
      <Tabs
        value={filter}
        onChange={(_, value: StatusFilter) => {
          setFilter(value);
          setPage(0);
        }}
        sx={{ px: 2.5 }}
      >
        <Tab value="semua" label="Semua" />
        {(['baru', 'diperbarui', 'sama'] as const).map((status) => (
          <Tab key={status} value={status} label={STATUS_LABEL[status].text} />
        ))}
      </Tabs>
      <TableContainer>
        <Table size="small" sx={{ minWidth: 720 }}>
          <TableHead>
            <TableRow>
              <TableCell width={80}>Baris</TableCell>
              <TableCell width={110}>Disimpan ke</TableCell>
              <TableCell>Data</TableCell>
              {hasTotal && (
                <TableCell align="right" width={100}>
                  Jumlah (pcs)
                </TableCell>
              )}
              <TableCell width={130}>Status</TableCell>
              <TableCell>Perubahan</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.slice(page * rowsPerPage, (page + 1) * rowsPerPage).map((op) => (
              <TableRow key={`${op.table}-${op.key.join('|')}`}>
                <TableCell>{op.row}</TableCell>
                <TableCell>{tableLabel(op.table)}</TableCell>
                <TableCell>{op.label}</TableCell>
                {hasTotal && <TableCell align="right">{fNumber(op.total ?? 0)}</TableCell>}
                <TableCell>
                  <Label color={STATUS_LABEL[op.status].color} variant="soft">
                    {STATUS_LABEL[op.status].text}
                  </Label>
                </TableCell>
                <TableCell sx={{ typography: 'caption', color: 'text.secondary' }}>
                  {op.changes.length
                    ? op.changes
                        .map((c) => `${c.column}: ${c.old || '(kosong)'} → ${c.new}`)
                        .join(' · ')
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableEmptyRow colSpan={hasTotal ? 6 : 5} text="Tidak ada baris di kategori ini." />
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <ForecastTablePagination
        count={rows.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
      />
    </Card>
  );
}
