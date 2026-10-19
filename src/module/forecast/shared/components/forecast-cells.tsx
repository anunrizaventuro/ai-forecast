import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/shared/ui/iconify';
import { fNumber, fPercent } from 'src/module/forecast/shared/utils';

import { SERIES, chartColorVars } from './forecast-chart-colors';

// ----------------------------------------------------------------------
// Isi sel tabel yang dipakai ulang di Data Toko / Data Produk.

/** Angka + bar tipis relatif terhadap nilai terbesar di tabel. */
export function InlineBarCell({
  value,
  max,
  series = 'kirim',
}: {
  value: number;
  max: number;
  series?: keyof typeof SERIES;
}) {
  return (
    <Box sx={(theme) => ({ ...chartColorVars(theme), minWidth: 96, ml: 'auto' })}>
      <Typography variant="body2" sx={{ mb: 0.5 }}>
        {fNumber(value)}
      </Typography>
      <Box sx={{ height: 4, borderRadius: 2, bgcolor: 'action.hover' }}>
        <Box
          sx={{
            height: 1,
            ml: 'auto',
            borderRadius: 2,
            bgcolor: SERIES[series].color,
            width: `${max ? Math.max(2, (value / max) * 100) : 0}%`,
          }}
        />
      </Box>
    </Box>
  );
}

/**
 * Rasio retur; di atas ambang aturan rekomendasi (`threshold`, dari
 * pengaturan aktif) ditandai pill + ikon, bukan warna saja.
 */
export function ReturnRateCell({ value, threshold }: { value: number | null; threshold: number }) {
  const high = value !== null && value > threshold;

  if (!high) {
    return <Typography variant="body2">{fPercent(value)}</Typography>;
  }

  return (
    <Box
      component="span"
      sx={(theme) => ({
        px: 0.75,
        py: 0.25,
        gap: 0.5,
        borderRadius: 1,
        display: 'inline-flex',
        alignItems: 'center',
        typography: 'body2',
        fontWeight: 'fontWeightSemiBold',
        color: 'error.dark',
        bgcolor: varAlpha(theme.vars.palette.error.mainChannel, 0.12),
      })}
    >
      <Iconify icon="solar:info-circle-bold" width={14} />
      {fPercent(value)}
    </Box>
  );
}

/** Avatar inisial nama (2 huruf). */
export function NameAvatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((word) => word[0]?.toUpperCase())
    .join('');

  return (
    <Avatar
      sx={(theme) => ({
        width: 36,
        height: 36,
        typography: 'subtitle2',
        color: 'primary.dark',
        bgcolor: varAlpha(theme.vars.palette.primary.mainChannel, 0.12),
      })}
    >
      {initials}
    </Avatar>
  );
}
