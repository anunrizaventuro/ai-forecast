'use client';

import type { CardProps } from '@mui/material/Card';
import type { IconifyName } from 'src/components/iconify';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { ForecastSparkline } from './forecast-sparkline';
import { tint, chartColorVars } from './forecast-chart-colors';

// ----------------------------------------------------------------------
// Kartu KPI: ikon berwarna entitas (sama dengan warna seri di grafik), angka
// besar, keterangan, dan grafik mini tren pada rentang terpilih.

type Props = CardProps & {
  title: string;
  value: string;
  unit?: string;
  caption?: string;
  icon: IconifyName;
  /** Warna CSS entitas, mis. SERIES.kirim.color. */
  accent: string;
  estimate?: boolean;
  trend?: number[];
  footer?: React.ReactNode;
};

export function ForecastKpiCard({
  title,
  value,
  unit,
  caption,
  icon,
  accent,
  estimate,
  trend,
  footer,
  sx,
  ...other
}: Props) {
  return (
    <Card
      sx={[
        (theme) => ({
          ...chartColorVars(theme),
          p: 3,
          pb: trend ? 0 : 3,
          height: 1,
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
          flexDirection: 'column',
          '&::before': {
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            content: '""',
            position: 'absolute',
            bgcolor: accent,
          },
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box sx={{ mb: 2, gap: 1, display: 'flex', alignItems: 'center' }}>
        <Box
          sx={{
            width: 44,
            height: 44,
            flexShrink: 0,
            display: 'flex',
            borderRadius: 1.5,
            alignItems: 'center',
            justifyContent: 'center',
            color: accent,
            bgcolor: tint(accent, 14),
          }}
        >
          <Iconify icon={icon} width={24} />
        </Box>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary', lineHeight: 1.3 }}>
          {title}
        </Typography>
      </Box>

      <Typography variant="h3" component="p" sx={{ lineHeight: 1.1, wordBreak: 'break-word' }}>
        {value}
        {unit && (
          <Box component="span" sx={{ ml: 0.75, typography: 'h6', color: 'text.secondary' }}>
            {unit}
          </Box>
        )}
        {estimate && (
          <Label
            color="warning"
            variant="soft"
            sx={{ ml: 1, height: 20, fontSize: 11, verticalAlign: 'middle' }}
          >
            Estimasi
          </Label>
        )}
      </Typography>

      {caption && (
        <Typography variant="body2" sx={{ mt: 0.75, color: 'text.secondary' }}>
          {caption}
        </Typography>
      )}

      {footer && <Box sx={{ mt: 'auto', pt: 2 }}>{footer}</Box>}

      {trend && (
        <Box sx={{ mt: 'auto', mx: -3, pt: 2 }}>
          <ForecastSparkline values={trend} color={accent} height={72} />
        </Box>
      )}
    </Card>
  );
}
