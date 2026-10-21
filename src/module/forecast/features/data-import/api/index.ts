import type { AxiosProgressEvent } from 'axios';

import { z } from 'zod';

import axios from 'src/shared/lib/axios';
import { unwrapNullable } from 'src/shared/api';

// ----------------------------------------------------------------------
// Impor data — kontrak: ai-forecast-be/docs/api.md § Impor data. JSON
// snake_case dipetakan ke camelCase di sini.

export const importEndpoints = {
  kinds: '/api/v1/imports/kinds',
  list: '/api/v1/imports',
  preview: '/api/v1/imports/preview',
  detail: (id: number) => `/api/v1/imports/${id}`,
  commit: (id: number) => `/api/v1/imports/${id}/commit`,
} as const;

// Kunci cache di bawah 'forecast' supaya invalidateForecast() ikut memuat ulang.
export const importKeys = {
  kinds: ['forecast', 'import', 'kinds'] as const,
  history: ['forecast', 'import', 'history'] as const,
};

const list = <T extends z.ZodTypeAny>(item: T) =>
  z
    .array(item)
    .nullish()
    .transform((value) => (value ?? []) as z.output<T>[]);

const kindSchema = z.object({
  id: z.string(),
  label: z.string(),
  group: z.string(),
  order: z.number(),
  description: z.string(),
  targets: list(z.string()),
  required: list(z.string()),
  optional: list(z.string()),
  formats: z.string(),
});

// sheet: hanya diisi untuk file berisi beberapa sheet (ekspor database).
const sheetName = z
  .string()
  .nullish()
  .transform((value) => value ?? '');

const issueSchema = z.object({
  sheet: sheetName,
  row: z.number(),
  level: z.enum(['error', 'peringatan']),
  column: z.string(),
  message: z.string(),
});

const opSchema = z.object({
  sheet: sheetName,
  row: z.number(),
  table: z.string(),
  key: list(z.string()),
  label: z.string(),
  total: z.number().nullish(),
  status: z.enum(['baru', 'diperbarui', 'sama']),
  changes: list(z.object({ column: z.string(), old: z.string(), new: z.string() })),
});

const tableCountsSchema = z.object({ baru: z.number(), diperbarui: z.number(), sama: z.number() });

const batchSchema = z
  .object({
    id: z.number(),
    kind: z.string(),
    kind_label: z.string(),
    file_name: z.string(),
    status: z.enum(['preview', 'selesai']),
    detected: z.boolean().nullish(),
    total_rows: z.number(),
    valid_rows: z.number(),
    error_rows: z.number(),
    warning_rows: z.number(),
    inserted: z.number(),
    updated: z.number(),
    unchanged: z.number(),
    period_from: z.string().nullable(),
    period_to: z.string().nullable(),
    tables: z.record(z.string(), tableCountsSchema).nullish(),
    notes: list(z.string()),
    created_at: z.string(),
    committed_at: z.string().nullable(),
    issues: list(issueSchema),
    issues_total: z.number(),
    ops: list(opSchema),
    ops_total: z.number(),
  })
  .transform((raw) => ({
    id: raw.id,
    kind: raw.kind,
    kindLabel: raw.kind_label,
    fileName: raw.file_name,
    status: raw.status,
    /** Jenis data ditebak backend dari isi file (hanya di respons preview). */
    detected: raw.detected ?? false,
    totalRows: raw.total_rows,
    validRows: raw.valid_rows,
    errorRows: raw.error_rows,
    warningRows: raw.warning_rows,
    inserted: raw.inserted,
    updated: raw.updated,
    unchanged: raw.unchanged,
    periodFrom: raw.period_from,
    periodTo: raw.period_to,
    tables: raw.tables ?? {},
    notes: raw.notes,
    createdAt: raw.created_at,
    committedAt: raw.committed_at,
    issues: raw.issues,
    issuesTotal: raw.issues_total,
    ops: raw.ops,
    opsTotal: raw.ops_total,
  }));

export type ImportKind = z.output<typeof kindSchema>;
export type ImportIssue = z.output<typeof issueSchema>;
export type ImportOp = z.output<typeof opSchema>;
export type ImportBatch = z.output<typeof batchSchema>;

// ----------------------------------------------------------------------

const TIMEOUT = 10_000;
// Unggah + validasi file besar (ekspor database ±1 MB, ribuan baris).
const UPLOAD_TIMEOUT = 120_000;

type FetchOptions = { signal?: AbortSignal };

export async function getImportKinds({ signal }: FetchOptions = {}) {
  const data = await unwrapNullable<unknown>(
    axios.get(importEndpoints.kinds, { signal, timeout: TIMEOUT })
  );
  return list(kindSchema).parse(data);
}

export async function getImportHistory({ signal }: FetchOptions = {}) {
  const data = await unwrapNullable<unknown>(
    axios.get(importEndpoints.list, { signal, timeout: TIMEOUT })
  );
  return list(batchSchema).parse(data);
}

/**
 * Unggah file → batch preview. `kind` null = backend menebak jenis data dari
 * isi file. File ditolak / tidak dikenali → ApiError 422 (`errors.file` / `errors.kind`).
 */
export async function previewImport(
  kind: string | null,
  file: File,
  onProgress?: (percent: number) => void
) {
  const form = new FormData();
  if (kind) form.append('kind', kind);
  form.append('file', file);
  const data = await unwrapNullable<unknown>(
    axios.post(importEndpoints.preview, form, {
      // Instance default-nya JSON; multipart membuat axios meneruskan FormData
      // apa adanya dan browser mengisi boundary.
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
      onUploadProgress: (event: AxiosProgressEvent) => {
        if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100));
      },
    })
  );
  return batchSchema.parse(data);
}

export async function commitImport(id: number) {
  const data = await unwrapNullable<unknown>(
    axios.post(importEndpoints.commit(id), null, { timeout: UPLOAD_TIMEOUT })
  );
  return batchSchema.parse(data);
}
