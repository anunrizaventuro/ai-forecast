import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';

import { CONFIG } from 'src/global-config';

// ----------------------------------------------------------------------

type Props = {
  children?: React.ReactNode;
};

/**
 * Penanda wajib status data. Mode simulasi: angka dummy. Mode API: data asli
 * (read-only) tetapi rekomendasi masih aturan baseline yang belum divalidasi.
 */
export function ForecastSimulationAlert({ children }: Props) {
  if (CONFIG.forecastSource === 'api') {
    return (
      <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
        <AlertTitle>Data asli — rekomendasi belum divalidasi</AlertTitle>
        Angka berasal dari database sumber (read-only, periode inti 19 Agt – 30 Sep 2026).
        Rekomendasi masih aturan baseline dengan parameter contoh. Backtest awal belum mengalahkan
        praktik &quot;kebiasaan&quot; pada galat, dan arti BS/STOCK belum dikonfirmasi klien. Pakai
        sebagai bahan diskusi, bukan keputusan operasional.
        {children}
      </Alert>
    );
  }

  return (
    <Alert severity="warning" variant="outlined" sx={{ mb: 3 }}>
      <AlertTitle>Data simulasi — bukan hasil prediksi</AlertTitle>
      Seluruh angka dibuat oleh generator dummy yang meniru struktur tabel KIRIMAN, BS, dan STOCK
      (periode inti 19 Agt – 30 Sep 2026). Model belum dibuat dan backend belum terhubung, jadi
      angka ini tidak boleh dipakai untuk keputusan operasional.
      {children}
    </Alert>
  );
}
