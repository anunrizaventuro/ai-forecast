import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { fNumber } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------
// Jumlah rekomendasi + selisih vs kiriman terakhir. Arah ditandai ikon dan
// teks (+/−), bukan warna saja.

type Props = {
  value: number | null;
  delta: number | null;
};

export function RecommendationDelta({ value, delta }: Props) {
  if (value === null) {
    return (
      <Typography variant="body2" sx={{ color: 'text.disabled' }}>
        –
      </Typography>
    );
  }

  const direction = !delta ? 'same' : delta > 0 ? 'up' : 'down';

  return (
    <Box sx={{ gap: 0.75, display: 'inline-flex', alignItems: 'center' }}>
      <Typography variant="subtitle2" component="span">
        {fNumber(value)}
      </Typography>
      {direction !== 'same' && (
        <Box
          component="span"
          sx={{
            gap: 0.25,
            display: 'inline-flex',
            alignItems: 'center',
            typography: 'caption',
            fontWeight: 'fontWeightSemiBold',
            color: direction === 'up' ? 'success.dark' : 'warning.dark',
          }}
        >
          <Iconify
            width={14}
            icon={direction === 'up' ? 'carbon:increase-level' : 'carbon:arrow-down'}
          />
          {delta! > 0 ? `+${delta}` : `−${Math.abs(delta!)}`}
        </Box>
      )}
    </Box>
  );
}
