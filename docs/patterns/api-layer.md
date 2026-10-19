# Pattern: API Layer

Semua network call lewat **satu shared axios instance** di [src/shared/lib/axios.ts](../../src/shared/lib/axios.ts). Feature module tidak boleh bikin axios instance baru.

## Response envelope standar

Semua endpoint BE return envelope ini:

```json
{
  "data": { ... } | [ ... ] | null,
  "message": "...",
  "meta": {
    "pagination": { "page": 1, "limit": 20, "total": 50, "total_pages": 3 },
    "counts": { "all": 50, "draft": 3, "waiting": 5, "posted": 40, "rejected": 2 }
  },
  "errors": "string" | { "detail": ["..."] } | null
}
```

- `meta` hanya ada di endpoint list (paginated)
- `meta.counts` opsional — BE boleh return per-status counts untuk badge tab/summary card. FE kontrak: ikut filter `date_from/date_to/search/branch_id` **tapi** tidak terpengaruh filter `status`
- `errors` object shape `{ detail: string[] }` untuk validation errors, string untuk error umum

## unwrap<T>() & unwrapList<T>()

Template di [src/module/core/features/auth/api/index.ts](../../src/module/core/features/auth/api/index.ts). Setiap feature salin/adaptasi:

```ts
import type { ApiEnvelope } from '../types';
import axios, { endpoints } from 'src/shared/lib/axios';

async function unwrap<T>(p: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const res = await p;
  const payload = res.data;
  if (payload.data === null || payload.data === undefined) {
    throw new Error(extractError(payload) ?? payload.message ?? 'Empty response');
  }
  return payload.data;
}

async function unwrapList<T>(
  p: Promise<{ data: ApiEnvelope<T[]> }>
): Promise<{ data: T[]; meta: ListMeta }> {
  const res = await p;
  const payload = res.data;
  const data = payload.data ?? [];
  const pagination = payload.meta?.pagination;
  const rawCounts = payload.meta?.counts;
  return {
    data,
    meta: {
      total: pagination?.total ?? data.length,
      page: pagination?.page ?? 1,
      limit: pagination?.limit ?? data.length,
      total_pages: pagination?.total_pages ?? 1,
      // Map BE `all` → FE `total` biar key konsisten di satu shape
      counts: rawCounts
        ? {
            total: rawCounts.all,
            draft: rawCounts.draft,
            waiting: rawCounts.waiting,
            posted: rawCounts.posted,
            rejected: rawCounts.rejected,
          }
        : undefined,
    },
  };
}

function extractError(payload: ApiEnvelope<unknown>): string | null {
  if (!payload.errors) return null;
  if (typeof payload.errors === 'string') return payload.errors;
  return payload.errors.detail?.[0] ?? null;
}
```

## Endpoint registration

**Jangan hardcode URL di feature.** Semua URL terdaftar di [src/shared/lib/axios.ts](../../src/shared/lib/axios.ts):

```ts
export const endpoints = {
  auth: { signIn: '/core/v1/auth/signin', ... },
  core: {
    branches: {
      list: '/core/v1/branches',
      byId: (id: string) => `/core/v1/branches/${id}`,
    },
    approvalRequests: {
      byDoc: '/core/v1/approval-requests/by-doc',
      approve: (id: string) => `/core/v1/approval-requests/${id}/approve`,
      ...
    },
    auditLogs: { root: '/core/v1/audit-logs' },
  },
  finance: {
    accounts: { list: '/finance/v1/accounts', ... },
    fundTransfers: {
      root: '/finance/v1/fund-transfers',
      byId: (id: string) => `/finance/v1/fund-transfers/${id}`,
      submit: '/finance/v1/fund-transfers/submit',
      submitById: (id: string) => `/finance/v1/fund-transfers/${id}/submit`,
      approve: (id: string) => `/finance/v1/fund-transfers/${id}/approve`,
      reject: (id: string) => `/finance/v1/fund-transfers/${id}/reject`,
      attachments: (id: string) => `/finance/v1/fund-transfers/${id}/attachments`,
      attachment: (id: string, aid: string) => `/finance/v1/fund-transfers/${id}/attachments/${aid}`,
    },
  },
} as const;
```

## Function signature conventions

