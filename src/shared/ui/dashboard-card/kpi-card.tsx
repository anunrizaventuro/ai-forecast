import type { CardProps } from '@mui/material/Card';
import type { IconifyName } from 'src/shared/ui/iconify';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import { SparkLineChart } from '@mui/x-charts/SparkLineChart';

import { Iconify } from 'src/shared/ui/iconify';

import { fDelta } from './format';

// ----------------------------------------------------------------------

type ColorKey = 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';

type Props = CardProps & {
  title: string;
  value: string;
  /** Percentage change vs the previous period (signed). */
  delta: number;
  deltaLabel: string;
  icon: IconifyName;
  color?: ColorKey;
  spark: number[];
  /** When true, a downward delta is "good" (e.g. latency, error rate). */
  invertDelta?: boolean;
};

export function KpiCard({
  title,
  value,
  delta,
  deltaLabel,
  icon,
  color = 'primary',
  spark,
  invertDelta = false,
  sx,
  ...other
}: Props) {
  const theme = useTheme();
  const up = delta >= 0;
  const good = invertDelta ? !up : up;
  const accent = theme.palette[color].main;
  const trendColor = good ? theme.palette.success.main : theme.palette.error.main;

  return (
    <Card sx={[{ p: 3 }, ...(Array.isArray(sx) ? sx : [sx])]} {...other}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
          {title}
        </Typography>
        <Box
          sx={{
            width: 40,
            height: 40,
            display: 'flex',
            borderRadius: '50%',
            alignItems: 'center',
            justifyContent: 'center',
            color: accent,
            bgcolor: varAlpha(theme.vars.palette[color].mainChannel, 0.12),
          }}
        >
          <Iconify icon={icon} width={22} />
        </Box>
      </Stack>

      <Typography variant="h3" sx={{ mt: 2 }}>
        {value}
      </Typography>

      <Stack
        direction="row"
        spacing={2}
        sx={{ mt: 1.5, alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Iconify
            icon={up ? 'eva:trending-up-fill' : 'eva:trending-down-fill'}
            width={18}
            sx={{ color: trendColor, flexShrink: 0 }}
          />
          <Typography variant="subtitle2" sx={{ color: trendColor }}>
            {fDelta(delta)}
          </Typography>
          <Typography variant="caption" noWrap sx={{ color: 'text.disabled' }}>
            {deltaLabel}
          </Typography>
        </Stack>

        <Box sx={{ width: 72, height: 40, flexShrink: 0 }}>
          <SparkLineChart
            data={spark}
            height={40}
            width={72}
            area
            curve="natural"
            color={accent}
            showHighlight
          />
        </Box>
      </Stack>
    </Card>
  );
}
