import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';

// ----------------------------------------------------------------------

type Props = {
  children?: React.ReactNode;
};

/** Penanda wajib: angka di dashboard adalah simulasi, bukan hasil prediksi. */
export function ForecastSimulationAlert({ children }: Props) {
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
