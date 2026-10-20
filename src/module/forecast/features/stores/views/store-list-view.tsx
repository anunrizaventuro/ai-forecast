import type { TableHeadCellProps } from 'src/shared/ui/table';
import type { StoreSummary, ForecastFilters } from 'src/module/forecast/shared/utils';

import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';

import { Label } from 'src/shared/ui/label';
import { Iconify } from 'src/shared/ui/iconify';
import { useTable, TableHeadCustom } from 'src/shared/ui/table';
import { fDate, fNumber, fPercent, DEFAULT_FILTERS } from 'src/module/forecast/shared/utils';
import {
  IS_API,
  useForecastMeta,
  useForecastStores,
  useForecastSettings,
} from 'src/module/forecast/shared/hooks';
import {
  SERIES,
  sortRows,
  NameAvatar,
  InlineBarCell,
  TableEmptyRow,
  ReturnRateCell,
  ForecastFilterBar,
  ForecastDataState,
  ForecastStatStrip,
  ForecastPageHeader,
  ForecastSimulationAlert,
  ForecastTablePagination,
} from 'src/module/forecast/shared/components';

import { StoreDetailDrawer } from '../components/store-detail-drawer';

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

const HEAD: (TableHeadCellProps & { id: ColumnId })[] = [
  { id: 'nit', label: 'NIT' },
  { id: 'nama', label: 'Nama toko', sx: { minWidth: 200 } },
  { id: 'kec', label: 'Kec.' },
  { id: 'lastSales', label: 'Sales terakhir', sx: { minWidth: 120 } },
  { id: 'visits', label: 'Kunjungan', align: 'right' },
  { id: 'avgInterval', label: 'Interval', align: 'right' },
  { id: 'lastVisit', label: 'Kunjungan terakhir', sx: { minWidth: 150 } },
  { id: 'productCount', label: 'Produk', align: 'right' },
  { id: 'kirim', label: 'Kiriman (pcs)', align: 'right', sx: { minWidth: 120 } },
  { id: 'returnRate', label: 'Rasio retur', align: 'right', sx: { minWidth: 110 } },
];

const getSortValue = (row: StoreSummary, id: ColumnId) => {
  if (id === 'nit' || id === 'nama' || id === 'kec') return row.store[id];
  return row[id];
};

const FIELD_SX = { minWidth: { xs: 1, sm: 140 }, flex: { xs: '1 1 100%', sm: '0 1 auto' } };

export function StoreListView() {
  const [filters, setFilters] = useState<ForecastFilters>(DEFAULT_FILTERS);
  // Batas risiko BS dari Pengaturan (rasio BS ÷ kiriman sebelumnya).
  const { settings } = useForecastSettings();
  const returnThreshold = settings.bsRiskPct / 100;
  const [query, setQuery] = useState('');
  const [kec, setKec] = useState<number | 'all'>('all');
  const [sales, setSales] = useState('all');
  const [selected, setSelected] = useState<StoreSummary | null>(null);
  const theme = useTheme();

  const table = useTable({
    defaultOrderBy: 'nit',
    defaultOrder: 'asc',
    defaultRowsPerPage: 10,
    defaultDense: true,
  });
  const orderBy = table.orderBy as ColumnId;
  const { onResetPage: resetPage } = table;

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
    return sortRows(filtered, (row) => getSortValue(row, orderBy), table.order);
  }, [storeRows, query, kec, sales, table.order, orderBy]);

  const stats = useMemo(() => {
    const intervals = rows.flatMap((row) => (row.avgInterval === null ? [] : [row.avgInterval]));
    return {
      kirim: rows.reduce((acc, row) => acc + row.kirim, 0),
      visits: rows.reduce((acc, row) => acc + row.visits, 0),
      maxKirim: Math.max(0, ...rows.map((row) => row.kirim)),
      interval: intervals.length
        ? intervals.reduce((acc, value) => acc + value, 0) / intervals.length
        : null,
      highReturn: rows.filter((row) => row.returnRate !== null && row.returnRate > returnThreshold)
        .length,
    };
  }, [rows, returnThreshold]);

  useEffect(() => {
    resetPage();
  }, [filters, query, kec, sales, resetPage]);

  const pageRows = rows.slice(
    table.page * table.rowsPerPage,
    table.page * table.rowsPerPage + table.rowsPerPage
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
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

      <ForecastStatStrip
        items={[
          {
            label: 'Toko aktif',
            value: fNumber(rows.length),
            caption: `Sales disamarkan ${IS_API ? '(Sales-NN)' : '(S-A … S-J)'}`,
            icon: 'carbon:location',
            color: theme.vars.palette.primary.main,
          },
          {
            label: 'Total kiriman',
            value: `${fNumber(stats.kirim)} pcs`,
            caption: `${fNumber(stats.visits)} kunjungan`,
            icon: 'carbon:delivery',
            color: SERIES.kirim.color,
          },
          {
            label: 'Rata-rata interval kunjungan',
            value: stats.interval === null ? '–' : `${fNumber(stats.interval, 1)} hari`,
            caption: 'Jarak antar kunjungan per toko',
            icon: 'solar:calendar-date-linear',
            color: SERIES.estSold.color,
          },
          {
            label: 'Toko retur tinggi',
            value: fNumber(stats.highReturn),
            caption: `Rasio retur > ${fPercent(returnThreshold, 0)}`,
            icon: 'solar:info-circle-outline',
            color: theme.vars.palette.error.main,
          },
        ]}
      />

      <Card>
        <TableContainer>
          <Table sx={{ sx: { minWidth: 1100 } }}>
            <TableHeadCustom
              headCells={HEAD}
              order={table.order}
              orderBy={table.orderBy}
              onSort={(id) => {
                table.onSort(id);
                table.onResetPage();
              }}
              sx={{ whiteSpace: 'nowrap' }}
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
                    <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'center' }}>
                      <NameAvatar name={row.store.nama} />
                      <Typography variant="subtitle2" noWrap sx={{ maxWidth: 220 }}>
                        {row.store.nama}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{row.store.kec}</TableCell>
                  <TableCell>
                    {row.lastSales ? (
                      <Label variant="soft" color="default">
                        {row.lastSales}
                      </Label>
                    ) : (
                      '–'
                    )}
                  </TableCell>
                  <TableCell align="right">{fNumber(row.visits)}</TableCell>
                  <TableCell align="right">
                    {row.avgInterval === null ? '–' : `${fNumber(row.avgInterval, 1)} hr`}
                  </TableCell>
                  <TableCell>{row.lastVisit ? fDate(row.lastVisit) : '–'}</TableCell>
                  <TableCell align="right">{fNumber(row.productCount)}</TableCell>
                  <TableCell align="right">
                    <InlineBarCell value={row.kirim} max={stats.maxKirim} />
                  </TableCell>
                  <TableCell align="right">
                    <ReturnRateCell value={row.returnRate} threshold={returnThreshold} />
                  </TableCell>
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
    </Box>
  );
}
