'use client';

import type { HeadCell } from './forecast-table';
import type { Confidence, MasterStore, Recommendation } from 'src/types/forecast';

import { useMemo, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { fNumber, fPercent } from 'src/utils/format-number';

import { Label } from 'src/components/label';

import { useForecastMeta } from './use-forecast-data';
import { RecommendationDelta } from './recommendation-delta';
import { fDate, SIGNAL_LABEL, CONFIDENCE_LABEL } from './forecast-utils';
import {
  sortRows,
  TableEmptyRow,
  useTableState,
  ForecastTableHead,
  ForecastTablePagination,
} from './forecast-table';

// ----------------------------------------------------------------------

type ColumnId =
  | 'store'
  | 'product'
  | 'lastKirim'
  | 'estSold'
  | 'lastBs'
  | 'recommended'
  | 'confidence'
  | 'nextVisit';

const HEAD: HeadCell<ColumnId>[] = [
  { id: 'store', label: 'Toko', minWidth: 200 },
  { id: 'product', label: 'Produk', minWidth: 90 },
  { id: 'lastKirim', label: 'Kiriman terakhir', align: 'right', minWidth: 130 },
  { id: 'estSold', label: 'Est. terjual', align: 'right', minWidth: 110 },
  { id: 'lastBs', label: 'Retur (BS)', align: 'right', minWidth: 110 },
  { id: 'recommended', label: 'Rekomendasi', align: 'right', minWidth: 150 },
  { id: 'confidence', label: 'Kepercayaan', minWidth: 190 },
  { id: 'nextVisit', label: 'Kunjungan berikutnya', minWidth: 150 },
];

const CONFIDENCE_ORDER: Record<Confidence, number> = { tinggi: 3, sedang: 2, rendah: 1 };

const CONFIDENCE_COLOR = { tinggi: 'success', sedang: 'info', rendah: 'default' } as const;

const getSortValue = (row: Recommendation, id: ColumnId, storeMap: Map<string, MasterStore>) => {
  switch (id) {
    case 'store':
      return storeMap.get(row.nit)?.nama ?? row.nit;
    case 'confidence':
      return CONFIDENCE_ORDER[row.confidence];
    case 'lastKirim':
      return row.lastKirim;
    default:
      return row[id];
  }
};

type Props = {
  rows: Recommendation[];
  /** Berubah saat filter berubah → kembali ke halaman 1. */
  resetKey: string;
};

export function RecommendationTable({ rows, resetKey }: Props) {
  const { storeMap } = useForecastMeta();
  const table = useTableState<ColumnId>('store', 'asc');
  const { resetPage } = table;

  useEffect(() => {
    resetPage();
  }, [resetKey, resetPage]);

  const sorted = useMemo(
    () => sortRows(rows, (row) => getSortValue(row, table.orderBy, storeMap), table.order),
    [rows, table.order, table.orderBy, storeMap]
  );

  const pageRows = sorted.slice(
    table.page * table.rowsPerPage,
    table.page * table.rowsPerPage + table.rowsPerPage
  );

  return (
    <Card>
      <TableContainer>
        <Table size="medium" sx={{ minWidth: 1100 }}>
          <ForecastTableHead
            cells={HEAD}
            order={table.order}
            orderBy={table.orderBy}
            onSort={table.onSort}
          />
          <TableBody>
            {pageRows.map((row) => {
              const store = storeMap.get(row.nit);

              return (
                <TableRow key={`${row.nit}-${row.product}`} hover>
                  <TableCell>
                    <Typography variant="subtitle2" noWrap sx={{ maxWidth: 220 }}>
                      {store?.nama ?? 'Di luar master'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {row.nit} · {store?.kec ? `Kec. ${store.kec}` : 'kec tidak diketahui'}
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Typography variant="subtitle2">{row.product}</Typography>
                  </TableCell>

                  <TableCell align="right">
                    <Typography variant="body2">{fNumber(row.lastKirim)} pcs</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {fDate(row.lastTgl)}
                    </Typography>
                  </TableCell>

                  <TableCell align="right">
                    <Typography variant="body2">
                      {row.estSold === null ? '–' : `${fNumber(row.estSold, 1)} pcs`}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {row.observations} observasi
                    </Typography>
                  </TableCell>

                  <TableCell align="right">
                    <Typography variant="body2">{fNumber(row.lastBs)} pcs</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      rasio {fPercent(row.returnRate)}
                    </Typography>
                  </TableCell>

                  <TableCell align="right">
                    {row.excluded ? (
                      <Label variant="soft" color="default">
                        Dikecualikan
                      </Label>
                    ) : (
                      <RecommendationDelta value={row.recommended} delta={row.delta} />
                    )}
                    {!!row.signals.length && (
                      <Box
                        sx={{
                          mt: 0.5,
                          gap: 0.5,
                          display: 'flex',
                          flexWrap: 'wrap',
                          justifyContent: 'flex-end',
                        }}
                      >
                        {row.signals
                          .filter((signal) => signal !== 'fallback')
                          .map((signal) => (
                            <Label
                              key={signal}
                              variant="soft"
                              color={signal === 'pencilan' ? 'error' : 'default'}
                              sx={{ height: 20, fontSize: 11 }}
                            >
                              {SIGNAL_LABEL[signal]}
                            </Label>
                          ))}
                      </Box>
                    )}
                  </TableCell>

                  <TableCell>
                    <Tooltip title={row.basis} placement="top-start">
                      <Box>
                        <Label variant="soft" color={CONFIDENCE_COLOR[row.confidence]}>
                          {CONFIDENCE_LABEL[row.confidence]}
                        </Label>
                        <Typography
                          variant="caption"
                          sx={{ mt: 0.5, display: 'block', color: 'text.secondary' }}
                        >
                          {row.basis}
                        </Typography>
                      </Box>
                    </Tooltip>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2">{fDate(row.nextVisit)}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      perkiraan
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })}

            {!pageRows.length && <TableEmptyRow colSpan={HEAD.length} />}
          </TableBody>
        </Table>
      </TableContainer>

      <ForecastTablePagination
        count={sorted.length}
        page={table.page}
        rowsPerPage={table.rowsPerPage}
        onPageChange={table.setPage}
        onRowsPerPageChange={table.setRowsPerPage}
      />
    </Card>
  );
}
