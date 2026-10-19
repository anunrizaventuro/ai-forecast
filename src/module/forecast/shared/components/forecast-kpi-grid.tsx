import type { CellSummary, SeriesPoint } from 'src/module/forecast/shared/types';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';

import { Label } from 'src/shared/ui/label';
import { KpiCard } from 'src/shared/ui/dashboard-card';
import { fNumber, fPercent, fShortCurrency } from 'src/module/forecast/shared/utils';

import { useSeriesColors } from './forecast-chart-colors';

// ----------------------------------------------------------------------

const ESTIMATE = (
  <Label color="warning" variant="soft" sx={{ height: 20, fontSize: 11 }}>
    Estimasi
  </Label>
);

type Props = {
  summary: CellSummary;
  /** Titik tren rentang terpilih → grafik mini di tiap kartu. */
  points?: SeriesPoint[];
  /** Sembunyikan kartu "Nilai estimasi terjual" (sisa kartu melebar mengisi baris). */
  hideSalesValue?: boolean;
};

export function ForecastKpiGrid({ summary, points, hideSalesValue }: Props) {
  const colors = useSeriesColors();
  const sparks = useMemo(
    () => ({
      kirim: points?.map((point) => point.kirim),
      estSold: points?.map((point) => point.estSold),
      bs: points?.map((point) => point.bs),
    }),
    [points]
  );
  const size = { xs: 12, sm: 6, lg: hideSalesValue ? 4 : 3 };

  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid size={size}>
        <KpiCard
          title="Total kiriman"
          value={fNumber(summary.kirim)}
          unit="pcs"
          caption={`${fNumber(summary.visits)} kunjungan ke ${fNumber(summary.stores)} toko`}
          icon="carbon:delivery"
          accentColor={colors.kirim}
          spark={sparks.kirim}
        />
      </Grid>
      <Grid size={size}>
        <KpiCard
          badge={ESTIMATE}
          title="Estimasi terjual"
          value={fNumber(summary.estSold)}
          unit="pcs"
          caption={`${fPercent(summary.sellThrough)} dari kiriman sebelumnya laku`}
          icon="carbon:chart-average"
          accentColor={colors.estSold}
          spark={sparks.estSold}
        />
      </Grid>
      <Grid size={size}>
        <KpiCard
          title="Retur (BS)"
          value={fNumber(summary.bs)}
          unit="pcs"
          caption={`Rasio retur ${fPercent(summary.returnRate)} dari kiriman sebelumnya`}
          icon="carbon:arrow-down"
          accentColor={colors.bs}
          spark={sparks.bs}
        />
      </Grid>
      {!hideSalesValue && (
        <Grid size={size}>
          <KpiCard
            badge={ESTIMATE}
            title="Nilai estimasi terjual"
            value={fShortCurrency(summary.salesValue)}
            caption="Harga jual MRoti × estimasi terjual (harga diasumsikan tetap)"
            icon="solar:banknote-2-outline"
            color="secondary"
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
