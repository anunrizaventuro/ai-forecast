'use client';

import type { Recommendation } from 'src/types/forecast';

import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableRow from '@mui/material/TableRow';
import Accordion from '@mui/material/Accordion';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import { fNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

import { useForecastMeta } from './use-forecast-data';
import { summarizeRecommendations } from './forecast-utils';
import { RecommendationDelta } from './recommendation-delta';
import {
  ReturnCell,
  EstSoldCell,
  LastKirimCell,
  NextVisitCell,
  ConfidenceCell,
  RecommendedCell,
} from './recommendation-cells';

// ----------------------------------------------------------------------
// Satu grup rekomendasi (toko atau produk) sebagai accordion: ringkasan total
// di header, rincian baris di dalam. `rowLabel` menentukan kolom pertama:
// 'product' untuk grup per toko, 'store' untuk grup per produk.

type Props = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Info tambahan di header (mis. kunjungan berikutnya). */
  meta?: React.ReactNode;
  rows: Recommendation[];
  rowLabel: 'product' | 'store';
};

export function RecommendationGroup({ title, subtitle, meta, rows, rowLabel }: Props) {
  const { storeMap, productMap } = useForecastMeta();
  const summary = summarizeRecommendations(rows);
  const showNextVisit = rowLabel === 'store';

  const head = [
    rowLabel === 'product' ? 'Produk' : 'Toko',
    'Kiriman terakhir',
    'Est. terjual',
    'Retur (BS)',
    'Rekomendasi',
    'Kepercayaan',
    ...(showNextVisit ? ['Kunjungan berikutnya'] : []),
  ];

  const counts = [
    summary.increase && `${summary.increase} naik`,
    summary.decrease && `${summary.decrease} turun`,
    summary.same && `${summary.same} tetap`,
    summary.excluded && `${summary.excluded} dikecualikan`,
  ].filter(Boolean);

  return (
    <Accordion
      disableGutters
      square
      slotProps={{ transition: { unmountOnExit: true } }}
      sx={(theme) => ({
        boxShadow: 'none',
        bgcolor: 'transparent',
        '&::before': { display: 'none' },
        '&:not(:last-of-type)': { borderBottom: `dashed 1px ${theme.vars.palette.divider}` },
      })}
    >
      <AccordionSummary
        expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}
        sx={{ px: { xs: 2, md: 3 } }}
      >
        <Box
          sx={{
            py: 0.5,
            pr: 2,
            gap: 2,
            width: 1,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <Box sx={{ flex: '1 1 240px', minWidth: 0 }}>
            <Typography variant="subtitle2" noWrap>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
                {subtitle}
              </Typography>
            )}
          </Box>

          <Box sx={{ flex: '1 1 180px' }}>
            <Typography variant="body2">
              {fNumber(rows.length)} {rowLabel === 'product' ? 'produk' : 'toko'}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {counts.join(' · ') || '–'}
            </Typography>
          </Box>

          {meta && <Box sx={{ flex: '0 1 140px' }}>{meta}</Box>}

          <Box sx={{ flex: '0 0 auto', minWidth: 120, textAlign: 'right' }}>
            <RecommendationDelta
              value={summary.totalRecommended}
              delta={summary.totalRecommended - summary.totalLast}
            />
            <Typography variant="caption" component="div" sx={{ color: 'text.secondary' }}>
              pcs · terakhir {fNumber(summary.totalLast)}
            </Typography>
          </Box>
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ p: 0, pb: 1 }}>
        <TableContainer>
          <Table size="small" sx={{ minWidth: showNextVisit ? 1000 : 860 }}>
            <TableHead>
              <TableRow>
                {head.map((label, index) => (
                  <TableCell
                    key={label}
                    align={index > 0 && index < 5 ? 'right' : 'left'}
                    sx={{ whiteSpace: 'nowrap', ...(index === 0 && { pl: { xs: 2, md: 3 } }) }}
                  >
                    {label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => {
                const store = storeMap.get(row.nit);
                const product = productMap.get(row.product);

                return (
                  <TableRow key={`${row.nit}-${row.product}`} hover>
                    <TableCell sx={{ pl: { xs: 2, md: 3 } }}>
                      {rowLabel === 'product' ? (
                        <>
                          <Typography variant="subtitle2">{row.product}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {product?.nama ?? '–'}
                          </Typography>
                        </>
                      ) : (
                        <>
                          <Typography variant="subtitle2" noWrap sx={{ maxWidth: 220 }}>
                            {store?.nama ?? 'Di luar master'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {row.nit} · {store?.kec ? `Kec. ${store.kec}` : 'kec tidak diketahui'}
                          </Typography>
                        </>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <LastKirimCell row={row} />
                    </TableCell>
                    <TableCell align="right">
                      <EstSoldCell row={row} />
                    </TableCell>
                    <TableCell align="right">
                      <ReturnCell row={row} />
                    </TableCell>
                    <TableCell align="right">
                      <RecommendedCell row={row} />
                    </TableCell>
                    <TableCell>
                      <ConfidenceCell row={row} />
                    </TableCell>
                    {showNextVisit && (
                      <TableCell>
                        <NextVisitCell row={row} />
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </AccordionDetails>
    </Accordion>
  );
}
