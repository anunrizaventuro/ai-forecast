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
  /** Satuan kecil di belakang angka (mis. "pcs"). */
  unit?: string;
  /** Elemen kecil di samping angka (mis. label "Estimasi"). */
  badge?: React.ReactNode;
  /** Percentage change vs the previous period (signed). Omit to show `caption` instead. */
  delta?: number;
  deltaLabel?: string;
  /** Keterangan di bawah angka bila tidak ada `delta`. */
  caption?: string;
  icon: IconifyName;
  color?: ColorKey;
  /** Warna aksen eksplisit (menimpa `color`), mis. warna seri grafik. */
  accentColor?: string;
  spark?: number[];
  /** Konten tambahan di bagian bawah kartu. */
  footer?: React.ReactNode;
  /** When true, a downward delta is "good" (e.g. latency, error rate). */
  invertDelta?: boolean;
};

export function KpiCard({
  title,
  value,
  unit,
  badge,
  delta,
  deltaLabel,
  caption,
  icon,
  color = 'primary',
  accentColor,
  spark,
  footer,
  invertDelta = false,
  sx,
  ...other
}: Props) {
  const theme = useTheme();
  const up = (delta ?? 0) >= 0;
  const good = invertDelta ? !up : up;
  const accent = accentColor ?? theme.palette[color].main;
  const trendColor = good ? theme.palette.success.main : theme.palette.error.main;
  const hasSpark = !!spark && spark.length > 1;

  return (
    <Card
      sx={[
        { p: 3, height: 1, display: 'flex', flexDirection: 'column' },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
          {title}
        </Typography>
        <Box
          sx={{
            width: 40,
            height: 40,
            display: 'flex',
            flexShrink: 0,
            borderRadius: '50%',
            alignItems: 'center',
            justifyContent: 'center',
            color: accent,
            bgcolor: accentColor
              ? `color-mix(in srgb, ${accentColor} 12%, transparent)`
              : varAlpha(theme.vars.palette[color].mainChannel, 0.12),
          }}
        >
          <Iconify icon={icon} width={22} />
        </Box>
      </Stack>

      <Typography variant="h3" sx={{ mt: 2, wordBreak: 'break-word' }}>
        {value}
        {unit && (
          <Box component="span" sx={{ ml: 0.75, typography: 'h6', color: 'text.secondary' }}>
            {unit}
          </Box>
        )}
        {badge && (
          <Box component="span" sx={{ ml: 1, verticalAlign: 'middle' }}>
            {badge}
          </Box>
        )}
      </Typography>

      <Stack
        direction="row"
        spacing={2}
        sx={{ mt: 1.5, alignItems: 'center', justifyContent: 'space-between' }}
      >
        {delta !== undefined ? (
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
        ) : (
          <Typography variant="body2" sx={{ color: 'text.secondary', minWidth: 0 }}>
            {caption}
          </Typography>
        )}

        {hasSpark && (
          <Box sx={{ width: 72, height: 40, flexShrink: 0 }} aria-hidden>
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
        )}
      </Stack>

      {footer && <Box sx={{ mt: 'auto', pt: 2 }}>{footer}</Box>}
    </Card>
  );
}
