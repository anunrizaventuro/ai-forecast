# Pattern: Feedback (Snackbar & Error Dialog)

Proyek ini pakai **sonner** untuk toast/snackbar (styled mengikuti Minimal UI) dan **ErrorDialog** untuk error modal.

## Keputusan arsitektural

**Snackbar (toast) untuk success/info** — imperative API, tidak pakai state lokal:
- Auto-dismiss, stack otomatis, non-blocking
- Satu mount global di [src/app.tsx](../../src/app.tsx) via `<Snackbar />`
- Call `toast.success('...')` / `toast.error('...')` / `toast.info('...')` / `toast.warning('...')` dari mana saja

**ErrorDialog untuk error aksi (submit, delete, save)** — blocking:
- User harus acknowledge dulu sebelum lanjut — mengurangi risiko abaikan
- Form/delete dialog tetap open agar user tidak kehilangan data → bisa retry setelah close error
- Portal, jadi aman di-render sebagai sibling di dalam dialog form

**Inline `<Alert>` hanya untuk page-level load error** (list/tree fetch fail saat first-load) — dialog overlay di atas empty page justru ganggu.

## Snackbar

### Mount (sudah di-set up)

[src/app.tsx](../../src/app.tsx) sudah mount `<Snackbar />` di dalam `<MotionLazy>`. Tidak perlu mount ulang di layout atau per feature.

### Call API

```tsx
import { toast } from 'src/shared/ui/snackbar';

// Success
toast.success(t('feedback.saved', { code: saved.code }));
toast.success(t('feedback.deleted'));

// Info
toast.info(t('feedback.queued'));

// Warning
toast.warning(t('feedback.partialSave'));

// Error (minor — untuk error yang tidak perlu acknowledgment)
toast.error(t('feedback.copyFailed'));

// Plain default (dark background)
toast('Saved to clipboard');

// Dengan description
toast.success('Tersimpan', { description: 'TRX-0001 sudah masuk ke antrian' });
```

Auto-dismiss 4s default. Max 4 toast visible. Posisi top-right, gap 12px, offset 16px.

### Untuk success/info → **selalu** pakai toast

```tsx
// ❌ Wrong — state lokal + Alert di atas list
const [feedback, setFeedback] = useState<{ type, message } | null>(null);
setFeedback({ type: 'success', message: t('feedback.saved') });
{feedback && <Alert severity={feedback.type}>{feedback.message}</Alert>}

// ✅ Correct — imperative, no state
toast.success(t('feedback.saved'));
```

### Untuk error aksi → **ErrorDialog**, bukan `toast.error`

Error dari submit/delete/approve/reject perlu acknowledgment + kadang panjang (validation detail). Pakai `<ErrorDialog>`.

`toast.error` boleh dipakai untuk error ringan non-critical: download gagal, copy ke clipboard gagal, dll. — kalau user-nya bisa abaikan.

## ErrorDialog

### Import & state

```tsx
import { useState } from 'react';
import { ErrorDialog } from 'src/shared/ui/error-dialog';

const [errorMsg, setErrorMsg] = useState<string | null>(null);
```

### Pattern di form dialog

Wrap return in Fragment — `ErrorDialog` sibling (bukan child) dari form `Dialog`, karena keduanya pakai Portal dan tidak boleh nested:

```tsx
return (
  <>
    <Dialog open={open} onClose={submitting ? undefined : onClose} ...>
      <DialogTitle>...</DialogTitle>
      <Form methods={methods} onSubmit={onSave} sx={{ display: 'contents' }}>
        <DialogContent dividers>
          {/* form fields — jangan render <Alert severity="error"> inline */}
        </DialogContent>
        <DialogActions>
          <Button type="submit" ...>Save</Button>
        </DialogActions>
      </Form>
    </Dialog>

    <ErrorDialog
      open={!!errorMsg}
      message={errorMsg ?? ''}
      onClose={() => setErrorMsg(null)}
    />
  </>
);
```

### onSubmit handler

```tsx
const onSave = handleSubmit(async (values) => {
  setErrorMsg(null);
  submitting.onTrue();
  try {
    const saved = await create(payload);
    onSaved(saved);  // parent biasanya panggil toast.success + close dialog
  } catch (err) {
    setErrorMsg(err instanceof Error ? err.message : t('form.saveFailed'));
  } finally {
    submitting.onFalse();
  }
});
```

### Pattern di confirm/delete dialog

Sama persis dengan form dialog — `<ErrorDialog>` sibling:

