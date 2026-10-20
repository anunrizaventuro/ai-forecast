import type { ProductCode } from 'src/module/forecast/shared/types';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import InputBase from '@mui/material/InputBase';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { fNumber } from 'src/module/forecast/shared/utils';

// ----------------------------------------------------------------------
// Tabel SPK seperti file klien: baris = toko (urut kunjungan), kolom = roti.
// Sel draf bisa diketik; warna menandai kosong (wajib diisi) dan angka yang
// berbeda dari saran sistem.

export type SpkCellState = {
  /** Nilai input saat ini ('' = kosong). */
  value: string;
  /** Saran sistem; undefined = tidak ada baris SPK untuk sel ini. */
  suggested: number | null | undefined;
};

export const cellKey = (nit: string, product: ProductCode) => `${nit}|${product}`;

type Props = {
  stores: string[];
  products: ProductCode[];
  storeName: (nit: string) => string;
  cell: (nit: string, product: ProductCode) => SpkCellState;
  editable: boolean;
  selected: string | null;
  onSelect: (key: string) => void;
  onChange: (nit: string, product: ProductCode, value: string) => void;
};

const toNumber = (value: string) => (value === '' ? 0 : Number(value) || 0);

export function SpkGrid({
  stores,
  products,
  storeName,
  cell,
  editable,
  selected,
  onSelect,
  onChange,
}: Props) {
  const columnTotal = (product: ProductCode) =>
    stores.reduce((total, nit) => total + toNumber(cell(nit, product).value), 0);
  const rowTotal = (nit: string) =>
    products.reduce((total, product) => total + toNumber(cell(nit, product).value), 0);
  const grandTotal = products.reduce((total, product) => total + columnTotal(product), 0);

  return (
    <Card>
      <TableContainer sx={{ maxHeight: '70vh' }}>
        <Table size="small" stickyHeader sx={{ minWidth: 320 + products.length * 64 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 40 }}>#</TableCell>
              <TableCell sx={{ minWidth: 200, left: 0, zIndex: 3 }}>Toko</TableCell>
              {products.map((product) => (
                <TableCell key={product} align="right" sx={{ px: 1, minWidth: 64 }}>
                  {product}
                </TableCell>
              ))}
              <TableCell align="right">Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stores.map((nit, index) => (
              <TableRow key={nit} hover>
                <TableCell sx={{ color: 'text.secondary' }}>{index + 1}</TableCell>
                <TableCell>
                  <Typography variant="body2" noWrap>
                    {storeName(nit)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {nit}
                  </Typography>
                </TableCell>
                {products.map((product) => {
                  const key = cellKey(nit, product);
                  const state = cell(nit, product);
                  const hasLine = state.suggested !== undefined;
                  const empty = hasLine && state.value === '';
                  const changed =
                    state.value !== '' &&
                    (state.suggested === null ||
                      state.suggested === undefined ||
                      Number(state.value) !== state.suggested);
                  const tooltip = empty
                    ? 'Kosong — wajib diisi sebelum finalisasi'
                    : changed
                      ? state.suggested === null || state.suggested === undefined
                        ? 'Diisi manual (tanpa saran sistem)'
                        : `Diubah dari saran ${state.suggested}`
                      : hasLine
                        ? 'Sesuai saran sistem'
                        : '';
                  return (
                    <TableCell
                      key={product}
                      align="right"
                      onClick={() => onSelect(key)}
                      sx={(theme) => ({
                        px: 0.5,
                        cursor: 'pointer',
                        ...(empty && {
                          bgcolor: varAlpha(theme.vars.palette.warning.mainChannel, 0.16),
                        }),
                        ...(changed && {
                          bgcolor: varAlpha(theme.vars.palette.info.mainChannel, 0.12),
                        }),
                        ...(selected === key && {
                          outline: `2px solid ${theme.vars.palette.primary.main}`,
                          outlineOffset: -2,
                        }),
                      })}
                    >
                      <Tooltip title={tooltip} disableInteractive>
                        <Box>
                          {editable ? (
                            <InputBase
                              value={state.value}
                              placeholder={hasLine ? '?' : '·'}
                              onFocus={() => onSelect(key)}
                              onChange={(event) =>
                                onChange(
                                  nit,
                                  product,
                                  event.target.value.replace(/\D/g, '').slice(0, 4)
                                )
                              }
                              inputProps={{
                                inputMode: 'numeric',
                                'aria-label': `${product} toko ${nit}`,
                                style: { textAlign: 'right', padding: '2px 4px' },
                              }}
                              sx={{ width: 56, typography: 'body2' }}
                            />
                          ) : (
                            <Typography
                              variant="body2"
                              sx={{
                                color:
                                  state.value === '' || state.value === '0'
                                    ? 'text.disabled'
                                    : 'text.primary',
                              }}
                            >
                              {state.value === '' ? '·' : state.value}
                            </Typography>
                          )}
                        </Box>
                      </Tooltip>
                    </TableCell>
                  );
                })}
                <TableCell align="right" sx={{ fontWeight: 'fontWeightSemiBold' }}>
                  {fNumber(rowTotal(nit))}
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell />
              <TableCell sx={{ fontWeight: 'fontWeightSemiBold' }}>Total</TableCell>
              {products.map((product) => (
                <TableCell
                  key={product}
                  align="right"
                  sx={{ px: 1, fontWeight: 'fontWeightSemiBold' }}
                >
                  {fNumber(columnTotal(product))}
                </TableCell>
              ))}
              <TableCell align="right" sx={{ fontWeight: 'fontWeightBold' }}>
                {fNumber(grandTotal)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
