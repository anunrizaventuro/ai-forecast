'use client';

import type { HeadCell } from '../forecast-table';
import type { StoreSummary, ForecastFilters } from '../forecast-utils';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';

import { fNumber, fPercent } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

import { ForecastFilterBar } from '../forecast-filter-bar';
import { StoreDetailDrawer } from '../store-detail-drawer';
import { ForecastDataState } from '../forecast-data-state';
import { fDate, DEFAULT_FILTERS } from '../forecast-utils';
import { ForecastPageHeader } from '../forecast-page-header';
import { ForecastSimulationAlert } from '../forecast-simulation-alert';
import { IS_API, useForecastMeta, useForecastStores } from '../use-forecast-data';
import {
  sortRows,
  TableEmptyRow,
  useTableState,
  ForecastTableHead,
  ForecastTablePagination,
} from '../forecast-table';

// ----------------------------------------------------------------------
// Data: use-forecast-data. Mode simulasi memakai 72 toko fiktif dengan pola
// kode nit yang sama dengan MToko (digit pertama = kec); mode API memakai
// MToko asli (tanpa pemilik/HP/koordinat). Hanya toko aktif di rentang.

type ColumnId =
  | 'nit'
  | 'nama'
  | 'kec'
  | 'lastSales'
  | 'visits'
  | 'avgInterval'
  | 'lastVisit'
  | 'productCount'
  | 'kirim'
  | 'returnRate';

const HEAD: HeadCell<ColumnId>[] = [
  { id: 'nit', label: 'NIT' },
  { id: 'nama', label: 'Nama toko', minWidth: 200 },
  { id: 'kec', label: 'Kec.' },
  { id: 'lastSales', label: 'Sales terakhir', minWidth: 120 },
  { id: 'visits', label: 'Kunjungan', align: 'right' },
  { id: 'avgInterval', label: 'Interval', align: 'right' },
  { id: 'lastVisit', label: 'Kunjungan terakhir', minWidth: 150 },
  { id: 'productCount', label: 'Produk', align: 'right' },
  { id: 'kirim', label: 'Kiriman (pcs)', align: 'right', minWidth: 120 },
  { id: 'returnRate', label: 'Rasio retur', align: 'right', minWidth: 110 },
];

const getSortValue = (row: StoreSummary, id: ColumnId) => {
  if (id === 'nit' || id === 'nama' || id === 'kec') return row.store[id];
  return row[id];
};

const FIELD_SX = { minWidth: { xs: 1, sm: 140 }, flex: { xs: '1 1 100%', sm: '0 1 auto' } };

export function StoreListView() {
  const [filters, setFilters] = useState<ForecastFilters>(DEFAULT_FILTERS);
  const [query, setQuery] = useState('');
  const [kec, setKec] = useState<number | 'all'>('all');
  const [sales, setSales] = useState('all');
  const [selected, setSelected] = useState<StoreSummary | null>(null);

  const table = useTableState<ColumnId>('nit', 'asc');
  const { resetPage } = table;

  const handleChange = useCallback(
    (patch: Partial<ForecastFilters>) => setFilters((prev) => ({ ...prev, ...patch })),
    []
  );

  const { meta } = useForecastMeta();
  const storeQuery = useForecastStores(filters);
  const storeRows = useMemo(() => storeQuery.data ?? [], [storeQuery.data]);
  const kecOptions = useMemo(
    () => [...new Set(meta.stores.map((s) => s.kec))].sort((a, b) => a - b),
    [meta.stores]
  );

  const rows = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const filtered = storeRows.filter(
      (row) =>
        (kec === 'all' || row.store.kec === kec) &&
        (sales === 'all' || (row.lastSales ?? '').split(', ').includes(sales)) &&
        (!keyword ||
          row.store.nama.toLowerCase().includes(keyword) ||
          row.store.nit.includes(keyword))
    );
    return sortRows(filtered, (row) => getSortValue(row, table.orderBy), table.order);
  }, [storeRows, query, kec, sales, table.order, table.orderBy]);

  useEffect(() => {
    resetPage();
  }, [filters, query, kec, sales, resetPage]);

  const pageRows = rows.slice(
    table.page * table.rowsPerPage,
    table.page * table.rowsPerPage + table.rowsPerPage
  );

  return (
    <>
      <ForecastPageHeader
        title="Data Toko"
        description="Daftar toko beserta pola kunjungan, volume kiriman, dan retur. Klik baris untuk melihat detail dan rekomendasi."
      />

      <ForecastSimulationAlert />

      <ForecastFilterBar filters={filters} onChange={handleChange} showStore={false}>
        <TextField
          size="small"
          label="Cari toko"
          placeholder="Nama atau NIT"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" width={18} sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ ...FIELD_SX, minWidth: { xs: 1, sm: 220 } }}
        />
        <TextField
          select
          size="small"
          label="Wilayah"
          value={kec}
          onChange={(event) =>
            setKec(event.target.value === 'all' ? 'all' : Number(event.target.value))
          }
          sx={FIELD_SX}
        >
          <MenuItem value="all">Semua kec</MenuItem>
          {kecOptions.map((value) => (
            <MenuItem key={value} value={value}>
              {value ? `Kec. ${value}` : 'Di luar master'}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Sales"
          value={sales}
          onChange={(event) => setSales(event.target.value)}
          sx={FIELD_SX}
        >
          <MenuItem value="all">Semua sales</MenuItem>
          {meta.sales.map((value) => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
        </TextField>
      </ForecastFilterBar>

      <ForecastDataState
        error={storeQuery.error}
        fetching={storeQuery.fetching}
        onRetry={storeQuery.refetch}
      />

      <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
        {fNumber(rows.length)} toko aktif · nama sales disamarkan{' '}
        {IS_API ? '(Sales-NN)' : '(S-A … S-J)'} sesuai dokumen analisis
      </Typography>

      <Card>
        <TableContainer>
          <Table sx={{ minWidth: 1100 }}>
            <ForecastTableHead
              cells={HEAD}
              order={table.order}
              orderBy={table.orderBy}
              onSort={table.onSort}
            />
            <TableBody>
              {pageRows.map((row) => (
                <TableRow
                  key={row.store.nit}
                  hover
                  tabIndex={0}
                  onClick={() => setSelected(row)}
                  onKeyDown={(event) => event.key === 'Enter' && setSelected(row)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{row.store.nit}</TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" noWrap sx={{ maxWidth: 240 }}>
                      {row.store.nama}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.store.kec}</TableCell>
                  <TableCell>{row.lastSales ?? '–'}</TableCell>
                  <TableCell align="right">{fNumber(row.visits)}</TableCell>
                  <TableCell align="right">
                    {row.avgInterval === null ? '–' : `${fNumber(row.avgInterval, 1)} hr`}
                  </TableCell>
                  <TableCell>{row.lastVisit ? fDate(row.lastVisit) : '–'}</TableCell>
                  <TableCell align="right">{fNumber(row.productCount)}</TableCell>
                  <TableCell align="right">{fNumber(row.kirim)}</TableCell>
                  <TableCell align="right">{fPercent(row.returnRate)}</TableCell>
                </TableRow>
              ))}
              {!pageRows.length && <TableEmptyRow colSpan={HEAD.length} />}
            </TableBody>
          </Table>
        </TableContainer>

        <ForecastTablePagination
          count={rows.length}
          page={table.page}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.setPage}
          onRowsPerPageChange={table.setRowsPerPage}
        />
      </Card>

      <StoreDetailDrawer row={selected} asOf={filters.to} onClose={() => setSelected(null)} />
    </>
  );
}
