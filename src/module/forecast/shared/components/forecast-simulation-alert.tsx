import { useState } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';

import { CONFIG } from 'src/shared/config';

// ----------------------------------------------------------------------

type Props = {
  children?: React.ReactNode;
};

const COPY =
  CONFIG.forecastSource === 'api'
    ? {
        severity: 'info' as const,
        title: 'Data asli — rekomendasi belum divalidasi.',
        short: 'Pakai sebagai bahan diskusi, bukan keputusan operasional.',
        detail:
          'Angka berasal dari database sumber (read-only, periode inti 19 Agt – 30 Sep 2026). Rekomendasi masih aturan baseline dengan parameter contoh. Backtest awal belum mengalahkan praktik "kebiasaan" pada galat, dan arti BS/STOCK belum dikonfirmasi klien.',
      }
    : {
        severity: 'warning' as const,
        title: 'Data simulasi — bukan hasil prediksi.',
        short: 'Angka dummy, jangan dipakai untuk keputusan operasional.',
        detail:
          'Seluruh angka dibuat oleh generator dummy yang meniru struktur tabel KIRIMAN, BS, dan STOCK (periode inti 19 Agt – 30 Sep 2026). Model belum dibuat dan backend belum terhubung.',
      };

/**
 * Penanda wajib status data, ringkas satu baris dengan detail yang bisa
 * dibuka. Mode simulasi: angka dummy. Mode API: data asli (read-only) tetapi
 * rekomendasi masih aturan baseline yang belum divalidasi.
 */
export function ForecastSimulationAlert({ children }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Alert
      severity={COPY.severity}
      sx={{ mb: 3, alignItems: 'center', '& .MuiAlert-message': { flex: 1 } }}
      action={
        <Button
          size="small"
          color="inherit"
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? 'Tutup' : 'Detail'}
        </Button>
      }
    >
      <Box component="strong" sx={{ mr: 0.5 }}>
        {COPY.title}
      </Box>
      {COPY.short}
      <Collapse in={open} unmountOnExit>
        <Box sx={{ mt: 1 }}>
          {COPY.detail}
          {children}
        </Box>
      </Collapse>
    </Alert>
  );
}
