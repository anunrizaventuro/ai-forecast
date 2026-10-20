import type { SpkCreateInput } from '../api';
import type { ApiError } from 'src/shared/api';
import type { SpkEdit, SpkDetail, SpkSummary } from 'src/module/forecast/shared/types';

import dayjs from 'dayjs';
import { useSyncExternalStore } from 'react';

import { PRODUCT_CODES } from 'src/module/forecast/shared/types';
import {
  IS_API,
  setForecastData,
  useForecastQuery,
  invalidateForecast,
  useForecastSettings,
} from 'src/module/forecast/shared/hooks';
import {
  PERIOD,
  spkCsv,
  spkAsOf,
  storeMap,
  productMap,
  suggestSpk,
  spkFileName,
  forecastCells,
} from 'src/module/forecast/shared/utils';

import {
  getSpk,
  spkKeys,
  createSpk,
  deleteSpk,
  exportSpk,
  updateSpk,
  getSpkList,
  finalizeSpk,
} from '../api';

// ----------------------------------------------------------------------
// SPK, dua sumber (sama seperti use-forecast-settings):
// - 'api'      → /api/v1/spk (database kerja backend).
// - 'simulasi' → localStorage browser ini; saran dihitung di client dengan
//   suggestSpk (identik dengan backend). Aturan validasi meniru backend.

const STORAGE_KEY = 'ai-forecast:spk';
const MAX_QTY = 9999;

type LocalState = { nextId: number; items: SpkDetail[] };

const EMPTY_STATE: LocalState = { nextId: 1, items: [] };

let memory: string | null = null;
let snapshot: { raw: string | null; value: LocalState } | null = null;
const listeners = new Set<() => void>();

function readRaw() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? memory;
  } catch {
    return memory;
  }
}

function parseState(raw: string | null): LocalState {
  if (!raw) return EMPTY_STATE;
  try {
    const value = JSON.parse(raw) as LocalState;
    return Array.isArray(value.items) && typeof value.nextId === 'number' ? value : EMPTY_STATE;
  } catch {
    return EMPTY_STATE;
  }
}

function getSnapshot(): LocalState {
  const raw = readRaw();
  if (!snapshot || snapshot.raw !== raw) snapshot = { raw, value: parseState(raw) };
  return snapshot.value;
}

const getServerSnapshot = () => EMPTY_STATE;

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

function writeState(state: LocalState) {
  memory = JSON.stringify(state);
  try {
    window.localStorage.setItem(STORAGE_KEY, memory);
  } catch {
    // Storage diblokir (private window) — tetap berlaku di memori sesi ini.
  }
  listeners.forEach((listener) => listener());
}

function fail(message: string, status: number, errors?: Record<string, string[]>): never {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.errors = errors;
  throw error;
}

function localGet(id: number) {
  const spk = getSnapshot().items.find((item) => item.id === id);
  return spk ?? fail('SPK tidak ditemukan.', 404);
}

function localDraft(id: number) {
  const spk = localGet(id);
  if (spk.status !== 'draft') fail('SPK sudah final — tidak bisa diubah atau dihapus.', 409);
  return spk;
}

function localSave(spk: SpkDetail) {
  const state = getSnapshot();
  writeState({ ...state, items: state.items.map((item) => (item.id === spk.id ? spk : item)) });
  return spk;
}

const toSummary = ({ lines, ...spk }: SpkDetail): SpkSummary => {
  // Ringkasan tidak membawa params pengaturan (sama dengan GET /api/v1/spk).
  const header: Partial<SpkDetail> = { ...spk };
  delete header.settings;
  return {
    ...(header as SpkSummary),
    lineCount: lines.length,
    emptyCount: lines.filter((l) => l.qty === null).length,
    totalQty: lines.reduce((total, l) => total + (l.qty ?? 0), 0),
  };
};

const byNewest = (a: SpkSummary, b: SpkSummary) => b.tgl.localeCompare(a.tgl) || b.id - a.id;

// ---------------------------------------------------------------------- Baca

export function useSpkList() {
  const local = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const query = useForecastQuery(spkKeys.list, (signal) => getSpkList({ signal }), {
    enabled: IS_API,
  });
  if (!IS_API) {
    return {
      data: local.items.map(toSummary).sort(byNewest),
      loading: false,
      error: null,
      refetch: () => undefined,
    };
  }
  return {
    data: query.data,
    loading: query.isPending,
    error: query.error,
    refetch: () => {
      query.refetch();
    },
  };
}

export function useSpkDetail(id: number) {
  const local = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const query = useForecastQuery(spkKeys.detail(id), (signal) => getSpk(id, { signal }), {
    enabled: IS_API && id > 0,
  });
  if (!IS_API) {
    const spk = local.items.find((item) => item.id === id);
    return {
      data: spk,
      loading: false,
      error: spk ? null : new Error('SPK tidak ditemukan.'),
    };
  }
  return { data: query.data, loading: query.isPending, error: query.error };
}

// ---------------------------------------------------------------------- Ubah

function afterChange(spk: SpkDetail | null, id: number) {
  if (spk) setForecastData(spkKeys.detail(id), spk);
  invalidateForecast((key) => JSON.stringify(key) === JSON.stringify(spkKeys.list));
}

