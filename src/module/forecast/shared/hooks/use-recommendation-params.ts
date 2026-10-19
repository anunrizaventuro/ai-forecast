import type { StoredRecSettings } from 'src/module/forecast/shared/utils';
import type { RecommendationParams } from 'src/module/forecast/shared/types';

import { useState, useSyncExternalStore } from 'react';

import { CONFIG } from 'src/shared/config';
import { apiErrorStatus } from 'src/shared/api';
import { DEFAULT_REC_PARAMS, parseStoredSettings } from 'src/module/forecast/shared/utils';
import {
  forecastKeys,
  getForecastSettings,
  updateForecastSettings,
} from 'src/module/forecast/shared/api';

import { setForecastData, useForecastQuery, invalidateForecast } from './use-forecast-query';

// ----------------------------------------------------------------------
// Parameter aturan rekomendasi aktif, dua sumber (sama seperti
// use-forecast-data):
// - 'api'      → GET/PUT /api/v1/forecast/settings (berlaku untuk semua pengguna).
// - 'simulasi' → localStorage browser ini; fallback memori bila storage diblokir.
// File terpisah dari use-forecast-data agar tidak saling import.

const IS_API = CONFIG.forecastSource === 'api';
const STORAGE_KEY = 'ai-forecast:rec-params';

const DEFAULT_STORED: StoredRecSettings = { params: DEFAULT_REC_PARAMS, updatedAt: null };

let memory: string | null = null;
let snapshot: { raw: string | null; value: StoredRecSettings } | null = null;
const listeners = new Set<() => void>();

function readRaw() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? memory;
  } catch {
    return memory;
  }
}

function getSnapshot(): StoredRecSettings {
  const raw = readRaw();
  // Objek stabil selama isi storage sama — syarat useSyncExternalStore.
  if (!snapshot || snapshot.raw !== raw) {
    snapshot = { raw, value: parseStoredSettings(raw) ?? DEFAULT_STORED };
  }
  return snapshot.value;
}

const getServerSnapshot = () => DEFAULT_STORED;

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function writeStored(value: StoredRecSettings) {
  memory = JSON.stringify(value);
  try {
    window.localStorage.setItem(STORAGE_KEY, memory);
  } catch {
    // Storage diblokir (private window) — tetap berlaku di memori sesi ini.
  }
  listeners.forEach((listener) => listener());
}

export type RecommendationParamsResult = {
  params: RecommendationParams;
  defaults: RecommendationParams;
  updatedAt: string | null;
  loading: boolean;
  error: Error | null;
  save: (params: RecommendationParams) => Promise<void>;
  saving: boolean;
};

export function useRecommendationParams(): RecommendationParamsResult {
  const local = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [saving, setSaving] = useState(false);

  const query = useForecastQuery(
    forecastKeys.settings,
    (signal) => getForecastSettings({ signal }),
    {
      enabled: IS_API,
      // 404 = backend belum punya endpoint pengaturan — jangan di-retry.
      retry: (count, error) => apiErrorStatus(error) !== 404 && count < 1,
    }
  );

  if (!IS_API) {
    return {
      params: local.params,
      defaults: DEFAULT_REC_PARAMS,
      updatedAt: local.updatedAt,
      loading: false,
      error: null,
      saving: false,
      save: async (params) => writeStored({ params, updatedAt: new Date().toISOString() }),
    };
  }

  // Selama gagal/memuat, tampilan memakai default = DefaultParams server.
  return {
    params: query.data?.params ?? DEFAULT_REC_PARAMS,
    defaults: query.data?.defaults ?? DEFAULT_REC_PARAMS,
    updatedAt: query.data?.updatedAt ?? null,
    loading: query.isPending,
    error: query.error,
    saving,
    save: async (params) => {
      setSaving(true);
      try {
        const data = await updateForecastSettings(params);
        setForecastData(forecastKeys.settings, data);
        // Rekomendasi & backtest dihitung ulang server dengan params baru;
        // entri settings baru saja diisi dari respons PUT, tidak perlu diambil ulang.
        invalidateForecast((key) => key[0] === 'forecast' && key[1] !== forecastKeys.settings[1]);
      } finally {
        setSaving(false);
      }
    },
  };
}
