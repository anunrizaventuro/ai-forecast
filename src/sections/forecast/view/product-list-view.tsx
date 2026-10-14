'use client';

import type { HeadCell } from '../forecast-table';
import type { ProductSummary, ForecastFilters } from '../forecast-utils';

import { useMemo, useState, useCallback } from 'react';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { fNumber, fPercent, fCurrency } from 'src/utils/format-number';

import { Label } from 'src/components/label';

import { ForecastFilterBar } from '../forecast-filter-bar';
import { ForecastPageHeader } from '../forecast-page-header';
import { ForecastSimulationAlert } from '../forecast-simulation-alert';
import { sortRows, TableEmptyRow, useTableState, ForecastTableHead } from '../forecast-table';
import {
  products,
  filterCells,
  productGroup,
  forecastCells,
  groupByProduct,
  DEFAULT_FILTERS,
  isExcludedProduct,
} from '../forecast-utils';

// ----------------------------------------------------------------------
// Master produk (kode, nama, harga) sama dengan tabel MRoti di database
// sumber. Kolom volume berasal dari data simulasi.

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

const HEAD: HeadCell<ColumnId>[] = [
  { id: 'nir', label: 'NIR' },
  { id: 'code', label: 'Produk', minWidth: 160 },
  { id: 'hargaBeli', label: 'Harga beli', align: 'right' },
  { id: 'hargaJual', label: 'Harga jual', align: 'right' },
  { id: 'margin', label: 'Margin', align: 'right' },
  { id: 'stores', label: 'Toko', align: 'right' },
  { id: 'kirim', label: 'Kiriman (pcs)', align: 'right', minWidth: 120 },
  { id: 'estSold', label: 'Est. terjual (pcs)', align: 'right', minWidth: 140 },
  { id: 'returnRate', label: 'Rasio retur', align: 'right', minWidth: 110 },
  { id: 'status', label: 'Rekomendasi', minWidth: 150 },
];

const GROUPS = [...new Set(products.map(productGroup))];

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

  const table = useTableState<ColumnId>('nir', 'asc');

  const handleChange = useCallback(
    (patch: Partial<ForecastFilters>) => setFilters((prev) => ({ ...prev, ...patch })),
    []
  );

  const productRows = useMemo(() => groupByProduct(filterCells(forecastCells, filters)), [filters]);

  const rows = useMemo(() => {
    const filtered = productRows.filter((row) => {
      const excluded = isExcludedProduct(row.product.code);
      return (
        (group === 'all' || productGroup(row.product) === group) &&
        (status === 'all' || (status === 'dikecualikan') === excluded)
      );
    });
    return sortRows(filtered, (row) => getSortValue(row, table.orderBy), table.order);
  }, [productRows, group, status, table.order, table.orderBy]);

  return (
    <>
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
          {GROUPS.map((value) => (
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

      <Card sx={{ mb: 3 }}>
        <TableContainer>
          <Table sx={{ minWidth: 1100 }}>
            <ForecastTableHead
              cells={HEAD}
              order={table.order}
              orderBy={table.orderBy}
              onSort={table.onSort}
            />
            <TableBody>
              {rows.map((row) => {
                const excluded = isExcludedProduct(row.product.code);

                return (
                  <TableRow key={row.product.code} hover>
                    <TableCell>{row.product.nir}</TableCell>
                    <TableCell>
                      <Typography variant="subtitle2">{row.product.code}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {productGroup(row.product)}
                        {row.product.nama !== row.product.code &&
                          ` · nama master "${row.product.nama}"`}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{fCurrency(row.product.hargaBeli)}</TableCell>
                    <TableCell align="right">{fCurrency(row.product.hargaJual)}</TableCell>
                    <TableCell align="right">{fPercent(margin(row))}</TableCell>
                    <TableCell align="right">{fNumber(row.stores)}</TableCell>
                    <TableCell align="right">{fNumber(row.kirim)}</TableCell>
                    <TableCell align="right">{fNumber(row.estSold)}</TableCell>
                    <TableCell align="right">{fPercent(row.returnRate)}</TableCell>
                    <TableCell>
                      <Label variant="soft" color={excluded ? 'default' : 'success'}>
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
    </>
  );
}
