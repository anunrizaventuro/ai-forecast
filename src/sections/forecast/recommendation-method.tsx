import Box from '@mui/material/Box';
import Accordion from '@mui/material/Accordion';
import Typography from '@mui/material/Typography';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import { fPercent } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

import { REC_PARAMS } from './forecast-utils';

// ----------------------------------------------------------------------
// Penjelasan aturan baseline (studi kelayakan §4.2) agar rekomendasi bisa
// dijelaskan ke sales. Parameter adalah contoh (sama dengan backend) — belum
// dioptimasi lewat backtest.

const STEPS = [
  `Dasar: median estimasi terjual (rumus B: kiriman kunjungan sebelumnya − BS hari ini) dari ${REC_PARAMS.window} kunjungan terakhir.`,
  `Riwayat < ${REC_PARAMS.minObservations} observasi → fallback ke median produk di wilayah (kec) yang sama, lalu median semua wilayah. Kepercayaan rendah.`,
  'Sinyal habis: BS = 0 dan STOCK = 0 pada 2 kunjungan terakhir → +1 pcs untuk menguji permintaan yang tersensor.',
  `Sinyal retur: rasio BS > ${fPercent(REC_PARAMS.returnThreshold, 0)} pada 3 kunjungan terakhir → −1 pcs.`,
  `Batas perubahan per kunjungan: maks. ±${REC_PARAMS.minStep} pcs atau ±${fPercent(REC_PARAMS.maxStepRatio, 0)} dari kiriman terakhir (mana yang lebih besar).`,
  'Produk volume sangat kecil (mpkt, np, tf, jasuke, sisir2) dan kiriman pencilan tidak direkomendasikan otomatis.',
];

export function RecommendationMethod() {
  return (
    <Accordion
      disableGutters
      sx={(theme) => ({
        mb: 3,
        borderRadius: 2,
        boxShadow: theme.vars.customShadows.card,
        '&::before': { display: 'none' },
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
          {STEPS.map((step) => (
            <Typography key={step} component="li" variant="body2" sx={{ color: 'text.secondary' }}>
              {step}
            </Typography>
          ))}
        </Box>
        <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'text.disabled' }}>
          Aturan baseline mengikuti studi kelayakan §4.2. Parameternya contoh dan belum dioptimasi;
          hasil backtest awal ada di README ai-forecast-be. Arti BS dan STOCK juga belum
          dikonfirmasi klien.
        </Typography>
      </AccordionDetails>
    </Accordion>
  );
}
