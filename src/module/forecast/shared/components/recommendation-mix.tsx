import type { Segment } from './forecast-segment-bar';
import type { RecommendationSummary } from 'src/module/forecast/shared/utils';

import { useTheme } from '@mui/material/styles';

import { ForecastSegmentBar } from './forecast-segment-bar';

// ----------------------------------------------------------------------
// Komposisi status rekomendasi (naik / tetap / turun / dikecualikan). Warna
// status selalu didampingi ikon + label (lihat ForecastSegmentBar).

export type RecStatus = 'naik' | 'turun' | 'tetap' | 'dikecualikan';

type Props = {
  summary: RecommendationSummary;
  selected?: RecStatus | null;
  onSelect?: (status: RecStatus) => void;
  height?: number;
};

export function RecommendationMix({ summary, selected, onSelect, height }: Props) {
  const theme = useTheme();
  const { palette } = theme.vars;

  const segments: Segment<RecStatus>[] = [
    {
      key: 'naik',
      label: 'Ditambah',
      value: summary.increase,
      color: palette.success.main,
      icon: 'carbon:increase-level',
    },
    {
      key: 'tetap',
      label: 'Tetap',
      value: summary.same,
      color: palette.info.main,
      icon: 'eva:checkmark-fill',
    },
    {
      key: 'turun',
      label: 'Dikurangi',
      value: summary.decrease,
      color: palette.warning.main,
      icon: 'carbon:arrow-down',
    },
    {
      key: 'dikecualikan',
      label: 'Dikecualikan',
      value: summary.excluded,
      color: palette.grey[500],
      icon: 'solar:info-circle-outline',
    },
  ];

  return (
    <ForecastSegmentBar
      segments={segments}
      selected={selected}
      onSelect={onSelect}
      height={height}
      unit="item"
    />
  );
}
