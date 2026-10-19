import { Label } from 'src/shared/ui/label';
import { Iconify } from 'src/shared/ui/iconify';
import { IS_API } from 'src/module/forecast/shared/hooks';

// ----------------------------------------------------------------------
// Penanda sumber data — wajib di setiap halaman forecast sampai aturan
// rekomendasi divalidasi.

export function ForecastSourceChip() {
  return IS_API ? (
    <Label color="info" variant="soft" startIcon={<Iconify icon="solar:info-circle-bold" />}>
      data asli · baseline
    </Label>
  ) : (
    <Label color="warning" variant="soft" startIcon={<Iconify icon="solar:info-circle-bold" />}>
      simulasi
    </Label>
  );
}
