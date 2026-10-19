import type { TableHeadCellProps } from 'src/shared/ui/table';
import type { ProductSummary, ForecastFilters } from 'src/module/forecast/shared/utils';

import { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { Label } from 'src/shared/ui/label';
import { Iconify } from 'src/shared/ui/iconify';
import { useTable, TableHeadCustom } from 'src/shared/ui/table';
import {
  useForecastMeta,
  useForecastProducts,
  useRecommendationParams,
} from 'src/module/forecast/shared/hooks';
import {
  fNumber,
  fPercent,
  fCurrency,
  productGroup,
  DEFAULT_FILTERS,
  isExcludedProduct,
} from 'src/module/forecast/shared/utils';
import {
  SERIES,
  sortRows,
  TableEmptyRow,
  InlineBarCell,
  ReturnRateCell,
  ForecastFilterBar,
  ForecastStatStrip,
  ForecastDataState,
  ForecastPageHeader,
  ForecastSimulationAlert,
} from 'src/module/forecast/shared/components';

// ----------------------------------------------------------------------
// Master produk (kode, nama, harga) sama dengan tabel MRoti di database
// sumber. Kolom volume dari use-forecast-data (simulasi atau ai-forecast-be).

type ColumnId =
  | 'nir'
  | 'code'
  | 'hargaBeli'
  | 'hargaJual'
  | 'margin'
  | 'stores'
  | 'kirim'
  | 'estSold'
  | 'returnRate'
  | 'status';

const HEAD: (TableHeadCellProps & { id: ColumnId })[] = [
  { id: 'nir', label: 'NIR' },
  { id: 'code', label: 'Produk', sx: { minWidth: 200 } },
  { id: 'hargaBeli', label: 'Harga beli', align: 'right' },
  { id: 'hargaJual', label: 'Harga jual', align: 'right' },
  { id: 'margin', label: 'Margin', align: 'right' },
  { id: 'stores', label: 'Toko', align: 'right' },
  { id: 'kirim', label: 'Kiriman (pcs)', align: 'right', sx: { minWidth: 120 } },
  { id: 'estSold', label: 'Est. terjual (pcs)', align: 'right', sx: { minWidth: 140 } },
  { id: 'returnRate', label: 'Rasio retur', align: 'right', sx: { minWidth: 110 } },
  { id: 'status', label: 'Rekomendasi', sx: { minWidth: 150 } },
];

const margin = (row: ProductSummary) =>
  (row.product.hargaJual - row.product.hargaBeli) / row.product.hargaJual;

const getSortValue = (row: ProductSummary, id: ColumnId) => {
  switch (id) {
    case 'nir':
    case 'code':
    case 'hargaBeli':
    case 'hargaJual':
      return row.product[id];
    case 'margin':
      return margin(row);
    case 'status':
      return isExcludedProduct(row.product.code) ? 0 : 1;
    default:
      return row[id];
  }
};

const FIELD_SX = { minWidth: { xs: 1, sm: 160 }, flex: { xs: '1 1 100%', sm: '0 1 auto' } };

export function ProductListView() {
  const [filters, setFilters] = useState<ForecastFilters>(DEFAULT_FILTERS);
  const [group, setGroup] = useState('all');
  const [status, setStatus] = useState<'all' | 'otomatis' | 'dikecualikan'>('all');

  const table = useTable({
    defaultOrderBy: 'nir',
    defaultOrder: 'asc',
    defaultRowsPerPage: 10,
    defaultDense: true,
  });
  const orderBy = table.orderBy as ColumnId;
  const theme = useTheme();

  const handleChange = useCallback(
    (patch: Partial<ForecastFilters>) => setFilters((prev) => ({ ...prev, ...patch })),
    []
  );

  const { meta } = useForecastMeta();
  const { params: recParams } = useRecommendationParams();
  const groups = useMemo(() => [...new Set(meta.products.map(productGroup))], [meta.products]);
  const productQuery = useForecastProducts(filters);
  const productRows = useMemo(() => productQuery.data ?? [], [productQuery.data]);

  const rows = useMemo(() => {
    const filtered = productRows.filter((row) => {
      const excluded = isExcludedProduct(row.product.code);
      return (
        (group === 'all' || productGroup(row.product) === group) &&
        (status === 'all' || (status === 'dikecualikan') === excluded)
      );
    });
    return sortRows(filtered, (row) => getSortValue(row, orderBy), table.order);
  }, [productRows, group, status, table.order, orderBy]);

  const stats = useMemo(
    () => ({
      active: rows.filter((row) => row.kirim > 0).length,
      estSold: rows.reduce((acc, row) => acc + row.estSold, 0),
      maxEstSold: Math.max(0, ...rows.map((row) => row.estSold)),
      excluded: rows.filter((row) => isExcludedProduct(row.product.code)).length,
      top: [...rows].sort((a, b) => b.estSold - a.estSold)[0],
    }),
    [rows]
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <ForecastPageHeader
        title="Data Produk"
        description="21 produk dari master MRoti dengan harga per pcs, volume, dan status rekomendasi otomatis."
      />

      <ForecastSimulationAlert />

      <ForecastFilterBar
        filters={filters}
        onChange={handleChange}
        showStore={false}
        showProduct={false}
      >
        <TextField
          select
          size="small"
          label="Kelompok"
          value={group}
          onChange={(event) => setGroup(event.target.value)}
          sx={FIELD_SX}
        >
          <MenuItem value="all">Semua kelompok</MenuItem>
          {groups.map((value) => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          select
          size="small"
          label="Status rekomendasi"
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
          sx={FIELD_SX}
        >
          <MenuItem value="all">Semua status</MenuItem>
          <MenuItem value="otomatis">Otomatis</MenuItem>
          <MenuItem value="dikecualikan">Dikecualikan</MenuItem>
        </TextField>
      </ForecastFilterBar>

      <ForecastDataState
        error={productQuery.error}
        fetching={productQuery.fetching}
        onRetry={productQuery.refetch}
      />

      <ForecastStatStrip
        items={[
          {
            label: 'Produk terkirim',
            value: `${fNumber(stats.active)} / ${fNumber(rows.length)}`,
            caption: 'Produk dengan kiriman di rentang ini',
            icon: 'carbon:list-boxes',
            color: theme.vars.palette.primary.main,
          },
          {
            label: 'Estimasi terjual',
            value: `${fNumber(stats.estSold)} pcs`,
            caption: 'Total semua produk (estimasi)',
            icon: 'carbon:chart-average',
            color: SERIES.estSold.color,
          },
          {
            label: 'Paling laku',
            value: stats.top?.product.code ?? '–',
            caption: stats.top ? `${fNumber(stats.top.estSold)} pcs estimasi terjual` : undefined,
            icon: 'carbon:trophy',
            color: theme.vars.palette.warning.main,
          },
          {
            label: 'Dikecualikan',
            value: fNumber(stats.excluded),
            caption: 'Volume terlalu kecil',
            icon: 'solar:info-circle-outline',
            color: theme.vars.palette.grey[500],
          },
        ]}
      />

      <Card sx={{ mb: 3 }}>
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
              {rows.map((row) => {
                const excluded = isExcludedProduct(row.product.code);

                return (
                  <TableRow key={row.product.code} hover>
                    <TableCell>{row.product.nir}</TableCell>
                    <TableCell>
                      <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'center' }}>
                        <Box
                          sx={{
                            px: 1,
                            height: 36,
                            minWidth: 56,
                            flexShrink: 0,
                            display: 'flex',
                            borderRadius: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                            typography: 'subtitle2',
                            color: excluded ? 'text.disabled' : 'primary.dark',
                            bgcolor: excluded ? 'action.hover' : 'background.neutral',
                          }}
                        >
                          {row.product.code}
                        </Box>
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}
                        >
                          {productGroup(row.product)}
                          {row.product.nama !== row.product.code && (
                            <Box component="span" sx={{ display: 'block' }}>
                              master: &quot;{row.product.nama}&quot;
                            </Box>
                          )}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">{fCurrency(row.product.hargaBeli)}</TableCell>
                    <TableCell align="right">{fCurrency(row.product.hargaJual)}</TableCell>
                    <TableCell align="right">{fPercent(margin(row))}</TableCell>
                    <TableCell align="right">{fNumber(row.stores)}</TableCell>
                    <TableCell align="right">{fNumber(row.kirim)}</TableCell>
                    <TableCell align="right">
                      <InlineBarCell value={row.estSold} max={stats.maxEstSold} series="estSold" />
                    </TableCell>
                    <TableCell align="right">
                      <ReturnRateCell
                        value={row.returnRate}
                        threshold={recParams.returnThreshold}
                      />
                    </TableCell>
                    <TableCell>
                      <Label
                        variant="soft"
                        color={excluded ? 'default' : 'success'}
                        startIcon={
                          <Iconify
                            icon={
                              excluded ? 'solar:info-circle-outline' : 'solar:check-circle-bold'
                            }
                          />
                        }
                      >
                        {excluded ? 'Dikecualikan' : 'Otomatis'}
                      </Label>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!rows.length && <TableEmptyRow colSpan={HEAD.length} />}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      <Alert severity="info" variant="outlined">
        Kepanjangan kode produk belum diketahui, jadi kode kolom ditampilkan apa adanya. Harga
        diasumsikan Rupiah per pcs dan tetap selama periode. Produk volume sangat kecil (mpkt, np,
        tf, jasuke, sisir2) dikecualikan dari rekomendasi otomatis sesuai studi kelayakan §2.2.
      </Alert>
    </Box>
  );
}
