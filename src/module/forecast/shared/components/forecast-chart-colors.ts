import type { Theme, CSSObject } from '@mui/material/styles';

import { useColorScheme } from '@mui/material/styles';

// ----------------------------------------------------------------------
// Warna seri grafik — slot 1–3 palet kategorikal referensi (lolos validasi
// CVD & kontras untuk mode terang dan gelap). Warna mengikuti ENTITAS, bukan
// urutan: Kiriman selalu slot 1, Estimasi terjual slot 2, Retur (BS) slot 3.

export const SERIES = {
  kirim: { label: 'Kiriman', color: 'var(--series-1)' },
  estSold: { label: 'Estimasi terjual', color: 'var(--series-2)' },
  bs: { label: 'Retur (BS)', color: 'var(--series-3)' },
} as const;

export type SeriesKey = keyof typeof SERIES;

/** Warna yang sama dengan transparansi — untuk latar ikon, area grafik, dll. */
export const tint = (color: string, percent: number) =>
  `color-mix(in srgb, ${color} ${percent}%, transparent)`;

export function chartColorVars(theme: Theme): CSSObject {
  return {
    '--series-1': '#2a78d6',
    '--series-2': '#eb6834',
    '--series-3': '#1baf7a',
    ...theme.applyStyles('dark', {
      '--series-1': '#3987e5',
      '--series-2': '#d95926',
      '--series-3': '#199e70',
    }),
  };
}

// ----------------------------------------------------------------------
// Nilai hex yang sama untuk @mui/x-charts (atribut SVG tidak bisa membaca
// CSS variable dengan andal) — mengikuti skema warna aktif.

const SERIES_HEX = {
  light: { kirim: '#2a78d6', estSold: '#eb6834', bs: '#1baf7a' },
  dark: { kirim: '#3987e5', estSold: '#d95926', bs: '#199e70' },
} as const;

export function useSeriesColors(): Record<SeriesKey, string> {
  const { mode, systemMode } = useColorScheme();
  const resolved = mode === 'system' ? systemMode : mode;
  return SERIES_HEX[resolved === 'dark' ? 'dark' : 'light'];
}
