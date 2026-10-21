import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

// ----------------------------------------------------------------------
// Rekomendasi Stok (aturan baseline, parameter tetap) dan SPK (aturan baru,
// versi Pengaturan aktif) memakai rumus berbeda — angkanya bisa tidak sama.
// Catatan ini tampil di kedua halaman supaya pengguna tahu harus memakai yang mana.

type Props = {
  page: 'recommendation' | 'spk';
};

const link = (href: string, label: string) => (
  <Link component={RouterLink} href={href} color="inherit" underline="always">
    {label}
  </Link>
);

export function RecommendationSpkNote({ page }: Props) {
  return (
    <Alert severity="info" variant="outlined" sx={{ mb: 3, py: 0.25 }}>
      {page === 'recommendation' ? (
        <>
          <Box component="strong" sx={{ mr: 0.5 }}>
            Halaman ini untuk analisis, bukan dokumen kerja.
          </Box>
          Angkanya masih memakai aturan baseline lama. Untuk menyiapkan muatan kurir, buat{' '}
          {link(paths.dashboard.spk, 'SPK')} — saran SPK memakai rumus baru sesuai{' '}
          {link(paths.dashboard.settings, 'Pengaturan')}, jadi angkanya bisa berbeda dari tabel di
          sini.
        </>
      ) : (
        <>
          <Box component="strong" sx={{ mr: 0.5 }}>
            SPK adalah dokumen kerja untuk kurir.
          </Box>
          Saran jumlahnya memakai rumus baru sesuai {link(paths.dashboard.settings, 'Pengaturan')}{' '}
          dan bisa berbeda dari {link(paths.dashboard.recommendation, 'Rekomendasi Stok')} (aturan
          baseline lama, hanya untuk analisis).
        </>
      )}
    </Alert>
  );
}
