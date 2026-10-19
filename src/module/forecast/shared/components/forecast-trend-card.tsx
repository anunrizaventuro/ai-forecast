import type { CardProps } from '@mui/material/Card';
import type { SeriesKey } from './forecast-chart-colors';
import type { TrendSeries } from './forecast-trend-chart';
import type { Granularity, SeriesPoint } from 'src/module/forecast/shared/types';

import { useMemo } from 'react';

import CardContent from '@mui/material/CardContent';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { ChartCard } from 'src/shared/ui/dashboard-card';

import { ForecastTrendChart } from './forecast-trend-chart';

// ----------------------------------------------------------------------

type Props = Omit<CardProps, 'title'> & {
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
  // `seriesKeys` biasanya literal array dari pemanggil — memo pada isinya, bukan identitasnya.
  const keys = seriesKeys.join();
  const series: TrendSeries[] = useMemo(
    () =>
      (keys.split(',') as SeriesKey[]).map((key) => ({
        key,
        values: points.map((point) => point[key]),
      })),
    [points, keys]
  );
  const categories = useMemo(() => points.map((point) => point.label), [points]);

  return (
    <ChartCard
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
      {...other}
    >
      <CardContent>
        <ForecastTrendChart
          categories={categories}
          series={series}
          height={height}
          ariaLabel={`${title}. Gunakan panah kiri dan kanan untuk membaca nilai per titik.`}
        />
      </CardContent>
    </ChartCard>
  );
}
