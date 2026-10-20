import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';

import { fDateTime, DEFAULT_FILTERS } from 'src/module/forecast/shared/utils';
import {
  IS_API,
  useForecastMeta,
  useForecastStores,
  useForecastSettings,
} from 'src/module/forecast/shared/hooks';
import {
  ForecastDataState,
  ForecastPageHeader,
  ForecastSimulationAlert,
} from 'src/module/forecast/shared/components';

import { SettingsForm } from '../components/settings-form';
import { SettingsHistory } from '../components/settings-history';

// ----------------------------------------------------------------------

export function SettingsView() {
  const settings = useForecastSettings();
  const meta = useForecastMeta();
  const stores = useForecastStores(DEFAULT_FILTERS);

  // Rata-rata jarak kunjungan semua toko di data — pembanding interval.
  const observedInterval = useMemo(() => {
    const values = (stores.data ?? [])
      .map((row) => row.avgInterval)
      .filter((value): value is number => value !== null);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  }, [stores.data]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <ForecastPageHeader
        title="Pengaturan Perhitungan"
        description="Atur cara sistem memperkirakan penjualan dan menyarankan jumlah kiriman, tanpa mengubah program. Nilai awal masih perlu dikonfirmasi — bukan aturan final."
      />

      <ForecastSimulationAlert />

      <ForecastDataState error={settings.error} />

      <Stack spacing={3}>
        <Alert severity="info" variant="outlined">
          {settings.version > 0
            ? `Versi aktif #${settings.version}, disimpan ${settings.updatedAt ? fDateTime(settings.updatedAt) : ''}${settings.note ? ` — "${settings.note}"` : ''}.`
            : 'Belum pernah disimpan — semua parameter memakai nilai default.'}{' '}
          {IS_API
            ? 'Berlaku untuk semua pengguna.'
            : 'Mode simulasi: tersimpan di browser ini saja.'}{' '}
          Pengaturan ini dipakai perhitungan analisis dan rekomendasi SPK yang baru; halaman
          Rekomendasi Stok saat ini masih memakai aturan lama dengan parameter tetap.
        </Alert>

        {!settings.loading && !settings.error && (
          <SettingsForm
            settings={settings.settings}
            defaults={settings.defaults}
            products={meta.data?.products ?? []}
            observedInterval={observedInterval}
            saving={settings.saving}
            onSave={settings.save}
          />
        )}

        <SettingsHistory history={settings.history} />
      </Stack>
    </Box>
  );
}
