# Pattern: Attachment Upload

Feature yang butuh file upload pakai komponen reusable + hook di fund-transfer. Promosi ke `src/shared/ui/` kalau feature kedua butuh.

## Komponen

| File | Fungsi |
|---|---|
| [attachment-grid.tsx](../../src/module/finance/features/fund-transfer/components/attachment-grid.tsx) | Grid tiles + drag-drop add tile + hover actions |
| [attachment-preview-dialog.tsx](../../src/module/finance/features/fund-transfer/components/attachment-preview-dialog.tsx) | Fullscreen preview (image/PDF) dengan gallery navigation |
| [use-attachments.ts](../../src/module/finance/features/fund-transfer/hooks/use-attachments.ts) | State management + API integration |

## UX flow

```
User open "New Transfer" dialog
  → pilih file (drag atau klik)
  → file muncul dengan dashed border (pending — buffered lokal, belum uploaded)

Klik "Simpan Draft" atau "Simpan & Submit"
  → SATU request multipart: field `data` (JSON) + field `attachments` (files)
  → BE create entity + simpan files atomic (1 roundtrip)
  → dialog close

User buka transfer existing untuk edit
  → file existing muncul dengan solid border
  → tambah file baru → IMMEDIATE upload per-file via POST /:id/attachments
  → delete file → IMMEDIATE delete via DELETE /:id/attachments/:aid
  → tombol Simpan cuma commit field header, attachments sudah persist

Hover file → tombol Preview (eye) + Delete (trash) muncul
Klik Preview → full-screen dialog + navigasi gallery
Klik Delete → confirm dialog → API call → tile hilang
```

**Kunci hybrid timing:**
- **New mode**: buffer lokal → bundle ke multipart combined saat save (1 request).
- **Edit mode**: immediate per-file — jangan bundle ke PUT. User expect file tersimpan saat drop, tidak nunggu tombol Simpan.

## useAttachments hook API

```ts
const attachments = useAttachments({
  transferId: mode === 'edit' ? transferId : null,
  enabled: open,
  initialExisting: initialValue?.attachments,  // seed dari entity fetch, skip refetch
});

// Return shape
{
  existing: Attachment[],         // dari BE
  pending: File[],                 // buffer lokal (mode new)
  uploading: boolean,              // ada upload on-flight
  error: string | null,            // last error
  addFiles: (files: File[]) => Promise<void>,          // immediate upload (edit) atau buffer (new)
  removePending: (index: number) => void,              // hapus 1 file dari buffer
  clearPending: () => void,                            // kosongkan buffer (setelah multipart combined sukses)
  deleteExisting: (att: Attachment) => Promise<void>,  // API delete + local remove
  flushPending: (id: string) => Promise<void>,         // fallback: upload buffer sequential via endpoint per-file
  refresh: () => Promise<void>,
  reset: () => void,
}
```

## Integrasi di form dialog

```tsx
const attachments = useAttachments({
  transferId: mode === 'edit' ? transferId : null,
  enabled: open,
  initialExisting: initialValue?.attachments,
});

// Reset saat dialog close
useEffect(() => {
  if (!open) attachments.reset();
}, [open]);

const performSave = async (values, submitAfter) => {
  const payload = { ... };
  let saved;

  if (mode === 'new') {
    // Multipart combined — 1 request create + upload
    const pendingFiles = attachments.pending.length > 0 ? attachments.pending : null;
    saved = submitAfter
      ? await createAndSubmitFundTransfer(payload, pendingFiles)
      : await createFundTransfer(payload, pendingFiles);
    if (pendingFiles) attachments.clearPending();
  } else {
    // Edit mode — file sudah ter-upload langsung via useAttachments
    // PUT hanya commit field header
    saved = submitAfter
      ? await updateAndSubmitFundTransfer(id, payload)
      : await updateFundTransfer(id, payload);
  }

  onSaved(saved);
};

// Render di form — label via t()
<Box>
  <Typography variant="subtitle2">{t('form.attachmentsTitle')}</Typography>
  {attachments.error && <Alert severity="error">{attachments.error}</Alert>}
  <AttachmentGrid
    existing={attachments.existing}
    pending={attachments.pending}
    uploading={attachments.uploading}
    onAddFiles={(files) => attachments.addFiles(files)}
    onRemovePending={attachments.removePending}
    onDeleteExisting={attachments.deleteExisting}
  />
  <Typography variant="caption">{t('form.attachmentsHint')}</Typography>
</Box>
```

## Integrasi di detail dialog (read-only)

Dari entity response, attachments ada di `data.attachments`. Pass ke grid dengan `readOnly`:

```tsx
{data.attachments && data.attachments.length > 0 && (
  <Box sx={{ gridColumn: { md: 'span 2' } }}>
    <Typography variant="caption">
      {t('detail.attachmentsWithCount', { count: data.attachments.length })}
    </Typography>
    <AttachmentGrid existing={data.attachments} readOnly />
  </Box>
)}
```

`readOnly` hide add tile, disable delete button. Preview tetap work.

## Confirm dialog sebelum delete

Dialog konfirmasi built-in di `AttachmentGrid`:
- Klik trash → buka confirm dialog dengan nama file
- Confirm → panggil `onDeleteExisting(attachment)`
- Cancel → close dialog, no action

Pending file (belum ter-upload) **tidak pakai confirm** — user klik X top-right langsung remove dari buffer.

## API endpoints (BE contract)

Dua endpoint utama:

```
# Combined create — 1 request: entity + files
POST   /finance/v1/{feature}                           # multipart { data, attachments[] }
POST   /finance/v1/{feature}/submit                    # multipart { data, attachments[] }

# Per-file (dipakai di edit mode — immediate)
POST   /finance/v1/{feature}/:id/attachments           # multipart { file }
GET    /finance/v1/{feature}/:id/attachments           # list
DELETE /finance/v1/{feature}/:id/attachments/:attachmentId
```

