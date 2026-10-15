'use client';

import { useMemo } from 'react';

import Alert from '@mui/material/Alert';

import { ApiError } from 'src/lib/api';

import { DEFAULT_FILTERS } from '../forecast-utils';
import { useForecastStores } from '../use-forecast-data';
import { ForecastDataState } from '../forecast-data-state';
import { ForecastPageHeader } from '../forecast-page-header';
import { SettingsParamsForm } from '../settings-params-form';
import { ForecastSimulationAlert } from '../forecast-simulation-alert';
import { useRecommendationParams } from '../use-recommendation-params';

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
  const unsupported = settings.error instanceof ApiError && settings.error.status === 404;

  return (
    <>
      <ForecastPageHeader
        title="Pengaturan Rekomendasi"
        icon="carbon:settings-adjust"
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
    </>
  );
}
