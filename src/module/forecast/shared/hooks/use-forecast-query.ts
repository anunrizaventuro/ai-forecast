import axios from 'axios';
import { useRef, useState, useEffect, useCallback } from 'react';

import { apiErrorStatus } from 'src/shared/api';

// ----------------------------------------------------------------------
// Cache query kecil untuk data forecast (pengganti TanStack Query — skeleton
// tidak memakainya). Perilaku yang dipertahankan dari versi Next:
// - data terakhir tetap tampil selama key berubah (setara keepPreviousData);
// - request per key di-dedupe; request yang sudah tidak dibutuhkan di-abort
//   dan hasilnya dibuang, jadi respons basi tidak menimpa filter terbaru;
// - invalidateForecast() memuat ulang hook yang sedang tampil (mis. setelah
//   Pengaturan disimpan).
// Data di cache dianggap segar sampai di-invalidate atau refetch() manual.

type Key = readonly unknown[];

type Flight = { promise: Promise<unknown>; controller: AbortController; refs: number };

type Entry = {
  key: Key;
  hasData: boolean;
  data?: unknown;
  /** Error yang di-cache (lihat opsi `cacheError`); dibersihkan oleh refetch/invalidate. */
  error?: Error;
  flight?: Flight;
};

const entries = new Map<string, Entry>();
const listeners = new Map<string, Set<() => void>>();

const entryOf = (keyString: string, key: Key): Entry => {
  let entry = entries.get(keyString);
  if (!entry) {
    entry = { key, hasData: false };
    entries.set(keyString, entry);
  }
  return entry;
};

const notify = (keyString: string) => listeners.get(keyString)?.forEach((listener) => listener());

export type RetryFn = (failureCount: number, error: Error) => boolean;

// Sekali ulang untuk network error / 5xx; error klien (4xx) tidak diulang.
const defaultRetry: RetryFn = (count, error) => {
  const status = apiErrorStatus(error);
  return count < 1 && !(status !== undefined && status >= 400 && status < 500);
};

async function withRetry<T>(
  run: () => Promise<T>,
  retry: RetryFn,
  signal: AbortSignal
): Promise<T> {
  for (let count = 0; ; count += 1) {
    try {
      return await run();
    } catch (error) {
      if (signal.aborted || axios.isCancel(error) || !retry(count, error as Error)) throw error;
    }
  }
}

/** Ikut request in-flight untuk key ini (atau mulai baru); `release` saat tak dibutuhkan. */
function acquire<T>(
  keyString: string,
  key: Key,
  fetcher: (signal: AbortSignal) => Promise<T>,
  retry: RetryFn
) {
  const entry = entryOf(keyString, key);

  if (!entry.flight) {
    const controller = new AbortController();
    const flight: Flight = { controller, refs: 0, promise: Promise.resolve() };
    flight.promise = withRetry(() => fetcher(controller.signal), retry, controller.signal)
      .then((data) => {
        if (entry.flight === flight) {
          entry.data = data;
          entry.hasData = true;
        }
        return data;
      })
      .finally(() => {
        if (entry.flight === flight) entry.flight = undefined;
      });
    entry.flight = flight;
  }

  const flight = entry.flight;
  flight.refs += 1;

  return {
    promise: flight.promise as Promise<T>,
    release: () => {
      flight.refs -= 1;
      // Tidak ada lagi yang menunggu → batalkan request.
      if (flight.refs === 0 && entry.flight === flight) {
        flight.controller.abort();
        entry.flight = undefined;
      }
    },
  };
}

/** Hapus cache yang cocok lalu muat ulang hook yang sedang menampilkannya. */
export function invalidateForecast(predicate: (key: Key) => boolean = () => true) {
  entries.forEach((entry, keyString) => {
    if (!predicate(entry.key)) return;
    entry.hasData = false;
    entry.data = undefined;
    entry.error = undefined;
    if (entry.flight) {
      entry.flight.controller.abort();
      entry.flight = undefined;
    }
    notify(keyString);
  });
}

/** Isi cache langsung (mis. dari respons PUT) dan sinkronkan hook yang tampil. */
export function setForecastData(key: Key, data: unknown) {
  const keyString = JSON.stringify(key);
  const entry = entryOf(keyString, key);
  entry.data = data;
  entry.hasData = true;
  entry.error = undefined;
  notify(keyString);
}

// ----------------------------------------------------------------------

