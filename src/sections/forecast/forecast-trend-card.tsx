'use client';

import type { CardProps } from '@mui/material/Card';
import type { SeriesKey } from './forecast-chart-colors';
import type { TrendSeries } from './forecast-trend-chart';
import type { Granularity, SeriesPoint } from './forecast-utils';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { ForecastTrendChart } from './forecast-trend-chart';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title: string;
  subheader?: string;
  points: SeriesPoint[];
  seriesKeys: SeriesKey[];
  granularity: Granularity;
  onGranularityChange?: (value: Granularity) => void;
  height?: number;
};

export function ForecastTrendCard({
  title,
  subheader,
  points,
  seriesKeys,
  granularity,
  onGranularityChange,
  height,
  ...other
}: Props) {
  const series: TrendSeries[] = seriesKeys.map((key) => ({
    key,
    values: points.map((point) => point[key]),
  }));

  return (
    <Card {...other}>
      <CardHeader
        title={title}
        subheader={subheader}
        action={
          onGranularityChange && (
            <ToggleButtonGroup
              exclusive
              size="small"
              value={granularity}
              onChange={(_, value: Granularity | null) => value && onGranularityChange(value)}
              aria-label="Satuan waktu"
            >
              <ToggleButton value="harian">Harian</ToggleButton>
              <ToggleButton value="mingguan">Mingguan</ToggleButton>
            </ToggleButtonGroup>
          )
        }
        sx={{ flexWrap: 'wrap', gap: 1.5 }}
      />
      <CardContent>
        <ForecastTrendChart
          categories={points.map((point) => point.label)}
          series={series}
          height={height}
          ariaLabel={`${title}. Gunakan panah kiri dan kanan untuk membaca nilai per titik.`}
        />
      </CardContent>
    </Card>
  );
}
