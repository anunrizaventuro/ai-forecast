'use client';

import type { SeriesKey } from './forecast-chart-colors';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { fNumber } from 'src/utils/format-number';

import { SERIES, chartColorVars } from './forecast-chart-colors';

// ----------------------------------------------------------------------
// Bar horizontal satu seri (judul kartu menamai seri → tanpa legend). Nilai
// tertulis di ujung tiap baris; detail tambahan lewat tooltip per baris.

export type BarListItem = {
  key: string;
  label: string;
  caption?: string;
  value: number;
  detail?: string;
};

type Props = {
  items: BarListItem[];
  series: SeriesKey;
  unit?: string;
  emptyText?: string;
};

export function ForecastBarList({ items, series, unit = 'pcs', emptyText }: Props) {
  const max = Math.max(1, ...items.map((item) => item.value));

  if (!items.length) {
    return (
      <Typography variant="body2" sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}>
        {emptyText ?? 'Tidak ada data untuk filter ini.'}
      </Typography>
    );
  }

  return (
    <Box
      component="ul"
      sx={(theme) => ({
        ...chartColorVars(theme),
        gap: 2,
        display: 'flex',
        flexDirection: 'column',
      })}
    >
      {items.map((item) => (
        <Tooltip key={item.key} title={item.detail ?? ''} placement="top-start" disableInteractive>
          <Box component="li" tabIndex={item.detail ? 0 : -1} sx={{ outline: 'none' }}>
            <Box sx={{ mb: 0.75, gap: 1, display: 'flex', alignItems: 'baseline' }}>
              <Typography variant="subtitle2" noWrap>
                {item.label}
              </Typography>
              {item.caption && (
                <Typography variant="caption" sx={{ color: 'text.disabled' }} noWrap>
                  {item.caption}
                </Typography>
              )}
              <Typography variant="subtitle2" sx={{ ml: 'auto', flexShrink: 0 }}>
                {fNumber(item.value)}
                <Box
                  component="span"
                  sx={{ ml: 0.5, typography: 'caption', color: 'text.secondary' }}
                >
                  {unit}
                </Box>
              </Typography>
            </Box>
            <Box
              sx={(theme) => ({
                height: 8,
                borderRadius: 1,
                bgcolor: theme.vars.palette.action.hover,
              })}
            >
              <Box
                sx={{
                  height: 1,
                  borderRadius: 1,
                  bgcolor: SERIES[series].color,
                  width: `${Math.max(2, (item.value / max) * 100)}%`,
                  transition: 'width 0.3s ease',
                }}
              />
            </Box>
          </Box>
        </Tooltip>
      ))}
    </Box>
  );
}