```tsx
return (
  <>
    <Dialog open={open} onClose={submitting ? undefined : onClose} maxWidth="xs" ...>
      <DialogTitle>{t('delete.title')}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2">{t('delete.message', { ... })}</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{tCommon('actions.cancel')}</Button>
        <Button onClick={onConfirm} color="error">{tCommon('actions.delete')}</Button>
      </DialogActions>
    </Dialog>

    <ErrorDialog open={!!errorMsg} message={errorMsg ?? ''} onClose={() => setErrorMsg(null)} />
  </>
);
```

### Cleanup on close

Reset `errorMsg` saat dialog ditutup untuk mencegah state stale di open berikutnya:

```tsx
useEffect(() => {
  if (!open) setErrorMsg(null);
}, [open]);
```

## End-to-end flow contoh

```tsx
// Parent view
const handleSaved = useCallback(
  (saved: Entity) => {
    invalidateCache();
    refresh();
    dialog.close();
    toast.success(t('feedback.saved', { code: saved.code }));  // ← success via toast
  },
  [dialog, refresh, t]
);

// Form dialog
const onSave = handleSubmit(async (values) => {
  try {
    const saved = await createEntity(values);
    onSaved(saved);  // parent show toast + close
  } catch (err) {
    setErrorMsg(err instanceof Error ? err.message : t('form.saveFailed'));  // ← error via dialog
  }
});
```

UX yang dihasilkan:
- Save sukses → form dialog close instan → toast hijau pojok kanan-atas (auto-dismiss)
- Save gagal → form dialog tetap open → error dialog muncul di atas → user close → form masih terisi → bisa adjust & retry

## Kapan pakai apa (quick ref)

| Kondisi | Tool |
|---|---|
| Save/update/delete **sukses** | `toast.success(...)` |
| Submit/approve/reject **sukses** | `toast.success(...)` |
| Save/update/delete **gagal** (action error) | `<ErrorDialog>` di form/confirm dialog |
| Download sukses | biasanya tidak perlu feedback (browser sudah handle) |
| Download/copy-to-clipboard **gagal** | `toast.error(...)` **atau** `<ErrorDialog>` (pilih salah satu — konsisten per feature) |
| List/tree/detail fetch gagal **first-load** | inline `<Alert severity="error">` di card |
| Reference data (useBranches, dll.) gagal | inline `<Alert>` atau toast, biasanya silent (fallback ke empty) |
| Validation error form | auto-tampil di `helperText` field (jangan duplicate ke Alert/toast) |

## Error message source

- BE error (HTTP 4xx/5xx): pakai `err.message` (sudah dinormalisasi di axios interceptor)
- Fallback: `t('form.saveFailed')` atau `t('errors.loadData')` — **semua via `t()`**, jangan hardcode
- Di hook (non-React scope): `i18n.t('namespace:errors.loadData')` — lihat [i18n.md](i18n.md)

## Komponen

| File | Peran |
|---|---|
| [src/shared/ui/snackbar/](../../src/shared/ui/snackbar/) | Sonner-based toast system, Minimal UI styled |
| [src/shared/ui/error-dialog/](../../src/shared/ui/error-dialog/) | Blocking error modal dengan ikon `solar:danger-triangle-bold` |

Snackbar di-mount 1× global di [src/app.tsx](../../src/app.tsx). `ErrorDialog` di-render per dialog yang butuh (form, delete, confirm).

## Sonner features lain

```tsx
// Dismiss specific toast
const id = toast.success('Processing...');
setTimeout(() => toast.dismiss(id), 2000);

// Dismiss all
toast.dismiss();

// Loading state (spinner icon, tidak auto-dismiss)
const id = toast.loading('Uploading...');
try {
  await upload();
  toast.success('Uploaded', { id });  // replace loading toast
} catch {
  toast.error('Failed', { id });
}

// Promise helper
toast.promise(uploadFile(), {
  loading: 'Uploading...',
  success: 'Uploaded',
  error: 'Failed to upload',
});

// Action button
toast.success('Deleted', {
  action: { label: 'Undo', onClick: () => restoreItem() },
});
```

Pakai dengan hemat — default `toast.success(message)` cukup untuk 90% kasus.

## Jangan

- ❌ State `feedback` lokal + `<Alert>` top banner — ganti dengan `toast.*`
- ❌ `<Alert severity="error">` inline di DialogContent — ganti dengan `<ErrorDialog>` sibling
- ❌ `<ErrorDialog>` nested di dalam `<Dialog>` — sibling sebagai Fragment child, keduanya portal
- ❌ `toast.error` untuk error submit/delete yang kritikal — pakai `<ErrorDialog>` supaya user acknowledge
- ❌ Hardcode message Bahasa/English — semua via `t()` atau `i18n.t()`
- ❌ Duplicate notification: toast + ErrorDialog sekaligus — pilih salah satu per skenario
- ❌ Mount `<Snackbar />` ulang di layout atau feature — sudah global di `app.tsx`
