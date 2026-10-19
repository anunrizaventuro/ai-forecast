# Conventions

Ringkasan aturan main. Detail per topik di [patterns/](patterns/).

## Stack & Tools

- Vite 7 + React 19 + React Router 7 (data router)
- MUI v7 + Emotion, `sx` prop convention (bukan Tailwind)
- React Hook Form + Zod (bukan Formik)
- Axios shared instance (bukan fetch, SWR, React Query)
- Dayjs untuk date manipulation
- `yarn` (v1) package manager, Node ≥22
- **Tidak ada test runner** — jangan bikin `npm test`

## Module Layout

```
src/module/{core|finance}/features/{feature-name}/
├── api/              # axios calls + unwrap<T> helper
├── components/       # UI components spesifik feature
├── hooks/            # custom hooks (state, cache, mutation)
├── pages/            # thin route wrapper: title + <View />
├── types/            # TS types + API envelope shape
├── views/            # main UI composition per route
└── utils/            # formatters, mock, helpers
```

Lihat [patterns/feature-module.md](patterns/feature-module.md) untuk detail.

## Core Conventions

### Import paths

- Selalu `src/...` (alias), jangan `../../../`
- ESLint `perfectionist/sort-imports` strict — pakai `yarn lint:fix`, jangan hand-sort

### UI

- **Dialog-based CRUD** > page-based untuk small/medium entity. List = satu-satunya page; create/edit/view = dialog
- **Local state dialog** (`useXxxDialog()`) — jangan URL-sync kecuali ada kebutuhan deep-link nyata. URL-sync memicu full re-render list view
- **Transisi cepat** di semua Dialog:
  ```ts
  transitionDuration={{
    enter: theme.transitions.duration.shortest,
    exit: theme.transitions.duration.shortest - 80,
  }}
  ```
- **DialogTitle** dengan X close (bukan tombol "Batal"):
  ```tsx
  <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, pr: 2.5 }}>
    <Box sx={{ flex: 1 }}>{title}</Box>
    <IconButton size="small" onClick={onClose}>
      <Iconify icon="mingcute:close-line" width={18} />
    </IconButton>
  </DialogTitle>
  ```
