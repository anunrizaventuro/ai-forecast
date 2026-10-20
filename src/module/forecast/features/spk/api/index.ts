import type {
  SpkEdit,
  SpkCalc,
  SpkLine,
  SpkDetail,
  SpkHeader,
  SpkSummary,
} from 'src/module/forecast/shared/types';

import { z } from 'zod';

import axios from 'src/shared/lib/axios';
import { unwrapNullable } from 'src/shared/api';
import { productCode, settingsParamsSchema } from 'src/module/forecast/shared/api';

// ----------------------------------------------------------------------
// SPK draf → final — kontrak: ai-forecast-be/docs/api.md § SPK. JSON
// snake_case dipetakan ke camelCase di sini.

export const spkEndpoints = {
  list: '/api/v1/spk',
  detail: (id: number) => `/api/v1/spk/${id}`,
  finalize: (id: number) => `/api/v1/spk/${id}/finalize`,
  export: (id: number) => `/api/v1/spk/${id}/export`,
} as const;

// Kunci cache di bawah 'forecast' supaya invalidateForecast() ikut memuat ulang.
export const spkKeys = {
  list: ['forecast', 'spk', 'list'] as const,
  detail: (id: number) => ['forecast', 'spk', 'detail', id] as const,
};

const list = <T extends z.ZodTypeAny>(item: T) =>
  z
    .array(item)
    .nullish()
    .transform((value) => (value ?? []) as z.output<T>[]);

const calcSchema = z
  .object({
    status: z.enum(['otomatis', 'belum-cukup']),
    observations: z.number(),
    last_visit: z.string(),
    last_kirim: z.number(),
    last_stock: z.number(),
    days_since: z.number(),
    sold_per_day: z.number().nullable(),
    need: z.number().nullable(),
    remaining: z.number().nullable(),
    usable: z.number().nullable(),
    raw: z.number().nullable(),
    step: z.number(),
    bs_capped: z.boolean(),
    bs_rate: z.number().nullable(),
    limited: z.number().nullable(),
    capped: z.boolean(),
    risk: z.enum(['kelebihan', 'kekurangan', 'wajar', 'belum-cukup']),
  })
  .transform(
    (c): SpkCalc => ({
      status: c.status,
      observations: c.observations,
      lastVisit: c.last_visit,
      lastKirim: c.last_kirim,
      lastStock: c.last_stock,
      daysSince: c.days_since,
      soldPerDay: c.sold_per_day,
      need: c.need,
      remaining: c.remaining,
      usable: c.usable,
      raw: c.raw,
      step: c.step,
      bsCapped: c.bs_capped,
      bsRate: c.bs_rate,
      limited: c.limited,
      capped: c.capped,
      risk: c.risk,
    })
  );

const lineSchema = z
  .object({
    nit: z.string(),
    product: productCode,
    suggested: z.number().nullable(),
    qty: z.number().nullable(),
    calc: calcSchema.nullable(),
  })
  .transform((l): SpkLine => l);

const headerShape = {
  id: z.number(),
  tgl: z.string(),
  kurir: z.string(),
  status: z.enum(['draft', 'final']),
  settings_version: z.number(),
  data_as_of: z.string(),
  stores: list(z.string()),
  note: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  finalized_at: z.string().nullable(),
};

type RawHeader = z.output<z.ZodObject<typeof headerShape>>;

const toHeader = (h: RawHeader): SpkHeader => ({
  id: h.id,
  tgl: h.tgl,
  kurir: h.kurir,
  status: h.status,
  settingsVersion: h.settings_version,
  dataAsOf: h.data_as_of,
  stores: h.stores,
  note: h.note,
  createdAt: h.created_at,
  updatedAt: h.updated_at,
  finalizedAt: h.finalized_at,
});

const summarySchema = z
  .object({
    ...headerShape,
    line_count: z.number(),
    empty_count: z.number(),
    total_qty: z.number(),
  })
  .transform(
    (s): SpkSummary => ({
      ...toHeader(s),
      lineCount: s.line_count,
      emptyCount: s.empty_count,
      totalQty: s.total_qty,
    })
  );

const detailSchema = z
  .object({ ...headerShape, lines: list(lineSchema), settings: settingsParamsSchema })
  .transform((d): SpkDetail => ({ ...toHeader(d), lines: d.lines, settings: d.settings }));

// ----------------------------------------------------------------------

const TIMEOUT = 15_000;

type FetchOptions = { signal?: AbortSignal };

export type SpkCreateInput = { tgl: string; kurir: string; nits: string[]; note: string };

export async function getSpkList({ signal }: FetchOptions = {}) {
  const data = await unwrapNullable<unknown>(
    axios.get(spkEndpoints.list, { signal, timeout: TIMEOUT })
  );
  return list(summarySchema).parse(data);
}

export async function getSpk(id: number, { signal }: FetchOptions = {}) {
  const data = await unwrapNullable<unknown>(
    axios.get(spkEndpoints.detail(id), { signal, timeout: TIMEOUT })
  );
  return detailSchema.parse(data);
}

/** 422 → ApiError.errors per field (`tgl`, `kurir`, `nits`, `note`). */
export async function createSpk(input: SpkCreateInput) {
  const data = await unwrapNullable<unknown>(
    axios.post(spkEndpoints.list, input, { timeout: TIMEOUT })
  );
  return detailSchema.parse(data);
}

export async function updateSpk(id: number, body: { note?: string; lines: SpkEdit[] }) {
  const data = await unwrapNullable<unknown>(
    axios.put(spkEndpoints.detail(id), body, { timeout: TIMEOUT })
  );
  return detailSchema.parse(data);
}

export async function finalizeSpk(id: number) {
  const data = await unwrapNullable<unknown>(
    axios.post(spkEndpoints.finalize(id), null, { timeout: TIMEOUT })
  );
  return detailSchema.parse(data);
}

export async function deleteSpk(id: number) {
  await axios.delete(spkEndpoints.detail(id), { timeout: TIMEOUT });
}

/** File CSV SPK final (format Spk_*.csv klien). */
export async function exportSpk(id: number) {
  const res = await axios.get<Blob>(spkEndpoints.export(id), {
    responseType: 'blob',
    timeout: TIMEOUT,
  });
  return res.data;
}