/** Aksi SPK; di mode simulasi memakai pengaturan versi aktif browser ini. */
export function useSpkActions() {
  const { settings, version } = useForecastSettings();

  const create = async (input: SpkCreateInput): Promise<SpkDetail> => {
    if (IS_API) {
      const spk = await createSpk(input);
      afterChange(spk, spk.id);
      return spk;
    }
    const errors: Record<string, string[]> = {};
    const add = (field: string, msg: string) => {
      errors[field] = [...(errors[field] ?? []), msg];
    };
    const kurir = input.kurir.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.tgl) || !dayjs(input.tgl).isValid())
      add('tgl', 'Format tanggal harus YYYY-MM-DD.');
    else if (input.tgl <= PERIOD.start)
      add('tgl', `Tanggal SPK harus setelah awal data (${PERIOD.start}).`);
    if (!kurir || kurir.length > 20) add('kurir', 'Isi kurir (maksimal 20 huruf).');
    if (!input.nits.length || input.nits.length > 300) add('nits', 'Pilih 1–300 toko.');
    if (new Set(input.nits).size !== input.nits.length)
      add('nits', 'Ada toko yang dipilih lebih dari sekali.');
    input.nits.forEach((nit) => {
      if (!storeMap.has(nit)) add('nits', `Toko ${nit} tidak ditemukan.`);
    });
    if (input.note.trim().length > 500) add('note', 'Catatan maksimal 500 huruf.');
    const state = getSnapshot();
    const dup = state.items.find((item) => item.tgl === input.tgl && item.kurir === kurir);
    if (dup)
      add(
        'tgl',
        `SPK kurir ${kurir} tanggal ${dayjs(input.tgl).format('DD/MM/YYYY')} sudah ada (#${dup.id}). Buka atau hapus draf itu dulu.`
      );
    if (Object.keys(errors).length)
      fail(dup ? errors.tgl![0]! : 'Data SPK belum valid.', 422, errors);

    const asOf = spkAsOf(input.tgl, PERIOD.end);
    const now = new Date().toISOString();
    const spk: SpkDetail = {
      id: state.nextId,
      tgl: input.tgl,
      kurir,
      status: 'draft',
      settingsVersion: version,
      dataAsOf: asOf,
      stores: input.nits,
      note: input.note.trim(),
      createdAt: now,
      updatedAt: now,
      finalizedAt: null,
      settings,
      lines: suggestSpk(forecastCells, input.nits, input.tgl, asOf, settings).map((s) => ({
        ...s,
        qty: s.suggested,
      })),
    };
    writeState({ nextId: state.nextId + 1, items: [spk, ...state.items] });
    return spk;
  };

  const update = async (id: number, body: { note?: string; lines: SpkEdit[] }) => {
    if (IS_API) {
      const spk = await updateSpk(id, body);
      afterChange(spk, id);
      return spk;
    }
    const spk = localDraft(id);
    const errors: Record<string, string[]> = {};
    body.lines.forEach((e, i) => {
      const msg = !spk.stores.includes(e.nit)
        ? `Toko ${e.nit} tidak ada di SPK ini.`
        : !PRODUCT_CODES.includes(e.product)
          ? `Kode roti "${e.product}" tidak dikenal.`
          : e.qty !== null && (e.qty < 0 || e.qty > MAX_QTY || !Number.isInteger(e.qty))
            ? `Jumlah harus 0–${MAX_QTY}.`
            : null;
      if (msg) errors[`lines.${i}`] = [msg];
    });
    if (Object.keys(errors).length) fail('Perubahan SPK tidak valid.', 422, errors);
    const lines = [...spk.lines];
    body.lines.forEach((e) => {
      const i = lines.findIndex((l) => l.nit === e.nit && l.product === e.product);
      if (i >= 0) lines[i] = { ...lines[i]!, qty: e.qty };
      else lines.push({ nit: e.nit, product: e.product, suggested: null, qty: e.qty, calc: null });
    });
    const pos = new Map(spk.stores.map((nit, i) => [nit, i]));
    lines.sort((a, b) => pos.get(a.nit)! - pos.get(b.nit)!);
    return localSave({
      ...spk,
      lines,
      note: body.note === undefined ? spk.note : body.note.trim(),
      updatedAt: new Date().toISOString(),
    });
  };

  const finalize = async (id: number) => {
    if (IS_API) {
      const spk = await finalizeSpk(id);
      afterChange(spk, id);
      return spk;
    }
    const spk = localDraft(id);
    const empty = spk.lines.filter((l) => l.qty === null).length;
    if (empty) {
      const msg = `${empty} jumlah roti masih kosong — isi dulu sebelum finalisasi.`;
      fail(msg, 422, { lines: [msg] });
    }
    const now = new Date().toISOString();
    return localSave({ ...spk, status: 'final', finalizedAt: now, updatedAt: now });
  };

  const remove = async (id: number) => {
    if (IS_API) {
      await deleteSpk(id);
      invalidateForecast((key) => key[1] === 'spk');
      return;
    }
    localDraft(id);
    const state = getSnapshot();
    writeState({ ...state, items: state.items.filter((item) => item.id !== id) });
  };

  /** Unduh CSV format Spk_*.csv klien (SPK final saja). */
  const download = async (spk: SpkDetail) => {
    const blob = IS_API
      ? await exportSpk(spk.id)
      : new Blob(
          [
            spkCsv(
              spk,
              (nit) => storeMap.get(nit)?.nama ?? '',
              (code) => productMap.get(code)?.hargaJual
            ),
          ],
          { type: 'text/csv;charset=utf-8' }
        );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = spkFileName(spk.kurir, spk.tgl);
    link.click();
    URL.revokeObjectURL(url);
  };

  return { create, update, finalize, remove, download, activeVersion: version };
}
