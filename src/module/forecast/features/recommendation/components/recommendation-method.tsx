import type { RecommendationParams } from 'src/module/forecast/shared/types';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Accordion from '@mui/material/Accordion';
import Typography from '@mui/material/Typography';
import AccordionSummary, { accordionSummaryClasses } from '@mui/material/AccordionSummary';
import AccordionDetails, { accordionDetailsClasses } from '@mui/material/AccordionDetails';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/shared/ui/iconify';
import { fAdjust, fPercent } from 'src/module/forecast/shared/utils';
import { useRecommendationParams } from 'src/module/forecast/shared/hooks';

// ----------------------------------------------------------------------
// Penjelasan aturan baseline (studi kelayakan §4.2) agar rekomendasi bisa
// dijelaskan ke sales. Angka = pengaturan aktif (halaman Pengaturan) — belum
// dioptimasi lewat backtest.

const steps = (p: RecommendationParams) => [
  `Dasar: median estimasi terjual (rumus B: kiriman kunjungan sebelumnya − BS hari ini) dari ${p.window} kunjungan terakhir.`,
  `Riwayat < ${p.minObservations} observasi → fallback ke median produk di wilayah (kec) yang sama, lalu median semua wilayah. Kepercayaan rendah.`,
  'Penurunan karena BS otomatis lewat dasar: estimasi terjual = kiriman − BS, jadi bila BS konsisten 2%, rekomendasi ikut turun ±2%.',
  p.stockoutEnabled
    ? `Stok habis: BS = 0 dan STOCK = 0 pada ${p.stockoutStreak} kunjungan terakhir berturut-turut → +${fAdjust(p.stockoutBonusUnit, p.stockoutBonus)}${p.stockoutBonusUnit === 'persen' ? ' dari dasar (dibulatkan ke atas, min. 1 pcs)' : ''} untuk menguji permintaan yang tersensor.`
    : 'Penambahan karena stok habis: nonaktif.',
  p.returnSignalEnabled
    ? `Retur tinggi (tambahan): rasio BS > ${fPercent(p.returnThreshold, 0)} pada ${p.returnWindow} kunjungan terakhir${
        p.returnStreak > 1
          ? ` dan ${p.returnStreak} kunjungan terakhir berturut-turut masing-masing di atas batas`
          : ''
      } → −${fAdjust(p.returnCutUnit, p.returnCut)}${p.returnCutUnit === 'persen' ? ' dari dasar (dibulatkan ke atas, min. 1 pcs)' : ''}.`
    : 'Pengurangan tambahan saat retur tinggi: nonaktif.',
  `Batas perubahan per kunjungan: maks. ±${p.minStep} pcs atau ±${fPercent(p.maxStepRatio, 0)} dari kiriman terakhir (mana yang lebih besar).`,
  'Produk volume sangat kecil (mpkt, np, tf, jasuke, sisir2) dan kiriman pencilan tidak direkomendasikan otomatis.',
];

export function RecommendationMethod() {
  const { params } = useRecommendationParams();

  return (
    <Accordion
      disableGutters
      sx={(theme) => ({
        mb: 3,
        borderRadius: 2,
        bgcolor: 'background.paper',
        boxShadow: theme.vars.customShadows.card,
        '&::before': { display: 'none' },
        // Varian `disableGutters` tema meng-nol-kan padding; kartu ini butuh tepi dalam.
        [`& .${accordionSummaryClasses.root}`]: { px: 3 },
        [`& .${accordionDetailsClasses.root}`]: { px: 3, pb: 3 },
      })}
    >
      <AccordionSummary expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}>
        <Box sx={{ gap: 1, display: 'flex', alignItems: 'center' }}>
          <Iconify icon="solar:question-circle-outline" sx={{ color: 'text.secondary' }} />
          <Typography variant="subtitle2">Cara rekomendasi dihitung</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box component="ol" sx={{ pl: 2.5, gap: 1, display: 'flex', flexDirection: 'column' }}>
          {steps(params).map((step) => (
            <Typography key={step} component="li" variant="body2" sx={{ color: 'text.secondary' }}>
              {step}
            </Typography>
          ))}
        </Box>
        <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'text.disabled' }}>
          Aturan baseline mengikuti studi kelayakan §4.2. Parameternya contoh dan belum dioptimasi
          (hasil backtest awal ada di README ai-forecast-be); ubah di{' '}
          <Link
            component={RouterLink}
            href={paths.dashboard.settings}
            color="inherit"
            underline="always"
          >
            Pengaturan
          </Link>
          . Arti BS dan STOCK juga belum dikonfirmasi klien.
        </Typography>
      </AccordionDetails>
    </Accordion>
  );
}
