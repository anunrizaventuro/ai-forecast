import type { SettingsVersion, ForecastSettings } from 'src/module/forecast/shared/types';

import { useState, useSyncExternalStore } from 'react';

import { CONFIG } from 'src/shared/config';
import {
  sameSettings,
  DEFAULT_SETTINGS,
  parseStoredVersions,
} from 'src/module/forecast/shared/utils';
import {
  forecastKeys,
  getForecastSettings,
  updateForecastSettings,
  getForecastSettingsHistory,
} from 'src/module/forecast/shared/api';

import { setForecastData, useForecastQuery, invalidateForecast } from './use-forecast-query';

// ----------------------------------------------------------------------
// Pengaturan perhitungan berversi, dua sumber (sama seperti use-forecast-data):
// - 'api'      → GET/PUT /api/v1/forecast/settings (+ /history), berlaku untuk semua pengguna.
// - 'simulasi' → localStorage browser ini; fallback memori bila storage diblokir.
// File terpisah dari use-forecast-data agar tidak saling import.

const IS_API = CONFIG.forecastSource === 'api';
const STORAGE_KEY = 'ai-forecast:settings';
const MAX_LOCAL_VERSIONS = 50;

const DEFAULT_VERSION: SettingsVersion = {
  version: 0,
  params: DEFAULT_SETTINGS,
  note: '',
  createdAt: null,
};

let memory: string | null = null;
let snapshot: { raw: string | null; value: SettingsVersion[] } | null = null;
const listeners = new Set<() => void>();

function readRaw() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? memory;
  } catch {
    return memory;
  }
}

function getSnapshot(): SettingsVersion[] {
  const raw = readRaw();
  // Objek stabil selama isi storage sama — syarat useSyncExternalStore.
  if (!snapshot || snapshot.raw !== raw) {
    snapshot = { raw, value: parseStoredVersions(raw) };
  }
  return snapshot.value;
}

const EMPTY: SettingsVersion[] = [];
const getServerSnapshot = () => EMPTY;

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

function writeVersions(versions: SettingsVersion[]) {
  memory = JSON.stringify({ versions });
  try {
    window.localStorage.setItem(STORAGE_KEY, memory);
  } catch {
    // Storage diblokir (private window) — tetap berlaku di memori sesi ini.
  }
  listeners.forEach((listener) => listener());
}

export type ForecastSettingsResult = {
  settings: ForecastSettings;
  defaults: ForecastSettings;
  /** Versi aktif; 0 = default (belum pernah disimpan). */
  version: number;
  updatedAt: string | null;
  note: string;
  /** Terbaru dulu. */
  history: SettingsVersion[];
  loading: boolean;
  error: Error | null;
  saving: boolean;
  /** Simpan sebagai versi baru; `changed` false bila sama dengan versi aktif. */
  save: (params: ForecastSettings, note: string) => Promise<{ changed: boolean }>;
};

export function useForecastSettings(): ForecastSettingsResult {
  const local = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [saving, setSaving] = useState(false);

  const current = useForecastQuery(
    forecastKeys.settings,
    (signal) => getForecastSettings({ signal }),
    { enabled: IS_API }
  );
  const history = useForecastQuery(
    forecastKeys.settingsHistory,
    (signal) => getForecastSettingsHistory({ signal }),
    { enabled: IS_API }
  );

  if (!IS_API) {
    const active = local[0] ?? DEFAULT_VERSION;
    return {
      settings: active.params,
      defaults: DEFAULT_SETTINGS,
      version: active.version,
      updatedAt: active.createdAt,
      note: active.note,
      history: local,
      loading: false,
      error: null,
      saving: false,
      save: async (params, note) => {
        if (active.version > 0 && sameSettings(active.params, params)) return { changed: false };
        const next: SettingsVersion = {
          version: active.version + 1,
          params,
          note,
          createdAt: new Date().toISOString(),
        };
        writeVersions([next, ...local].slice(0, MAX_LOCAL_VERSIONS));
        return { changed: true };
      },
    };
  }

  // Selama memuat/gagal, tampilan memakai default (= DefaultSettings server).
  return {
    settings: current.data?.params ?? DEFAULT_SETTINGS,
    defaults: current.data?.defaults ?? DEFAULT_SETTINGS,
    version: current.data?.version ?? 0,
    updatedAt: current.data?.createdAt ?? null,
    note: current.data?.note ?? '',
    history: history.data ?? [],
    loading: current.isPending,
    error: current.error ?? history.error,
    saving,
    save: async (params, note) => {
      setSaving(true);
      try {
        const before = current.data?.version;
        const data = await updateForecastSettings(params, note);
        setForecastData(forecastKeys.settings, data);
        // Riwayat & semua data turunan dihitung ulang dengan versi baru.
        invalidateForecast((key) => key[0] === 'forecast' && key[1] !== 'settings');
        invalidateForecast((key) => key.join('|') === forecastKeys.settingsHistory.join('|'));
        return { changed: data.version !== before };
      } finally {
        setSaving(false);
      }
    },
  };
}