```ts
// List — return { data, meta }
export function listFundTransfers(params: FundTransferListParams = {}): Promise<FundTransferListResponse> {
  return unwrapList<FundTransfer>(
    axios.get(endpoints.finance.fundTransfers.root, {
      params: {
        page: params.page,
        limit: params.limit,
        search: params.search || undefined,  // omit empty strings
        status: params.status || undefined,
      },
    })
  );
}

// Single — return unwrapped data
export function getFundTransfer(id: string): Promise<FundTransfer> {
  return unwrap<FundTransfer>(axios.get(endpoints.finance.fundTransfers.byId(id)));
}

// Create
export function createFundTransfer(payload: CreateFundTransferPayload): Promise<FundTransfer> {
  return unwrap<FundTransfer>(axios.post(endpoints.finance.fundTransfers.root, payload));
}

// Update
export function updateFundTransfer(id: string, payload: UpdateFundTransferPayload) {
  return unwrap<FundTransfer>(axios.put(endpoints.finance.fundTransfers.byId(id), payload));
}

// Delete — return { id } karena BE return data: null
export async function deleteFundTransfer(id: string): Promise<{ id: string }> {
  await axios.delete(endpoints.finance.fundTransfers.byId(id));
  return { id };
}

// Multipart upload (single file — per-attachment endpoint)
export function uploadAttachment(id: string, file: File): Promise<Attachment> {
  const formData = new FormData();
  formData.append('file', file);
  return unwrap<Attachment>(
    axios.post(endpoints.finance.fundTransfers.attachments(id), formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  );
}

// Multipart combined (create entity + attach files dalam 1 request)
// Pola: field `data` = JSON stringified payload, field `attachments` = files (repeated)
function buildCreateRequest(payload: CreatePayload, attachments?: File[] | null) {
  if (!attachments || attachments.length === 0) {
    return { body: payload, config: undefined };
  }
  const formData = new FormData();
  formData.append('data', JSON.stringify(payload));
  attachments.forEach((file) => formData.append('attachments', file));
  return { body: formData, config: { headers: { 'Content-Type': 'multipart/form-data' } } };
}

export function createFundTransfer(
  payload: CreateFundTransferPayload,
  attachments?: File[] | null
): Promise<FundTransfer> {
  const { body, config } = buildCreateRequest(payload, attachments);
  return unwrap<FundTransfer>(axios.post(endpoints.finance.fundTransfers.root, body, config));
}
```

> Multipart combined **hanya untuk CREATE**. Edit mode tetap immediate per-file via `POST/DELETE /:id/attachments/:attachmentId` — jangan bundling file ke PUT. Lihat [attachments.md](attachments.md).

### Varian: per-line attachment (cash-book style)

Cash-transactions punya lines — tiap line bisa punya file. BE bind pakai **Go form tag** (`form:"transaction_type"`, dst), bukan custom `data`-JSON parser seperti fund-transfer. Artinya header fields harus dikirim sebagai **individual form entries**, `lines` sebagai JSON string, dan files pakai naming `attachments_<N>` per-line index:

```ts
function buildCreateRequest(
  payload: CreateCashTransactionPayload,
  lineAttachments?: (File[] | null | undefined)[] | null
) {
  const hasAnyFiles = !!lineAttachments?.some((files) => files && files.length > 0);
  if (!hasAnyFiles) {
    return { body: payload, config: undefined };  // plain JSON, BE auto-binds from JSON body
  }
  const formData = new FormData();
  formData.append('branch_id', payload.branch_id);
  formData.append('transaction_type', payload.transaction_type);
  formData.append('transaction_date', payload.transaction_date);
  if (payload.description) formData.append('description', payload.description);
  formData.append('cash_account_id', payload.cash_account_id);
  formData.append('lines', JSON.stringify(payload.lines));  // JSON string — BE unmarshal manually
  lineAttachments?.forEach((files, lineIdx) => {
    if (!files || files.length === 0) return;
    files.forEach((file) => formData.append(`attachments_${lineIdx}`, file));
  });
  return { body: formData, config: { headers: { 'Content-Type': 'multipart/form-data' } } };
}
```

**Symptom kalau pakai `data` JSON blob di sini:** BE return `400 Invalid request payload` dengan error spesifik Go validator:
```
"Key: 'CreateCashTransactionRequest.TransactionType' Error:Field validation for 'TransactionType' failed on the 'required' tag"
```
Artinya BE's form-binder cari `transaction_type` sebagai top-level form field — tidak menggali `data` blob.

**Intinya:** fund-transfer vs cash-transactions contract berbeda. Konfirmasi ke BE dev sebelum copy-paste `buildCreateRequest` antar feature.

## Resubmit endpoint — echo-back full payload

