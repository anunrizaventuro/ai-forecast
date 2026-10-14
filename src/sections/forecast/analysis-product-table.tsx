'use client';

import type { HeadCell } from './forecast-table';
import type { ProductSummary } from './forecast-utils';

import { useMemo } from 'react';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { fNumber, fPercent, fCurrency } from 'src/utils/format-number';

import { productGroup } from './forecast-utils';
import { sortRows, TableEmptyRow, useTableState, ForecastTableHead } from './forecast-table';

// ----------------------------------------------------------------------

type ColumnId =
  | 'product'
  | 'stores'
  | 'kirim'
  | 'estSold'
  | 'bs'
  | 'returnRate'
  | 'sellThrough'
  | 'salesValue';

const HEAD: HeadCell<ColumnId>[] = [
  { id: 'product', label: 'Produk', minWidth: 140 },
  { id: 'stores', label: 'Toko', align: 'right' },
  { id: 'kirim', label: 'Kiriman (pcs)', align: 'right' },
  { id: 'estSold', label: 'Est. terjual (pcs)', align: 'right' },
  { id: 'bs', label: 'Retur BS (pcs)', align: 'right' },
  { id: 'returnRate', label: 'Rasio retur', align: 'right' },
  { id: 'sellThrough', label: 'Sell-through', align: 'right' },
  { id: 'salesValue', label: 'Nilai est. terjual', align: 'right', minWidth: 150 },
];

type Props = {
  rows: ProductSummary[];
};

export function AnalysisProductTable({ rows }: Props) {
  const table = useTableState<ColumnId>('estSold');

  const sorted = useMemo(
    () =>
      sortRows(
        rows.filter((row) => row.kirim > 0 || row.bs > 0),
        (row) => (table.orderBy === 'product' ? row.product.nir : row[table.orderBy]),
        table.order
      ),
    [rows, table.order, table.orderBy]
  );

  return (
    <Card>
      <CardHeader
        title="Kinerja per produk"
        subheader="Rasio retur dan sell-through dihitung terhadap kiriman kunjungan sebelumnya (rumus B)"
      />
      <TableContainer sx={{ mt: 2 }}>
        <Table sx={{ minWidth: 900 }}>
          <ForecastTableHead
            cells={HEAD}
            order={table.order}
            orderBy={table.orderBy}
            onSort={table.onSort}
          />
          <TableBody>
            {sorted.map((row) => (
              <TableRow key={row.product.code} hover>
                <TableCell>
                  <Typography variant="subtitle2">{row.product.code}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {productGroup(row.product)}
                  </Typography>
                </TableCell>
                <TableCell align="right">{fNumber(row.stores)}</TableCell>
                <TableCell align="right">{fNumber(row.kirim)}</TableCell>
                <TableCell align="right">{fNumber(row.estSold)}</TableCell>
                <TableCell align="right">{fNumber(row.bs)}</TableCell>
                <TableCell align="right">{fPercent(row.returnRate)}</TableCell>
                <TableCell align="right">{fPercent(row.sellThrough)}</TableCell>
                <TableCell align="right">{fCurrency(row.salesValue)}</TableCell>
              </TableRow>
            ))}
            {!sorted.length && <TableEmptyRow colSpan={HEAD.length} />}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
