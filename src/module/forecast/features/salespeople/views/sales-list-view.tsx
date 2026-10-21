import type { SalesSummary } from '../utils';
import type { TableHeadCellProps } from 'src/shared/ui/table';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { useTable, TableHeadCustom } from 'src/shared/ui/table';
import { fDate, fNumber, fPercent } from 'src/module/forecast/shared/utils';
import {
  IS_API,
  useForecastStores,
  useForecastFilters,
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

import { NO_SALES, groupBySales } from '../utils';
import { SalesDetailDrawer } from '../components/sales-detail-drawer';

// ----------------------------------------------------------------------
// Data: ringkasan toko (use-forecast-data) dikelompokkan per sales kunjungan
// terakhir — lihat utils/group-by-sales.ts. Tidak ada endpoint backend khusus.

type ColumnId =
  | 'sales'
  | 'storeCount'
  | 'visits'
  | 'avgInterval'
  | 'lastVisit'
  | 'kirim'
  | 'estSold'
  | 'returnRate';

const HEAD: (TableHeadCellProps & { id: ColumnId })[] = [
  { id: 'sales', label: 'Sales', sx: { minWidth: 160 } },
  { id: 'storeCount', label: 'Toko', align: 'right' },
  { id: 'visits', label: 'Kunjungan', align: 'right' },
  { id: 'avgInterval', label: 'Interval', align: 'right' },
  { id: 'lastVisit', label: 'Kunjungan terakhir', sx: { minWidth: 150 } },
  { id: 'kirim', label: 'Kiriman (pcs)', align: 'right', sx: { minWidth: 120 } },
  { id: 'estSold', label: 'Est. terjual (pcs)', align: 'right' },
  { id: 'returnRate', label: 'Rasio retur', align: 'right', sx: { minWidth: 110 } },
];

const getSortValue = (row: SalesSummary, id: ColumnId) => {
  if (id === 'storeCount') return row.stores.length;
  return row[id];
};

export function SalesListView() {
  const [filters, handleChange] = useForecastFilters();
  const { settings } = useForecastSettings();
  const returnThreshold = settings.bsRiskPct / 100;
  const [selected, setSelected] = useState<SalesSummary | null>(null);
  const theme = useTheme();

  const table = useTable({
    defaultOrderBy: 'kirim',
    defaultOrder: 'desc',
    defaultRowsPerPage: 10,
    defaultDense: true,
  });
  const orderBy = table.orderBy as ColumnId;

  const storeQuery = useForecastStores(filters);

  const rows = useMemo(() => {
    const grouped = groupBySales(storeQuery.data ?? []);
    return sortRows(grouped, (row) => getSortValue(row, orderBy), table.order);
  }, [storeQuery.data, orderBy, table.order]);

  const stats = useMemo(() => {
    const stores = storeQuery.data ?? [];
    const named = rows.filter((row) => row.sales !== NO_SALES);
    return {
      sales: named.length,
      stores: stores.length,
      kirim: stores.reduce((acc, s) => acc + s.kirim, 0),
      maxKirim: Math.max(0, ...rows.map((row) => row.kirim)),
      shared: stores.filter((s) => (s.lastSales ?? '').includes(', ')).length,
      highReturn: named.filter((row) => row.returnRate !== null && row.returnRate > returnThreshold)
        .length,
    };
  }, [rows, storeQuery.data, returnThreshold]);

  const pageRows = rows.slice(
    table.page * table.rowsPerPage,
    table.page * table.rowsPerPage + table.rowsPerPage
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <ForecastPageHeader
        title="Data Sales"
        description="Ringkasan per sales: toko yang dilayani, kunjungan, kiriman, dan retur. Klik baris untuk melihat daftar tokonya."
      />

      <ForecastSimulationAlert>
        {' '}
        Belum ada master sales yang dipakai di transaksi: nama sales diambil dari kolom isian bebas,
        sehingga ejaan yang berbeda tampil sebagai sales terpisah. Toko dihitung untuk sales pada
        kunjungan terakhirnya di rentang.
      </ForecastSimulationAlert>

      <ForecastFilterBar filters={filters} onChange={handleChange} showStore={false} />

      <ForecastDataState
        error={storeQuery.error}
        fetching={storeQuery.fetching}
        onRetry={storeQuery.refetch}
      />

      <ForecastStatStrip
        items={[
          {
            label: 'Sales aktif',
            value: fNumber(stats.sales),
            caption: `Nama disamarkan ${IS_API ? '(Sales-NN)' : '(S-A … S-J)'}`,
            icon: 'solar:user-rounded-outline',
            color: theme.vars.palette.primary.main,
          },
          {
            label: 'Toko aktif',
            value: fNumber(stats.stores),
            caption: stats.shared
              ? `${fNumber(stats.shared)} toko dikunjungi >1 sales sekaligus`
              : 'Satu sales per toko',
            icon: 'carbon:location',
            color: SERIES.estSold.color,
          },
          {
            label: 'Total kiriman',
            value: `${fNumber(stats.kirim)} pcs`,
            caption: 'Semua toko aktif di rentang',
            icon: 'carbon:delivery',
            color: SERIES.kirim.color,
          },
          {
            label: 'Sales retur tinggi',
            value: fNumber(stats.highReturn),
            caption: `Rasio retur > ${fPercent(returnThreshold, 0)}`,
            icon: 'solar:info-circle-outline',
            color: theme.vars.palette.error.main,
          },
        ]}
      />

      <Card>
        <TableContainer>
          <Table sx={{ minWidth: 960 }}>
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
                  key={row.sales}
                  hover
                  tabIndex={0}
                  onClick={() => setSelected(row)}
                  onKeyDown={(event) => event.key === 'Enter' && setSelected(row)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'center' }}>
                      <NameAvatar name={row.sales} />
                      <Typography
                        variant="subtitle2"
                        sx={row.sales === NO_SALES ? { color: 'text.secondary' } : undefined}
                      >
                        {row.sales}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">{fNumber(row.stores.length)}</TableCell>
                  <TableCell align="right">{fNumber(row.visits)}</TableCell>
                  <TableCell align="right">
                    {row.avgInterval === null ? '–' : `${fNumber(row.avgInterval, 1)} hr`}
                  </TableCell>
                  <TableCell>{row.lastVisit ? fDate(row.lastVisit) : '–'}</TableCell>
                  <TableCell align="right">
                    <InlineBarCell value={row.kirim} max={stats.maxKirim} />
                  </TableCell>
                  <TableCell align="right">{fNumber(row.estSold)}</TableCell>
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

      <SalesDetailDrawer
        row={selected}
        returnThreshold={returnThreshold}
        onClose={() => setSelected(null)}
      />
    </Box>
  );
}
