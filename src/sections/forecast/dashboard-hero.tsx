'use client';

import type { IconifyName } from 'src/components/iconify';
import type { CellSummary, RecommendationSummary } from './forecast-utils';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fNumber, fPercent } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

import { fDate } from './forecast-utils';
import { IS_API } from './use-forecast-data';

// ----------------------------------------------------------------------
// Ringkasan naratif di puncak dashboard: satu kalimat kondisi distribusi,
// satu indikator utama (porsi kiriman yang laku), dan tindakan untuk
// kunjungan berikutnya. Angka sama dengan kartu KPI — hanya dibahasakan.

type Props = {
  summary: CellSummary;
  recommendation: RecommendationSummary;
  from: string;
  to: string;
};

function SellThroughGauge({ value }: { value: number | null }) {
  const size = 148;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.min(1, Math.max(0, value ?? 0));

  return (
    <Box sx={{ width: size, height: size, flexShrink: 0, position: 'relative' }}>
      <svg width={size} height={size} aria-hidden style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.16}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <Box
        sx={{
          inset: 0,
          display: 'flex',
          position: 'absolute',
          alignItems: 'center',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Typography variant="h3" component="p" sx={{ lineHeight: 1 }}>
          {fPercent(value, 0)}
        </Typography>
        <Typography variant="caption" sx={{ mt: 0.5, opacity: 0.8 }}>
          kiriman laku
        </Typography>
      </Box>
    </Box>
  );
}

type ActionChipProps = { icon: IconifyName; value: number; label: string };

function ActionChip({ icon, value, label }: ActionChipProps) {
  return (
    <Box
      sx={(theme) => ({
        px: 1.5,
        py: 1,
        gap: 1,
        display: 'flex',
        borderRadius: 1.5,
        alignItems: 'center',
        bgcolor: varAlpha(theme.vars.palette.common.whiteChannel, 0.12),
      })}
    >
      <Iconify icon={icon} width={18} />
      <Typography variant="subtitle1" component="span">
        {fNumber(value)}
      </Typography>
      <Typography variant="body2" component="span" sx={{ opacity: 0.8 }}>
        {label}
      </Typography>
    </Box>
  );
}

export function DashboardHero({ summary, recommendation, from, to }: Props) {
  return (
    <Card
      sx={(theme) => ({
        p: { xs: 3, md: 4 },
        mb: 3,
        gap: { xs: 3, md: 5 },
        display: 'flex',
        overflow: 'hidden',
        position: 'relative',
        alignItems: 'center',
        color: 'common.white',
        flexDirection: { xs: 'column', md: 'row' },
        backgroundImage: `linear-gradient(135deg, ${theme.vars.palette.primary.darker} 0%, ${theme.vars.palette.primary.dark} 45%, ${theme.vars.palette.primary.main} 100%)`,
        boxShadow: `0 16px 32px -12px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.48)}`,
        // Ornamen lingkaran — murni dekoratif.
        '&::before, &::after': {
          content: '""',
          position: 'absolute',
          borderRadius: '50%',
          pointerEvents: 'none',
          bgcolor: varAlpha(theme.vars.palette.common.whiteChannel, 0.06),
        },
        '&::before': { width: 320, height: 320, top: -140, right: -80 },
        '&::after': { width: 200, height: 200, bottom: -120, right: 220 },
      })}
    >
      <Box sx={{ flex: '1 1 auto', minWidth: 0, zIndex: 1 }}>
        <Typography
          variant="overline"
          component="h1"
          sx={{ mb: 1, opacity: 0.8, display: 'block', letterSpacing: 1 }}
        >
          Ringkasan distribusi · {fDate(from)} – {fDate(to)}
        </Typography>

        <Typography variant="h3" component="p" sx={{ mb: 1.5, maxWidth: 760, textWrap: 'balance' }}>
          {summary.sellThrough === null
            ? 'Belum ada kiriman yang bisa dihitung pada rentang ini'
            : `Sekitar ${fPercent(summary.sellThrough, 0)} roti yang dikirim diperkirakan laku`}
        </Typography>

        <Typography variant="body1" sx={{ opacity: 0.85, maxWidth: 640 }}>
          {fNumber(summary.kirim)} pcs dikirim ke {fNumber(summary.stores)} toko dalam{' '}
          {fNumber(summary.visits)} kunjungan. Estimasi terjual {fNumber(summary.estSold)} pcs,
          retur {fNumber(summary.bs)} pcs ({fPercent(summary.returnRate)}).
        </Typography>

        <Typography variant="subtitle2" sx={{ mt: 3, mb: 1.5, opacity: 0.8 }}>
          Untuk kunjungan berikutnya ({IS_API ? 'aturan baseline' : 'simulasi'})
        </Typography>

        <Box sx={{ gap: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
          <ActionChip
            icon="carbon:increase-level"
            value={recommendation.increase}
            label="ditambah"
          />
          <ActionChip icon="carbon:arrow-down" value={recommendation.decrease} label="dikurangi" />
          <ActionChip icon="eva:checkmark-fill" value={recommendation.same} label="tetap" />
          <Button
            component={RouterLink}
            href={paths.dashboard.recommendation}
            variant="contained"
            endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={18} />}
            sx={{
              ml: { sm: 'auto' },
              color: 'grey.800',
              bgcolor: 'common.white',
              '&:hover': { bgcolor: 'grey.200' },
            }}
          >
            Lihat rekomendasi
          </Button>
        </Box>
      </Box>

      <Box sx={{ zIndex: 1 }}>
        <SellThroughGauge value={summary.sellThrough} />
      </Box>
    </Card>
  );
}
