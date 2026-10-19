import type { SeriesKey } from './forecast-chart-colors';

import Box from '@mui/material/Box';
import { LineChart } from '@mui/x-charts/LineChart';

import { fNumber } from 'src/module/forecast/shared/utils';

import { SERIES, useSeriesColors } from './forecast-chart-colors';

// ----------------------------------------------------------------------
// Grafik garis tren (@mui/x-charts, gaya dashboard skeleton). Warna seri
// mengikuti entitas: Kiriman, Estimasi terjual, Retur (BS).

export type TrendSeries = {
  key: SeriesKey;
  values: number[];
};

type Props = {
  categories: string[];
  series: TrendSeries[];
  height?: number;
  ariaLabel: string;
};

export function ForecastTrendChart({ categories, series, height = 320, ariaLabel }: Props) {
  const colors = useSeriesColors();

  return (
    <Box role="figure" aria-label={ariaLabel}>
      <LineChart
        height={height}
        xAxis={[{ scaleType: 'point', data: categories }]}
        yAxis={[{ width: 56, valueFormatter: (value: number) => fNumber(value) }]}
        series={series.map((s) => ({
          id: s.key,
          data: s.values,
          label: SERIES[s.key].label,
          color: colors[s.key],
          curve: 'monotoneX',
          showMark: categories.length <= 14,
          valueFormatter: (value: number | null) => `${fNumber(value)} pcs`,
        }))}
        grid={{ horizontal: true }}
        hideLegend={series.length < 2}
        margin={{ left: 8, right: 16, top: 16, bottom: 8 }}
      />
    </Box>
  );
}