Endpoint create utama accept **JSON biasa** (tanpa file) **atau** multipart (dengan file). Helper `buildCreateRequest` di API layer yang decide. Lihat [api-layer.md](api-layer.md#multipart-upload).

Registrasi di `shared/lib/axios.ts`:
```ts
attachments: (id: string) => `/finance/v1/{feature}/${id}/attachments`,
attachment: (id: string, aid: string) => `/finance/v1/{feature}/${id}/attachments/${aid}`,
```

## File type & validation

Client-side filter di `AttachmentGrid`:
```ts
const ACCEPT = 'image/jpeg,image/png,image/gif,image/webp,application/pdf';
```

Drag-drop dan file picker hanya terima MIME types ini. Invalid files silently di-drop.

**Size limit**: belum ada client-side — trust BE. Kalau perlu UX untuk "file too large" error, tambahkan di hook saat upload fail.

## Preview dialog

Gallery mode — prev/next via:
- Panah kiri/kanan di sisi dialog (IconButton absolute)
- Keyboard `←` `→` (registered di useEffect saat open)
- Counter `1 / 5` di title kalau multi-file

Image → `<img src={url} />` dengan `max-h-[70vh]`
PDF → `<iframe src={url} />` full width × 70vh (native browser PDF viewer)

## Varian per-line attachment (cash-book)

Cash-transactions simpan file **per-line** (bukan per-transaction). Bucket keyed by line — baik `serverId` (line yang sudah di-BE) atau `fieldKey` (line baru, di-generate di FE).

```ts
// src/module/finance/features/cash-transactions/hooks/use-line-attachments.ts
const attachments = useLineAttachments({ transactionId });

// Pass ke line dialog via state bucket:
const bucket = attachments.get(fieldKey);
<AttachmentGrid
  existing={bucket.existing}
  pending={bucket.pending}
  onAddFiles={(files) => attachments.addFiles(fieldKey, files, serverId)}
  onRemovePending={(idx) => attachments.removePending(fieldKey, idx)}
  onDeleteExisting={(att) => attachments.deleteExisting(fieldKey, att)}
/>
```

Dua mode upload otomatis:
- **Immediate** — `transactionId` + `serverId` lengkap → upload langsung ke `POST /:id/lines/:lineId/attachments`
- **Buffered** — kalau salah satu null → files masuk ke `pending[]` bucket, dikirim bareng multipart combined saat `performSave`

Saat submit combined, parent drain tiap bucket sesuai urutan line:
```ts
const pendingPerLine = attachments.getPendingByOrderedKeys(
  values.lines.map((l) => l.fieldKey)
);
saved = await createCashTransaction(corePayload, pendingPerLine);
attachments.clearPending();
```

BE terima via field `attachments_<N>` per-line index — lihat [api-layer.md § varian per-line](api-layer.md#varian-per-line-attachment-cash-book-style).

**Cancel add line** — parent HARUS panggil `attachments.clearPending(fieldKey)` sebelum close dialog, supaya tidak ada orphan bucket.

## Icon UX (table row)

Pattern ini dipakai di [multiline-form.md](multiline-form.md) — singkatnya:
- **Form dialog (editable row):** icon attachment **selalu tampil** di kolom actions. Disabled (tooltip "Belum ada lampiran") saat count 0. Klik → `AttachmentPreviewDialog` dengan items = `existing + pending` (pending pakai `URL.createObjectURL`) mulai index 0.
- **Detail dialog (read row):** icon render **hanya kalau ada** lampiran, taruh **sebelum deskripsi** di kolom description. Klik → preview index 0. **Jangan** render grid thumbnail inline — terlalu padat.

Keduanya pakai `AttachmentPreviewDialog` yang sudah ada di feature folder.

## Reuse untuk feature lain

Saat ini di `fund-transfer/components/` (flat) dan `cash-transactions/components/` (per-line). Kalau feature ketiga butuh, pilihan:

1. **Copy-paste & adaptasi** — kalau behavior berbeda (mis. per-entity vs per-line)
2. **Promote ke `src/shared/ui/attachments/`** — kalau behaviour identik. Pindahkan + update import.

`useAttachments` / `useLineAttachments` coupled ke API feature — promote juga perlu inject API client (atau buat generic wrapper).

## i18n

`AttachmentGrid` sudah pakai `t()` internal (`attachment.addOrDrag`, `attachment.deleteTitle`, `attachment.previewPrev/Next`, `attachment.deleteConfirm` dengan `<Trans>` untuk `<strong>{fileName}</strong>`). `useAttachments` hook pakai `i18n.t('fund-transfer:errors.loadAttachments|uploadAttachment|deleteAttachment')` sebagai error fallback. Saat feature baru bikin attachment, reuse key-nya dari namespace `fund-transfer` atau tambah key sepadan di namespace feature baru.

## Jangan

- ❌ Upload sebelum entity create — pasti 404 karena `{id}` belum ada
- ❌ Skip flush/bundling pending saat save — file hilang tanpa trace
- ❌ Bundle file ke PUT update (edit mode) — user expect file langsung tersimpan saat drop, bukan pas klik Simpan
- ❌ Lupa `clearPending()` setelah multipart combined sukses — pending tetap di state, bisa re-upload saat user edit lagi
- ❌ Pakai `FileReader` untuk preview image — `URL.createObjectURL` jauh lebih efisien
- ❌ Lupa revoke object URL — memory leak (sudah di-handle by `useFilePreview`)