export type ForecastQueryOptions = {
  enabled?: boolean;
  retry?: RetryFn;
  /**
   * Error yang lolos predikat ini disimpan di cache: mount berikutnya langsung
   * memakai error itu tanpa request ulang (sampai refetch/invalidate). Untuk error
   * yang pasti berulang, mis. 404 endpoint yang belum ada.
   */
  cacheError?: (error: Error) => boolean;
};

export type ForecastQueryResult<T> = {
  data: T | undefined;
  /** Belum pernah ada data dan belum gagal (muat pertama). */
  isPending: boolean;
  /** Sedang mengambil; data lama tetap dikembalikan. */
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
};

// `errorKey` = key tempat error terjadi; error key lama tidak ikut ke key baru
// (setara RQ: key baru mulai tanpa error, data lama tetap tampil).
type State<T> = {
  data: T | undefined;
  error: Error | null;
  errorKey: string | null;
  fetching: boolean;
};

export function useForecastQuery<T>(
  key: Key,
  fetcher: (signal: AbortSignal) => Promise<T>,
  { enabled = true, retry = defaultRetry, cacheError }: ForecastQueryOptions = {}
): ForecastQueryResult<T> {
  const keyString = JSON.stringify(key);

  const [state, setState] = useState<State<T>>(() => {
    const entry = entries.get(keyString);
    return {
      data: entry?.hasData ? (entry.data as T) : undefined,
      error: entry?.error ?? null,
      errorKey: entry?.error ? keyString : null,
      fetching: false,
    };
  });
  // Dinaikkan untuk memaksa effect fetch berjalan lagi (refetch / invalidate).
  const [nonce, setNonce] = useState(0);

  const fetcherRef = useRef(fetcher);
  const retryRef = useRef(retry);
  const cacheErrorRef = useRef(cacheError);
  const keyRef = useRef(key);
  useEffect(() => {
    fetcherRef.current = fetcher;
    retryRef.current = retry;
    cacheErrorRef.current = cacheError;
    keyRef.current = key;
  });

  useEffect(() => {
    const listener = () => setNonce((n) => n + 1);
    const set = listeners.get(keyString) ?? new Set();
    set.add(listener);
    listeners.set(keyString, set);
    return () => {
      set.delete(listener);
      if (set.size === 0) listeners.delete(keyString);
    };
  }, [keyString]);

  useEffect(() => {
    if (!enabled) return undefined;

    const entry = entries.get(keyString);
    if (entry?.hasData) {
      // State awal sudah dibaca dari cache — jangan paksa render ulang tanpa perubahan.
      setState((prev) =>
        prev.data === entry.data && !prev.fetching && prev.error === null
          ? prev
          : { data: entry.data as T, error: null, errorKey: null, fetching: false }
      );
      return undefined;
    }
    if (entry?.error) {
      const cached = entry.error;
      setState((prev) =>
        prev.error === cached && prev.errorKey === keyString && !prev.fetching
          ? prev
          : { data: prev.data, error: cached, errorKey: keyString, fetching: false }
      );
      return undefined;
    }

    let active = true;
    setState((prev) => ({
      ...prev,
      fetching: true,
      // Refetch key yang sama mempertahankan error-nya; key baru mulai bersih.
      ...(prev.errorKey !== keyString && { error: null, errorKey: null }),
    }));

    const { promise, release } = acquire(
      keyString,
      keyRef.current,
      fetcherRef.current,
      retryRef.current
    );
    promise.then(
      (data) => {
        if (active) setState({ data, error: null, errorKey: null, fetching: false });
      },
      (error: unknown) => {
        if (axios.isCancel(error)) return;
        if (cacheErrorRef.current?.(error as Error)) {
          entryOf(keyString, keyRef.current).error = error as Error;
        }
        if (!active) return;
        setState((prev) => ({
          data: prev.data,
          error: error as Error,
          errorKey: keyString,
          fetching: false,
        }));
      }
    );

    return () => {
      active = false;
      release();
    };
  }, [keyString, enabled, nonce]);

  const refetch = useCallback(() => {
    const entry = entries.get(keyString);
    if (entry) {
      entry.hasData = false;
      entry.error = undefined;
    }
    setNonce((n) => n + 1);
  }, [keyString]);

  return {
    data: state.data,
    isPending: enabled && state.data === undefined && state.error === null,
    isFetching: enabled && state.fetching,
    error: enabled ? state.error : null,
    refetch,
  };
}