- **Dialog scroll — title/actions pinned, hanya content yang scroll**: pakai `<DialogContent dividers>` (bukan manual `<Divider />` sibling). Kalau dialog bungkus `<Form>` di antara Paper dan DialogContent, **wajib** pass `sx={{ display: 'contents' }}` ke Form supaya tidak memutus flex chain MUI — kalau dilewat, title/actions ikut ter-scroll bareng konten. `scroll="paper"` tidak perlu ditulis (itu default MUI). Lihat [patterns/dialog-crud.md](patterns/dialog-crud.md#scroll-behavior--dialogcontent-dividers--display-contents-di-form).
- **Jangan sertakan label section** yang redundan (form yang self-explanatory tidak butuh header "Detail Transfer", "Jumlah", dll)
- **Active/status toggle hanya di edit mode** — field seperti `is_active`, `is_published`, `is_archived` di form CRUD **disembunyikan saat `mode === 'new'`** dan hanya muncul di edit. Alasannya: entity baru selalu default aktif, toggle-nya cuma menambah noise. Pola:
  ```tsx
  {mode === 'edit' && (
    <FormControlLabel control={<Switch ... />} label="..." />
  )}
  ```
  Default value tetap `is_active: true` di `defaultValues` agar payload create valid. Contoh: [contact-form-dialog.tsx](../src/module/finance/features/contacts/components/contact-form-dialog.tsx).
- **List loading UX — data tetap visible, swap bersih, tanpa loader**: saat user switch tab / ganti filter, **jangan** ganti baris data dengan skeleton dan **jangan** tampilkan loader terpisah (LinearProgress / fade / spinner). Baris lama tetap di tempat sampai response datang, lalu rows swap clean. Pola ini paling snappy karena tidak ada transisi visual yang bikin terasa lambat.
  - Skeleton HANYA saat first-load (`data.length === 0 && loading`)
  - Saat refetch: `data.map(row => <Row />)` tetap dirender, tidak digate dengan `!loading`
  - Tidak ada `useDeferredValue`, `LinearProgress`, atau opacity fade — itu semua justru menambah render pass / transisi yang bikin tersendat

  ```tsx
  const { data, loading } = useXxxList(listParams);

  const showSkeletons = loading && data.length === 0;
  const isEmpty = !loading && data.length === 0;

  <TableBody>
    {showSkeletons && (/* skeleton rows */)}
    {data.map((row) => <Row ... />)}  {/* Always render existing rows */}
    {isEmpty && (/* empty state */)}
  </TableBody>
  ```

  Diterapkan di `fund-transfer`, `cash-transactions`, `contacts`. Hook `useXxxList` sudah pertahankan `data` state saat loading=true (tidak reset ke `[]`), jadi pattern ini tinggal dipakai di view-nya. Kalau nanti ada kasus server-nya pelan dan user butuh indicator, tambah spinner kecil di toolbar (di luar table) — jangan di TableBody / Card wrapper.

### Table (list view)

Semua list view **wajib pakai shared toolkit** `src/shared/ui/table/` — bukan raw MUI `<TableHead>`/`<TablePagination>` primitives.

- `useTable({ defaultRowsPerPage: 25, defaultDense: true })` untuk state (page, rowsPerPage, selected, dense)
- `<TableHeadCustom headCells={...} />` + `<TableSkeleton>` + `<TablePaginationCustom>`
- `<Table size={table.dense ? 'small' : 'medium'}>` — **dense baseline** (padding rendah) karena MUI default terasa longgar untuk list data-heavy
- Filter/tab change → `table.onResetPage()` (gantikan `setPage(0)` manual)
- Empty state kustom (`SearchNotFound` vs onboarding copy) tetap di-render manual — `<TableNoData>` hanya fallback generic
- Sort & multi-select **opt-in** — jangan enable sort UI kalau BE belum support (misleading)
- **Row actions wajib popover menu** — kolom actions cuma satu `IconButton` dengan `eva:more-vertical-fill` yang buka `<CustomPopover>` + `<MenuList>`. Bukan inline icons berjejer. Urutan menu: View Detail → Edit → (feature actions) → dashed Divider → Delete. Detail di [patterns/table.md § Row actions](patterns/table.md#row-actions--popover-menu-wajib)
- **Row click = View Detail (selalu)** — `onClick={() => onView(id)}` untuk semua flat list view (transactional + master data). Master data sederhana (contacts) tetap wajib punya **detail dialog minimal** (title + field display + Edit/Delete buttons) — supaya UX konsisten di seluruh app. Exception: tree view (COA) tidak ada onClick. Lihat [patterns/table.md § Row click](patterns/table.md#row-click--primary-interaction-wajib-konsisten)
- **Body text di row pakai `variant="body2"`** — **jangan `subtitle2`** (fontWeight 600 bikin kelihatan bold di body, ganggu scan). Secondary line tetap `caption` + `text.secondary`. Lihat [patterns/table.md § Row typography](patterns/table.md#row-typography--tidak-boleh-bold-di-body)
- Lihat [patterns/table.md](patterns/table.md)

### API

- **Selalu pakai `unwrap<T>()` atau `unwrapList<T>()` helper** — jangan akses `res.data.data` langsung. Pattern di `core/auth/api/index.ts`
- Endpoint terdaftar di `src/shared/lib/axios.ts` object `endpoints.*` — jangan string literal di feature
- Response envelope: `{ data, message, meta: { pagination }, errors: string | { detail } }`
- Lihat [patterns/api-layer.md](patterns/api-layer.md)

### Forms

- `Field.*` dari `src/shared/ui/hook-form` untuk field standard (Text, Select, DatePicker, Autocomplete)
- `RHFNumericField` dari fund-transfer untuk amount/currency dengan format `id-ID` (titik ribuan). **Jangan pakai `Field.Text type="number"`** untuk nominal
- **Constrained text** (telepon, NPWP, kode) — `Controller` + `TextField` dengan sanitize di `onChange` (strip karakter invalid sebelum commit ke form state) + Zod `.regex(...)` sebagai safety net. Jangan cuma andalkan validasi Zod — user masih bisa ketik huruf dulu baru gagal submit. Lihat [patterns/form-fields.md § Constrained text input](patterns/form-fields.md#constrained-text-input-telepon-npwp-kode-dll)
- `Field.DatePicker` dengan `format="DD MMM YYYY"` — consistent dengan dayjs locale id
- Zod schema di atas component, export type via `z.infer<typeof Schema>`

### Save button label — selalu "Simpan" / "Save" (master data / non-workflow form)

Tombol save di form dialog **master data** (users, roles, branches, contacts, chart-of-accounts, dll — entity tanpa status workflow) **wajib** pakai label `tCommon('actions.save')` = "Simpan" / "Save" **baik di mode create maupun edit**. Tidak ada lagi "Buat" / "Create" untuk mode create.

**Rule:**
```tsx
<Button type="submit" variant="contained" startIcon={<Iconify icon="solar:check-circle-bold" />}>
  {tCommon('actions.save')}
</Button>
```

Bukan:
```tsx
{isEditing ? tCommon('actions.save') : t('form.create')}
```

**Why:**
- Satu label = lebih predictable untuk user (mau create atau edit, tombolnya sama: "Simpan")
- "Buat" terasa redundant dengan title dialog ("Tambah Pengguna" sudah menyiratkan aksi create)
- Consistent dengan canonical reference (`contacts`) yang sudah pakai pola ini dari awal
- Kurangi noise i18n — tidak perlu per-feature key `form.create`

**Pengecualian — form dengan status workflow** (fund-transfer, cash-transactions, journal-entry): tetap pakai label split sesuai [§ Status-based actions](#status-based-actions-saat-ini) (`Save Draft` + `Save & Submit` atau `Save Changes` + `Save & Submit` atau `Approve`/`Reject`). Label-label ini konteksnya beda — user harus tahu apakah entry akan masuk ke approval flow atau tidak.

**Canonical reference:** [contact-form-dialog.tsx](../src/module/finance/features/contacts/components/contact-form-dialog.tsx).

### Status-based actions (saat ini)

- `canEdit = true`, `canDelete = true` untuk **semua status** (sementara, sampai fitur tutup periode dibangun)
- Form dialog tampilkan `Save Draft` + `Save & Submit` berpasangan **kecuali saat `posted`** — entry yang sudah approved tidak boleh di-submit ulang (akan regress ke `waiting`); gate via `canSubmit = status !== 'posted'`
- Label save switch jadi `Save Changes`/`Simpan Perubahan` saat `status === 'draft' | 'rejected' | 'posted'` — lebih deskriptif dari `Save Draft`
- `canApprove | canReject` hanya untuk `waiting` — render buttons di form dialog (bukan hanya detail)
- Icon wajib: `Save Draft/Changes` → `solar:file-check-bold-duotone`, `Save & Submit` → `eva:arrow-forward-fill`, `Approve` → `solar:check-circle-bold`, `Reject` → `solar:close-circle-bold`
- Jangan render tombol `History`/audit di form — audit log hidup di tab detail dialog saja
- Lihat [patterns/dialog-crud.md § Action buttons](patterns/dialog-crud.md#action-buttons--standar)

### Date range picker (filter periode)

Semua filter periode (start_date + end_date) **wajib** pakai shared component `<DateRangePicker />` dari [src/shared/ui/date-range-picker/](../src/shared/ui/date-range-picker/). Replace pola lama "dua `<DatePicker>` inline" dan field type `'daterange'` di ReportFilterBar.

- **Report views**: pakai field type `'daterange-popup'` di `ReportFilterBar` config — render inline sejajar dengan multiselect/select lain
- **List view toolbars** (transactional): pakai `<DateRangePicker />` langsung, replace dua DatePicker
- `onApply` patch start + end **sekaligus** (1 refetch), bukan dua dispatch terpisah
- Default period report = bulan berjalan (`dayjs().startOf('month')` / `endOf('month')`)
- Default period list = kosong (user opt-in filter)
- i18n keys sudah shared di `common.dateRange.*` — tidak perlu tambah per feature

Detail: [patterns/date-range-picker.md](patterns/date-range-picker.md).

### Reference data

- Branch, account, contact — fetch via **module-level cached hook** (`useBranches`, `useAccounts`, `useContacts`)
- Jangan N+1 fetch di table row — cache share antar komponen
- **Branch picker**: pakai wrapper `useBranchVisibility()` dari `src/shared/hooks/` — otomatis hide kalau user hanya 1 cabang, auto-fill default
- **Company-scoped refresh**: setiap hook yang fetch data per-company (cached reference **dan** list/pagination) wajib:
  - Cached hook: export `invalidateXxxCache()` + `registerCompanyCacheInvalidator(invalidateXxxCache)` di top-level
  - Semua hook: baca `companyVersion` dari `useAuthContext()` dan masukkan ke deps effect fetch-nya
  - `AuthProvider.switchCompany(...)` otomatis panggil `invalidateAllCompanyCaches()` + bump `companyVersion` → semua data refetch dengan token company baru
- Lihat [patterns/reference-data.md § Company-scoped invalidation](patterns/reference-data.md#company-scoped-invalidation)

### Add buttons — "+" icon + noun saja (no "Tambah"/"Add")

Semua tombol dengan icon `mingcute:add-line` (atau varian `+` lainnya) **tidak boleh** pakai kata "Tambah" / "Add" di label. Icon `+` sudah mewakili aksi tambah — kata "Tambah Baris" / "Add Line" murni redundant dan bikin label makin panjang tanpa menambah kejelasan.

**Rule:**
- Label = **noun saja** (apa yang di-add): `Baris`, `Level`, `Kontak`, `Akun`, `Pengguna`, `Cabang`, `Role`, `Transfer`, `Penerimaan`
- Bukan: `Tambah Baris`, `Add Line`, `Tambah Kontak`, `Add Contact`, dst.

**Variant per konteks (wajib konsisten — tidak ada opsi alternatif):**

| Konteks | Variant | Contoh |
|---|---|---|
| Inline form add (dalam form dialog — add line, add level) | `variant="outlined"` (default primary color) | `+ Baris` / `+ Level` (match visual weight Simpan Draft) |
| List page top-right (buat entity baru) | `variant="outlined" color="inherit"` | `+ Jurnal`, `+ Transfer`, `+ Kontak`, `+ Akun`, `+ Pengguna` |

**Jangan** pakai `variant="contained"` untuk tombol add di list page — terlalu berat visual (solid dark) untuk aksi yang bukan primary CTA di page. Outlined + inherit (abu-abu netral) lebih tenang dan konsisten dengan pattern fund-transfer/cash-transactions.

Canonical reference: [fund-transfer-list-view.tsx](../src/module/finance/features/fund-transfer/views/fund-transfer-list-view.tsx).

**Empty-state subtitle yang reference button label** harus ikut update — mis. `"Klik \"Tambah Kontak\" untuk mulai."` → `"Klik \"Kontak\" untuk mulai."` (bukan tag `"+ Kontak"` karena user baca dari screenshot).

**Exception**: Label button CREATE/SAVE dalam form dialog (Simpan Draft, Simpan Perubahan, Setujui, Tolak) tetap verba karena tidak pakai `+` icon — berbeda konteks.

### Icons

Iconify punya strict typing — **hanya icon yang teregister di `iconify/icon-sets.ts`** yang valid. Kalau icon yang diinginkan belum ada, ganti dengan alternatif yang ada atau tambahkan ke icon-sets.ts.

Icon yang sering dipakai:
| Use case | Icon |
|---|---|
| Add / plus | `mingcute:add-line` |
| Close / X | `mingcute:close-line` |
| Edit | `solar:pen-bold` |
| Delete | `solar:trash-bin-trash-bold` |
| Approve / check | `solar:check-circle-bold` |
| Reject / close circle | `solar:close-circle-bold` |
| Forward / submit | `eva:arrow-forward-fill` |
| Back / next | `eva:arrow-ios-{back,forward}-fill` |
| Chevron breadcrumb | `eva:arrow-ios-forward-fill` |
| Preview / eye | `solar:eye-bold` |
| More menu | `eva:more-vertical-fill` |
| Search | `eva:search-fill` |
| Restart / refresh | `solar:restart-bold` |

### Routing

- Dashboard routes mount di `/` (tanpa `/dashboard` prefix)
- Path terdaftar di `src/routes/paths.ts`
- Nav config di `src/layouts/nav-config-dashboard.tsx` — parent dengan children pakai `path: '#'`
- Breadcrumb global di top bar via `HeaderBreadcrumbs` (derive dari navData)

### Approval & Audit Log

Dua endpoint core yang dipakai semua feature dengan approval flow:

- `GET /core/v1/approval-requests/by-doc?reff_type={type}&reff_id={id}` — riwayat persetujuan
- `GET /core/v1/audit-logs?reff_type={type}&reff_id={id}` — log aktivitas

FE module reusable di:

- `src/module/core/features/approval/`
- `src/module/core/features/audit-log/`

Feature-specific hook (`useApprovalHistory`, `useAuditLog`) hidup di folder feature-nya (mis. `fund-transfer/hooks/`) — dia yang mapping BE shape → FE shape dan set `reff_type` yang tepat.

Lihat [patterns/approval-audit.md](patterns/approval-audit.md).

### i18n (multi-language)

- Default: Bahasa Indonesia. English didukung. Tidak ada hardcoded string user-facing
- Semua label, placeholder, error, toast via `t()` dari `useTranslate('<namespace>')`
- Namespace per feature di `src/locales/langs/{id,en}/<feature>.json`; shared strings di `common.json`
- Zod messages via factory `makeSchema(t)` + `useMemo`
- `formatDate`/`formatCurrency` di `utils/format.ts` baca `i18next.resolvedLanguage`
- Language popover sudah live di header dashboard (persist via localStorage)
- Lihat [patterns/i18n.md](patterns/i18n.md)

### Attachments

- Endpoint per feature: `POST/GET/DELETE /{feature}/:id/attachments[/:attachmentId]`
- FE pakai `AttachmentGrid` + `AttachmentPreviewDialog` + `useAttachments` (per-entity) atau `useLineAttachments` (per-line)
- **New mode**: bundle file ke **multipart combined** di endpoint create utama (1 request)
  - Fund-transfer format: field `data` (JSON) + `attachments[]` files
  - Cash-transactions format: individual form fields + `lines` (JSON string) + `attachments_<N>` per-line files
  - **Konfirmasi kontrak ke BE sebelum copy-paste** — tidak universal
- **Edit mode**: upload/delete file **langsung** per-file (tanpa nunggu tombol Simpan) — PUT header cuma commit field non-file
- Icon attachment di row: lihat [patterns/attachments.md § Icon UX](patterns/attachments.md#icon-ux-table-row)
- Confirm dialog sebelum delete existing (tidak untuk pending)
- Lihat [patterns/attachments.md](patterns/attachments.md)

### Multi-line entities (cash-book / journal)

Entity dengan banyak baris detail (cash-transactions, journal-entry, invoice):
- Pakai pola **table + nested line dialog** (bukan inline cards)
- First line auto-pin; header description derive dari pinned line (no separate input)
- Counter account dropdown exclude `asset` type; contact conditional ke AR/AP accounts
- Attachment per-line via `useLineAttachments` — bucket keyed by fieldKey/serverId
- Icon action row **selalu tampil** (no hover-reveal); nominal flush rata kanan
- Lihat [patterns/multiline-form.md](patterns/multiline-form.md)

### Feedback (snackbar & error dialog)

Mekanisme notifikasi user:

- **Success/info dari aksi (save/delete/approve)** → `toast.success(...)` dari `src/shared/ui/snackbar` (sonner-based). Imperative, no local state, auto-dismiss, stack otomatis. Mount global sudah di [src/app.tsx](../src/app.tsx) — tidak perlu mount ulang
- **Error aksi (save/delete gagal)** → `<ErrorDialog>` dari `src/shared/ui/error-dialog` — blocking, user acknowledge, form tetap open agar bisa retry
- **Inline `<Alert>` hanya untuk page-level load error** (list/tree fetch gagal saat first-load)
- **Validation error form** → auto di `helperText`, jangan duplicate ke toast/Alert

Quick usage:
```tsx
import { toast } from 'src/shared/ui/snackbar';
import { ErrorDialog } from 'src/shared/ui/error-dialog';

// Success
toast.success(t('feedback.saved', { code }));

// Error di form dialog — sibling, bukan child
return (
  <>
    <Dialog ...>...</Dialog>
    <ErrorDialog open={!!errorMsg} message={errorMsg ?? ''} onClose={() => setErrorMsg(null)} />
  </>
);
```

Lihat [patterns/feedback.md](patterns/feedback.md) untuk detail.

### List response meta

- Pagination + counts ada di `meta` list response:
  ```ts
  meta: {
    pagination: { page, limit, total, total_pages },
    counts?: { all, draft, waiting, posted, rejected }  // optional, per-status counts untuk badge tab
  }
  ```
- `meta.counts` ikut filter date/search/branch tapi **abaikan** filter status — safe dipakai untuk badge semua tab
- `unwrapList<T>()` map `counts.all → counts.total` supaya key konsisten di FE
- Badge tab pakai `<Label>` dari `src/shared/ui/label` (filled saat aktif, soft saat inaktif, warna sesuai status)

### List-only fields di detail dialog

Field yang cuma BE kirim di List (mis. `created_by_name`, denormalized joins) tidak ada di Get by ID. Pattern: detail dialog terima prop `seed?: Entity | null`, fallback ke `seed?.field` kalau Get by ID tidak mengandungnya. List view pass `data.find((t) => t.id === dialog.id)` sebagai seed. Detail akses via deep-link → seed null → tampil `—` (acceptable karena BE-side limit).

### Resubmit endpoint

`POST /:id/submit` biasanya "replace all header fields". FE **harus kirim payload lengkap** (echo-back dari entity yang sudah di-load), bukan `{}`. Signature helper terima entity bukan id. Lihat [patterns/api-layer.md](patterns/api-layer.md#resubmit-endpoint--echo-back-full-payload).

## Never Do

- ❌ State `feedback` lokal + `<Alert>` banner — pakai `toast.*` dari `src/shared/ui/snackbar`
- ❌ `<Alert severity="error">` inline di DialogContent — pakai `<ErrorDialog>` sibling
- ❌ Mount `<Snackbar />` ulang di layout/feature — sudah global di `app.tsx`
- ❌ Bikin test file baru (tidak ada test runner)
- ❌ Pakai React Query / SWR / Redux (stack ini local state + context)
- ❌ Pakai Tailwind class (proyek pakai MUI `sx`)
- ❌ Import via relative path `../../`
- ❌ Generate icon name tanpa cek `icon-sets.ts`
- ❌ Tulis string literal URL endpoint di feature — selalu `endpoints.*`
- ❌ Buat dialog baru tanpa `transitionDuration` snappy — default MUI terlalu lambat
- ❌ Pakai `<Divider />` manual di antara DialogTitle/Content/Actions — ganti dengan prop `dividers` di `DialogContent`
- ❌ Tombol "Tutup"/"Close" di `<DialogActions>` detail dialog read-only — X di title sudah cukup (sama seperti form dialog). Kalau detail pakai DialogActions, isinya hanya action buttons (Edit/Submit/Approve/Reject/Delete), bukan tombol close
- ❌ Lupa `sx={{display:'contents'}}` di `<Form>` yang bungkus DialogContent+DialogActions — flex chain putus, title/actions ikut scroll
- ❌ Sync dialog state ke URL tanpa alasan kuat
- ❌ Tambahkan mock data di feature — gunakan real BE endpoint via cached hook
- ❌ Bikin hook fetch data company-scoped tanpa hook dependency `companyVersion` (list hooks) atau tanpa `registerCompanyCacheInvalidator(...)` (cached hooks) — UI tidak refresh setelah user switch company. Lihat [patterns/reference-data.md § Company-scoped invalidation](patterns/reference-data.md#company-scoped-invalidation)
- ❌ Render dua `<DatePicker>` inline untuk filter periode atau pakai `type: 'daterange'` di ReportFilterBar (untuk feature baru) — **wajib** `<DateRangePicker />` / `type: 'daterange-popup'`. Lihat [patterns/date-range-picker.md](patterns/date-range-picker.md)
- ❌ N+1 fetch summary (1 per status) — baca `meta.counts` dari 1 list call
- ❌ Render UUID (`created_by`, `updated_by`) langsung di UI — pakai `_name` companion dari List, fallback `'—'`
- ❌ Kirim `{}` ke endpoint resubmit — BE replace header jadi kosong → 400. Echo-back payload lengkap
- ❌ Bundle file ke PUT update — edit mode harus immediate upload/delete per-file
- ❌ Hardcode string user-facing (Indonesia atau English) — selalu `t('...')`; JSON id/en harus paralel
- ❌ Pakai raw `<TableHead>`, `<TablePagination>`, `Array.from` skeleton loop di list view — selalu via `src/shared/ui/table`
- ❌ `useState` manual untuk `page` / `rowsPerPage` — pakai `useTable()`
- ❌ Label `"Tambah X"` / `"Add X"` di tombol yang sudah pakai icon `+` (`mingcute:add-line`) — drop kata `Tambah`/`Add`, label = noun saja. Lihat [§ Add buttons](#add-buttons--icon--noun-saja-no-tambahadd)
- ❌ `variant="text"` (default) untuk inline form add button — wajib `variant="outlined"` supaya visual weight konsisten dengan Simpan Draft
- ❌ `variant="contained"` untuk list-top add button — wajib `variant="outlined" color="inherit"` (canonical fund-transfer)
- ❌ `variant="contained"` untuk tombol **Edit** / **Delete** di `<DialogActions>` detail dialog — wajib `variant="outlined"` (Delete pakai `color="error"`). Edit di detail dialog bukan primary CTA; outlined match visual weight dengan pola transactional detail (fund-transfer, cash-transactions, journal-entry). Lihat [patterns/table.md § Row click](patterns/table.md#row-click--primary-interaction-wajib-konsisten)
- ❌ Label `"Buat"` / `"Create"` pada tombol save form dialog master data — wajib `tCommon('actions.save')` = "Simpan" / "Save" untuk create **dan** edit. Pengecualian hanya untuk form dengan status workflow (fund-transfer / cash-transactions / journal-entry) yang punya split Save Draft + Save & Submit. Lihat [§ Save button label](#save-button-label--selalu-simpan--save-master-data--non-workflow-form)

## Canonical Reference

Template yang paling lengkap untuk dicontek:

**[src/module/finance/features/fund-transfer/](../src/module/finance/features/fund-transfer/)**

Feature ini punya:

- CRUD + approval + audit log + attachments
- Multi-currency support
- Status workflow
- Dialog UX (create/edit/view)
- Row action menu
- Tabs pattern di detail dialog

Saat bikin feature baru, mulai dari struktur fund-transfer, copy, lalu sesuaikan.
