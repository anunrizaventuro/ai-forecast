import type { IconifyName } from 'src/shared/ui/iconify';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/shared/ui/iconify';

import { tint, chartColorVars } from './forecast-chart-colors';

// ----------------------------------------------------------------------
// Deret statistik ringkas di atas tabel master (Data Toko / Data Produk):
// satu kartu, beberapa angka berdampingan, dipisah garis tipis.

export type StatItem = {
  label: string;
  value: string;
  caption?: string;
  icon: IconifyName;
  /** Warna CSS, mis. SERIES.kirim.color atau theme.vars.palette.primary.main. */
  color: string;
};

type Props = {
  items: StatItem[];
};

export function ForecastStatStrip({ items }: Props) {
  return (
    <Card
      sx={(theme) => ({
        ...chartColorVars(theme),
        mb: 3,
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: `repeat(${items.length}, 1fr)`,
        },
      })}
    >
      {items.map((item) => (
        <Box
          key={item.label}
          sx={(theme) => ({
            p: 2.5,
            gap: 2,
            display: 'flex',
            alignItems: 'center',
            borderColor: 'divider',
            borderStyle: 'dashed',
            borderWidth: 0,
            borderBottomWidth: 1,
            [theme.breakpoints.up('md')]: {
              borderBottomWidth: 0,
              '&:not(:last-of-type)': { borderRightWidth: 1 },
            },
          })}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              flexShrink: 0,
              display: 'flex',
              borderRadius: '50%',
              alignItems: 'center',
              justifyContent: 'center',
              color: item.color,
              bgcolor: tint(item.color, 14),
            }}
          >
            <Iconify icon={item.icon} width={24} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
              {item.label}
            </Typography>
            <Typography variant="h5" component="p" noWrap>
              {item.value}
            </Typography>
            {item.caption && (
              <Typography
                variant="caption"
                sx={{ color: 'text.disabled', display: 'block' }}
                noWrap
              >
                {item.caption}
              </Typography>
            )}
          </Box>
        </Box>
      ))}
    </Card>
  );
}
