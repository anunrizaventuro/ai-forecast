import type { TablePaginationCustomProps } from 'src/shared/ui/table';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { TableNoData, TablePaginationCustom } from 'src/shared/ui/table';

// ----------------------------------------------------------------------
// Pelengkap toolkit tabel skeleton (src/shared/ui/table) untuk tabel forecast:
// sort client-side, paginasi berbahasa Indonesia, baris kosong.

export type SortOrder = 'asc' | 'desc';

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

type PaginationProps = Pick<
  TablePaginationCustomProps,
  'count' | 'page' | 'rowsPerPage' | 'onPageChange' | 'onRowsPerPageChange'
>;

export function ForecastTablePagination({ count, page, rowsPerPage, ...other }: PaginationProps) {
  return (
    <TablePaginationCustom
      count={count}
      // Jaga halaman tetap valid saat jumlah baris menyusut karena filter.
      page={Math.min(page, Math.max(0, Math.ceil(count / rowsPerPage) - 1))}
      rowsPerPage={rowsPerPage}
      rowsPerPageOptions={[10, 25, 50]}
      labelRowsPerPage="Baris per halaman"
      labelDisplayedRows={({ from, to, count: total }) => `${from}–${to} dari ${total}`}
      getItemAriaLabel={(type) =>
        ({ first: 'Halaman pertama', last: 'Halaman terakhir', next: 'Berikutnya' })[
          type as 'first' | 'last' | 'next'
        ] ?? 'Sebelumnya'
      }
      sx={(theme) => ({ borderTop: `dashed 1px ${theme.vars.palette.divider}` })}
      {...other}
    />
  );
}

// ----------------------------------------------------------------------

export function TableEmptyRow({ colSpan, text }: { colSpan: number; text?: string }) {
  return (
    <TableNoData notFound colSpan={colSpan}>
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="subtitle1">Tidak ada data</Typography>
        <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
          {text ?? 'Coba ubah atau reset filter.'}
        </Typography>
      </Box>
    </TableNoData>
  );
}
