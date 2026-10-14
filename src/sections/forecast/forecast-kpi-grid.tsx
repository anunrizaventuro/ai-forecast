import type { CellSummary } from './forecast-utils';

import Grid from '@mui/material/Grid';

import { fNumber, fPercent, fShortCurrency } from 'src/utils/format-number';

import { ForecastKpiCard } from './forecast-kpi-card';

// ----------------------------------------------------------------------

type Props = {
  summary: CellSummary;
};

export function ForecastKpiGrid({ summary }: Props) {
  return (
    <Grid container spacing={3} sx={{ mb: 3 }}>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <ForecastKpiCard
          title="Total kiriman"
          value={`${fNumber(summary.kirim)} pcs`}
          caption={`${fNumber(summary.visits)} kunjungan · ${fNumber(summary.stores)} toko`}
          icon="carbon:delivery"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <ForecastKpiCard
          estimate
          title="Estimasi terjual"
          value={`${fNumber(summary.estSold)} pcs`}
          caption={`Sell-through ${fPercent(summary.sellThrough)} · rumus kirim(t−1) − BS(t)`}
          icon="carbon:chart-average"
          color="info"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <ForecastKpiCard
          title="Retur (BS)"
          value={`${fNumber(summary.bs)} pcs`}
          caption={`Rasio retur ${fPercent(summary.returnRate)} dari kiriman sebelumnya`}
          icon="carbon:arrow-down"
          color="warning"
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
        <ForecastKpiCard
          estimate
          title="Nilai estimasi terjual"
          value={fShortCurrency(summary.salesValue)}
          caption="Harga jual MRoti per pcs (asumsi harga tetap)"
          icon="solar:banknote-2-outline"
          color="secondary"
        />
      </Grid>
    </Grid>
  );
}
