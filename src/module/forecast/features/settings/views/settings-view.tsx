import { useMemo } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';

import { apiErrorStatus } from 'src/shared/api';
import { DEFAULT_FILTERS } from 'src/module/forecast/shared/utils';
import { useForecastStores, useRecommendationParams } from 'src/module/forecast/shared/hooks';
import {
  ForecastDataState,
  ForecastPageHeader,
  ForecastSimulationAlert,
} from 'src/module/forecast/shared/components';

import { SettingsParamsForm } from '../components/settings-params-form';

// ----------------------------------------------------------------------

export function SettingsView() {
  const settings = useRecommendationParams();
  const stores = useForecastStores(DEFAULT_FILTERS);

  // Rata-rata interval kunjungan semua toko — untuk perkiraan hari di form.
  const avgInterval = useMemo(() => {
    const values = (stores.data ?? [])
      .map((row) => row.avgInterval)
      .filter((value): value is number => value !== null);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  }, [stores.data]);

  // Backend lama belum punya endpoint pengaturan → 404.
  const unsupported = apiErrorStatus(settings.error) === 404;

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <ForecastPageHeader
        title="Pengaturan Rekomendasi"
        description="Atur kapan dan seberapa besar rekomendasi stok diturunkan (retur/BS) atau ditambah (stok habis)."
      />

      <ForecastSimulationAlert />

      {unsupported ? (
        <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
          Backend AI Forecast belum mendukung pengaturan rekomendasi. Rekomendasi saat ini memakai
          parameter default server.
        </Alert>
      ) : (
        <ForecastDataState error={settings.error} />
      )}

      {!settings.loading && !settings.error && (
        <SettingsParamsForm
          params={settings.params}
          defaults={settings.defaults}
          updatedAt={settings.updatedAt}
          avgInterval={avgInterval}
          saving={settings.saving}
          onSave={settings.save}
        />
      )}
    </Box>
  );
}