BE kontrak `POST /:id/submit` biasanya **"replace all header fields"** (ganti semua field header dari request body, bukan merge). Kalau FE quick-submit dari row/detail tanpa edit, tetap harus kirim payload lengkap dari state terakhir — **jangan kirim `{}`**.

```ts
// ❌ Wrong — BE replace header dengan payload kosong, validasi 400
axios.post(endpoints.finance.fundTransfers.submitById(id), {});

// ✅ Correct — echo back field dari transfer yang sudah di-load (list row / detail)
export function submitFundTransfer(transfer: FundTransfer): Promise<FundTransfer> {
  const payload: CreatePayload = {
    transfer_date: transfer.transfer_date.slice(0, 10),
    description: transfer.description ?? '',
    from_account_id: transfer.from_account_id,
    // ... semua field header
    amount: transfer.amount,
  };
  return unwrap<FundTransfer>(
    axios.post(endpoints.finance.fundTransfers.submitById(transfer.id), payload)
  );
}
```

Signature terima entity (bukan id) — caller sudah punya object dari list/detail, hemat fetch ulang.

## List-only fields (seed pattern)

Beberapa field cuma dikirim BE di endpoint **List** (mis. `created_by_name`, join hasil denormalisasi). Endpoint **Get by ID** sering lebih minimal — kalau detail dialog ingin tampil field list-only, pass entity row dari list sebagai `seed`:

```tsx
// Type — field list-only ditandai optional
type FundTransfer = {
  id: string;
  ...
  created_by: string | null;           // UUID — selalu ada
  created_by_name?: string | null;     // hanya di List response
};

// Detail dialog — terima seed sebagai fallback
type Props = {
  transferId: string | null;
  seed?: FundTransfer | null;  // dari list row
  ...
};

<DetailItem value={data.created_by_name ?? seed?.created_by_name ?? '—'} />

// List view — pass row saat open detail
<FundTransferDetailDialog
  transferId={dialog.id}
  seed={data.find((t) => t.id === dialog.id) ?? null}
  ...
/>
```

Kalau user akses detail via deep-link (tanpa list), `seed` = null → tampil `—`. Ini acceptable karena endpoint Get by ID yang batasi.

## Query params cleanup

Selalu `|| undefined` untuk string params supaya empty string tidak terkirim:

```ts
// ❌ Wrong — mengirim ?search= (empty string)
{ params: { search: params.search } }

// ✅ Correct — tidak mengirim param sama sekali jika kosong
{ params: { search: params.search || undefined } }
```

Untuk boolean, `params.is_active` langsung karena `false` valid:

```ts
{ params: { is_active: params.is_active } }
```

## Error handling

Shared axios interceptor di `axios.ts` menormalisasi error ke `Error` dengan `.status` dan message. Pemanggil tinggal catch. **Fallback message harus via i18n**:

```ts
// Di React component — pakai useTranslate
const { t } = useTranslate('fund-transfer');

try {
  const data = await createFundTransfer(payload);
} catch (err) {
  const status = (err as Error & { status?: number }).status;
  if (status === 404) {
    // handle not found
  } else {
    setErrorMsg(err instanceof Error ? err.message : t('form.saveFailed'));
  }
}

// Di hook non-React — import i18n langsung
import i18n from 'i18next';

catch (err) {
  setState({
    ...state,
    error: err instanceof Error ? err.message : i18n.t('fund-transfer:errors.loadData'),
  });
}
```

`err.message` dari BE dipakai apa adanya (BE tanggung jawab kirim message yang benar). Fallback `t()` hanya kepakai kalau exception bukan `Error` instance (rare).

## Custom header override

```ts
import { withoutAuthRefresh } from 'src/shared/lib/axios';

// Bypass auth refresh retry untuk refresh endpoint itself
axios.post(endpoints.auth.refresh, { refresh_token }, withoutAuthRefresh());
```

## Contoh endpoint authenticated vs public

Semua endpoint otomatis dapat `Authorization: Bearer <token>` dari interceptor, kecuali yang pakai `withoutAuthRefresh()`.

## Jangan

- ❌ `fetch()` native — selalu axios shared
- ❌ `new AxiosInstance()` di feature — pakai shared
- ❌ Hardcode URL string di feature — pakai `endpoints.*`
- ❌ `res.data.data` langsung — pakai `unwrap<T>()` supaya konsisten error handling
- ❌ Hardcode error fallback message — pakai `t()` (component) atau `i18n.t()` (hook). Lihat [i18n.md](i18n.md)
