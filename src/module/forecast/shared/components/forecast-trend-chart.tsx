import type { SeriesKey } from './forecast-chart-colors';

import { useMemo } from 'react';

import Box from '@mui/material/Box';
import { LineChart } from '@mui/x-charts/LineChart';

import { fNumber } from 'src/module/forecast/shared/utils';

import { SERIES, useSeriesColors } from './forecast-chart-colors';

// ----------------------------------------------------------------------

const Y_AXIS = [{ min: 0, width: 56, valueFormatter: (value: number) => fNumber(value) }];
const MARGIN = { left: 8, right: 16, top: 16, bottom: 8 };
const GRID = { horizontal: true };
const formatPcs = (value: number | null) => `${fNumber(value)} pcs`;

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

  // Identitas props stabil: x-charts menghitung ulang skala bila array/objek baru.
  const xAxis = useMemo(() => [{ scaleType: 'point' as const, data: categories }], [categories]);
  const showMark = categories.length <= 14;
  const lineSeries = useMemo(
    () =>
      series.map((s) => ({
        id: s.key,
        data: s.values,
        label: SERIES[s.key].label,
        color: colors[s.key],
        curve: 'monotoneX' as const,
        showMark,
        valueFormatter: formatPcs,
      })),
    [series, colors, showMark]
  );

  return (
    <Box role="figure" aria-label={ariaLabel}>
      <LineChart
        height={height}
        xAxis={xAxis}
        yAxis={Y_AXIS}
        series={lineSeries}
        grid={GRID}
        hideLegend={series.length < 2}
        margin={MARGIN}
      />
    </Box>
  );
}
