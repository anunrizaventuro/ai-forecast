'use client';

import type { CellSummary, SeriesPoint } from './forecast-utils';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { fNumber, fPercent, fShortCurrency } from 'src/utils/format-number';

import { SERIES } from './forecast-chart-colors';
import { ForecastKpiCard } from './forecast-kpi-card';

// ----------------------------------------------------------------------

type Props = {
  summary: CellSummary;
  /** Titik tren rentang terpilih → grafik mini di tiap kartu. */
  points?: SeriesPoint[];
  /** Sembunyikan kartu "Nilai estimasi terjual" (sisa kartu melebar mengisi baris). */
  hideSalesValue?: boolean;
};

export function ForecastKpiGrid({ summary, points, hideSalesValue }: Props) {
  const theme = useTheme();
  const trend = (key: 'kirim' | 'estSold' | 'bs') => points?.map((point) => point[key]);
  const size = { xs: 12, sm: 6, lg: hideSalesValue ? 4 : 3 };

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid size={size}>
        <ForecastKpiCard
          title="Total kiriman"
          value={fNumber(summary.kirim)}
          unit="pcs"
          caption={`${fNumber(summary.visits)} kunjungan ke ${fNumber(summary.stores)} toko`}
          icon="carbon:delivery"
          accent={SERIES.kirim.color}
          trend={trend('kirim')}
        />
      </Grid>
      <Grid size={size}>
        <ForecastKpiCard
          estimate
          title="Estimasi terjual"
          value={fNumber(summary.estSold)}
          unit="pcs"
          caption={`${fPercent(summary.sellThrough)} dari kiriman sebelumnya laku`}
          icon="carbon:chart-average"
          accent={SERIES.estSold.color}
          trend={trend('estSold')}
        />
      </Grid>
      <Grid size={size}>
        <ForecastKpiCard
          title="Retur (BS)"
          value={fNumber(summary.bs)}
          unit="pcs"
          caption={`Rasio retur ${fPercent(summary.returnRate)} dari kiriman sebelumnya`}
          icon="carbon:arrow-down"
          accent={SERIES.bs.color}
          trend={trend('bs')}
        />
      </Grid>
      {!hideSalesValue && (
        <Grid size={size}>
          <ForecastKpiCard
            estimate
            title="Nilai estimasi terjual"
            value={fShortCurrency(summary.salesValue)}
            caption="Harga jual MRoti × estimasi terjual (harga diasumsikan tetap)"
            icon="solar:banknote-2-outline"
            accent={theme.vars.palette.secondary.main}
            footer={
              <Box
                sx={(t) => ({
                  pt: 1.5,
                  gap: 0.75,
                  display: 'flex',
                  flexDirection: 'column',
                  borderTop: `1px dashed ${t.vars.palette.divider}`,
                })}
              >
                {[
                  ['Rata-rata per kunjungan', summary.visits],
                  ['Rata-rata per toko', summary.stores],
                ].map(([label, count]) => (
                  <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {label}
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 'fontWeightSemiBold' }}>
                      {count ? fShortCurrency(summary.salesValue / Number(count)) : '–'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            }
          />
        </Grid>
      )}
    </Grid>
  );
}
