// ----------------------------------------------------------------------
// Envelope respons backend: { data, message, meta, errors }. Dipakai modul core
// (/core/v1/*) dan ai-forecast-be (/api/v1/forecast/*).

export type ApiEnvelope<T> = {
  data: T | null;
  message: string;
  meta: unknown | null;
  errors: string | null;
};

/** Ambil `data`; `data` kosong dianggap error. */
export async function unwrap<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const res = await promise;
  const payload = res.data;
  if (payload.data === null || payload.data === undefined) {
    throw new Error(payload.errors || payload.message || 'Empty response');
  }
  return payload.data;
}

/**
 * Ambil `data` apa adanya (boleh `null`) — untuk backend yang me-marshal list
 * kosong sebagai `null` (Go nil slice); validasi bentuknya di pemanggil (zod).
 */
export async function unwrapNullable<T>(
  promise: Promise<{ data: ApiEnvelope<T> }>
): Promise<T | null> {
  const res = await promise;
  return res.data.data ?? null;
}

// ----------------------------------------------------------------------
// Error yang dinormalisasi interceptor axios (src/shared/lib/axios.ts).

export type ApiError = Error & {
  /** Status HTTP; `undefined` untuk network error / timeout. */
  status?: number;
  /** Error validasi per field (mis. 422), kunci = nama field backend. */
  errors?: Record<string, string[]>;
};

export const apiErrorStatus = (error: unknown): number | undefined =>
  error instanceof Error ? (error as ApiError).status : undefined;

export const apiFieldErrors = (error: unknown): Record<string, string[]> | undefined =>
  error instanceof Error ? (error as ApiError).errors : undefined;
