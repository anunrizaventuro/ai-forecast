import type { SeriesKey } from './forecast-chart-colors';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { fNumber } from 'src/module/forecast/shared/utils';

import { tint, SERIES, chartColorVars } from './forecast-chart-colors';

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
  /** Tampilkan nomor peringkat; 3 teratas diberi warna seri. */
  ranked?: boolean;
};

export function ForecastBarList({ items, series, unit = 'pcs', emptyText, ranked }: Props) {
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
      {items.map((item, index) => (
        <Tooltip key={item.key} title={item.detail ?? ''} placement="top-start" disableInteractive>
          <Box
            component="li"
            tabIndex={item.detail ? 0 : -1}
            sx={{ gap: 1.5, display: 'flex', outline: 'none', alignItems: 'center' }}
          >
            {ranked && (
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  flexShrink: 0,
                  display: 'flex',
                  borderRadius: '50%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  typography: 'subtitle2',
                  ...(index < 3
                    ? { color: SERIES[series].color, bgcolor: tint(SERIES[series].color, 16) }
                    : { color: 'text.secondary', bgcolor: 'action.hover' }),
                }}
              >
                {index + 1}
              </Box>
            )}
            <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
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
                  height: 10,
                  borderRadius: 5,
                  bgcolor: theme.vars.palette.action.hover,
                })}
              >
                <Box
                  sx={{
                    height: 1,
                    borderRadius: 5,
                    bgcolor: SERIES[series].color,
                    width: `${Math.max(2, (item.value / max) * 100)}%`,
                    transition: 'width 0.3s ease',
                  }}
                />
              </Box>
            </Box>
          </Box>
        </Tooltip>
      ))}
    </Box>
  );
}
