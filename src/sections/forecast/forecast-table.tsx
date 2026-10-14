'use client';

import { useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import TableRow from '@mui/material/TableRow';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import TableSortLabel from '@mui/material/TableSortLabel';
import TablePagination from '@mui/material/TablePagination';

// ----------------------------------------------------------------------
// Potongan tabel bersama: head dengan sort, state sort + paginasi, paginasi
// berbahasa Indonesia, dan baris kosong.

export type SortOrder = 'asc' | 'desc';

export type HeadCell<K extends string> = {
  id: K;
  label: string;
  align?: 'left' | 'right' | 'center';
  minWidth?: number;
  sortable?: boolean;
};

export function useTableState<K extends string>(
  defaultOrderBy: K,
  defaultOrder: SortOrder = 'desc',
  defaultRowsPerPage = 10
) {
  const [orderBy, setOrderBy] = useState<K>(defaultOrderBy);
  const [order, setOrder] = useState<SortOrder>(defaultOrder);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  const onSort = useCallback(
    (id: K) => {
      setOrder(orderBy === id && order === 'desc' ? 'asc' : 'desc');
      setOrderBy(id);
      setPage(0);
    },
    [order, orderBy]
  );

  const resetPage = useCallback(() => setPage(0), []);

  return {
    order,
    orderBy,
    onSort,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    resetPage,
  };
}

/** Sort stabil; null/undefined selalu di akhir. */
export function sortRows<T>(
  rows: T[],
  getValue: (row: T) => string | number | null | undefined,
  order: SortOrder
) {
  const direction = order === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    const va = getValue(a);
    const vb = getValue(b);
    if (va === vb) return 0;
    if (va === null || va === undefined) return 1;
    if (vb === null || vb === undefined) return -1;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * direction;
    return String(va).localeCompare(String(vb)) * direction;
  });
}

// ----------------------------------------------------------------------

type HeadProps<K extends string> = {
  cells: HeadCell<K>[];
  order: SortOrder;
  orderBy: K;
  onSort: (id: K) => void;
};

export function ForecastTableHead<K extends string>({
  cells,
  order,
  orderBy,
  onSort,
}: HeadProps<K>) {
  return (
    <TableHead>
      <TableRow>
        {cells.map((cell) => (
          <TableCell
            key={cell.id}
            align={cell.align ?? 'left'}
            sortDirection={orderBy === cell.id ? order : false}
            sx={{ minWidth: cell.minWidth, whiteSpace: 'nowrap' }}
          >
            {cell.sortable === false ? (
              cell.label
            ) : (
              <TableSortLabel
                active={orderBy === cell.id}
                direction={orderBy === cell.id ? order : 'desc'}
                onClick={() => onSort(cell.id)}
              >
                {cell.label}
              </TableSortLabel>
            )}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

// ----------------------------------------------------------------------

type PaginationProps = {
  count: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
};

export function ForecastTablePagination({
  count,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
}: PaginationProps) {
  return (
    <TablePagination
      component="div"
      count={count}
      page={Math.min(page, Math.max(0, Math.ceil(count / rowsPerPage) - 1))}
      rowsPerPage={rowsPerPage}
      rowsPerPageOptions={[10, 25, 50]}
      onPageChange={(_, next) => onPageChange(next)}
      onRowsPerPageChange={(event) => {
        onRowsPerPageChange(parseInt(event.target.value, 10));
        onPageChange(0);
      }}
      labelRowsPerPage="Baris per halaman"
      labelDisplayedRows={({ from, to, count: total }) => `${from}–${to} dari ${total}`}
      getItemAriaLabel={(type) =>
        ({ first: 'Halaman pertama', last: 'Halaman terakhir', next: 'Berikutnya' })[
          type as 'first' | 'last' | 'next'
        ] ?? 'Sebelumnya'
      }
      sx={(theme) => ({ borderTop: `dashed 1px ${theme.vars.palette.divider}` })}
    />
  );
}

// ----------------------------------------------------------------------

export function TableEmptyRow({ colSpan, text }: { colSpan: number; text?: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan}>
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography variant="subtitle1">Tidak ada data</Typography>
          <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
            {text ?? 'Coba ubah atau reset filter.'}
          </Typography>
        </Box>
      </TableCell>
    </TableRow>
  );
}
