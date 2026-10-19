# Pattern: Multi-line Form (cash-book style)

Feature finance yang punya banyak baris detail (cash-transactions, journal-entry, invoice nanti) pakai pola **table + nested line dialog**, bukan accordion/cards inline. Canonical reference: [cash-transactions](../../src/module/finance/features/cash-transactions/).

## Kenapa table + nested dialog (bukan inline cards)

- **Scannable** saat baris banyak — 5+ baris accordion/card bikin form panjang, nominal sulit disejajarkan.
- **Nominal rata kanan** natural di table column — alignment akuntansi.
- **Add/edit full context** di nested dialog — account + contact (kondisional) + amount + description + attachments per baris, tanpa memperpanjang form utama.
- **Mirip UX** accounting software (QuickBooks, Xero) — pengguna finance sudah familiar.

## Struktur file

```
{feature}/
├── components/
│   ├── {feature}-form-dialog.tsx       # Main form: header + lines table
│   ├── {feature}-line-dialog.tsx       # Nested: add/edit satu baris
│   └── {feature}-detail-dialog.tsx     # View (tabs: detail / approval / audit)
└── hooks/
    └── use-line-attachments.ts         # Per-line attachment buckets
```

## Kolom table (standar)

```
| pin | account | description | amount (rata kanan) | actions |
 48px    flex       flex         width: 160              width: 120
```

- **Pin column** — star icon, klik toggle. Hanya 1 baris yang boleh di-pin (toggling baris lain otomatis unpin yang sebelumnya).
- **Amount column** rata kanan (`align="right"`) dengan footer Total.
- **Actions column** paling kanan — icon edit / delete / attachment (selalu tampil, bukan hover-reveal).

Jangan bikin amount "mengambang" ketemu actions inline — user minta nominal flush rata kanan.

## Tombol Add Line — `outlined` + noun saja

Tombol buka line dialog di header tabel **wajib**:

```tsx
<Button
  size="small"
  variant="outlined"
  startIcon={<Iconify icon="mingcute:add-line" />}
  onClick={handleAddLine}
>
  {t('form.addLine')}
</Button>
```

- `variant="outlined"` (bukan default `text`) supaya visual weight konsisten dengan tombol Simpan Draft di DialogActions.
- Label: **noun saja** — `Baris`, `Detail`, `Level`. **Tidak boleh** `Tambah Baris` / `Add Line` — icon `+` sudah mewakili aksi "tambah". Lihat [CONVENTIONS § Add buttons](../CONVENTIONS.md#add-buttons--icon--noun-saja-no-tambahadd).

## Line dialog — schema lokal

Dialog punya `useForm` sendiri dengan schema per-baris. Parent pass `values` (current line data) + `onSave(values)` callback. Parent gunakan `useFieldArray` untuk manage array lines-nya.

```tsx
// {feature}-line-dialog.tsx
function makeSchema(t: TFunction) {
  return z.object({
    account_id: z.string().min(1, { message: t('validation.lineAccountRequired') }),
    amount: z.number({ message: ... }).positive(...),
    description: z.string().optional().or(z.literal('')),
    is_pinned: z.boolean(),
    contact_id: z.string().nullish(),  // lihat form-fields.md — nullish, bukan nullable
    cost_center_id: z.string().nullish(),
    department_id: z.string().nullish(),
    project_id: z.string().nullish(),
  });
}

type Props = {
  open: boolean;
  mode: 'add' | 'edit';
  values: LineDialogValues | null;
  accountOptions: Account[];       // filtered di parent (lihat bawah)
  contactOptions: Contact[];
  currencyCode: string;
  exchangeRate: number;
  attachmentState: LineAttachmentsState;
  canUploadAttachments: boolean;
  onSave: (values: LineDialogValues) => void;
  onDelete?: () => void;
  onClose: () => void;
  // attachment handlers pass-through
  onAddFiles, onRemovePending, onDeleteExisting
};
```

Reset form saat `open` berubah (ikuti pola dialog-crud):
```tsx
useEffect(() => { if (open) reset(defaultValues); }, [open, defaultValues, reset]);
```

## Counter-account filter

Asset accounts (kas/bank/fixed asset) **dikeluarkan** dari line dropdown karena sudah diwakili di header (cash account). Asset purchase masuk ke journal entry, bukan cash-book.

```tsx
const counterAccounts = useMemo(
  () => accountsQuery.data.filter((a) => a.account_type !== 'asset'),
  [accountsQuery.data]
);
// pass counterAccounts ke line dialog
```

Lookup by ID di table row **tetap** pakai `accountsQuery.getById` (full list) — jangan break display untuk data historis yang referensi asset.

## Contact field kondisional

Contact di line dialog hanya render saat account type = `expense | other_expense | revenue | other_revenue` (AR/AP). Pindah ke akun lain → auto-clear contact.

```tsx
const CONTACT_ACCOUNT_TYPES: AccountType[] = [
  'expense', 'other_expense', 'revenue', 'other_revenue',
];
const needsContact = (acc) => acc && CONTACT_ACCOUNT_TYPES.includes(acc.account_type);

// onChange account:
if (!needsContact(next)) setValue('contact_id', null);
// render:
{showContact && <Autocomplete ... />}
```

## Pin behavior

- Baris pertama yang ditambah **auto-pinned**: `is_pinned: isFirst || values.is_pinned`.
- Maksimal 1 baris boleh ter-pin — toggle satu otomatis unpin yang lain.
- Pin toggle **tidak di line dialog** — user ganti via star icon di table row. Dialog tidak expose `is_pinned` field ke user.

## Header description dari pinned line

**Jangan render separate "description" input** di form utama. Deskripsi transaksi otomatis diambil dari baris yang di-pin saat submit:

```tsx
const performSave = async (values, submitAfter) => {
  const pinnedLine = values.lines.find((l) => l.is_pinned) ?? values.lines[0];
  const description = pinnedLine?.description ?? '';
  const payload = { ...values, description, lines: linesPayload };
  // ...
};
```

Form state-nya tidak perlu field `description` (hapus dari schema).

## Attachment per-line — state key pattern

Tiap line punya bucket attachment sendiri. Key-nya:
- Edit mode dengan line existing: `serverId` (= `line.id` dari BE)
- Add mode atau line baru: pre-generate key saat dialog buka, simpan di state `lineDialog`

```tsx
const handleOpenAddLine = () => setLineDialog({
  mode: 'add',
  fieldKey: `new-${Math.random().toString(36).slice(2, 10)}`,
});

// Saat append, pakai fieldKey yang sama
append({ fieldKey: lineDialog.fieldKey, serverId: null, ...values });
```

Pre-generate ini krusial — attachments yang di-buffer selama dialog akan "menyala" ke line baru setelah `append()` karena key-nya cocok. Saat cancel dialog, hapus pending bucket supaya tidak orphan:

```tsx
const handleLineDialogClose = () => {
  if (lineDialog?.mode === 'add') {
    attachments.clearPending(lineDialog.fieldKey);
  }
  setLineDialog(null);
};
```

## Attachment icon UX

- **Form dialog (line table row):** icon attachment **selalu tampil**. Disabled dengan tooltip "Belum ada lampiran" kalau count = 0. Klik → buka `AttachmentPreviewDialog` dengan items = `existing + pending` (pending pakai `URL.createObjectURL`) mulai index 0.
- **Detail dialog (line table row):** icon attachment render **hanya kalau ada** lampiran. Posisinya **sebelum deskripsi** di kolom description. Klik → preview index 0. Jangan render thumbnail grid inline — terlalu padat.

Lihat [attachments.md](attachments.md) untuk detail.

## Inline amount editing

Amount cell di table bisa di-klik → berubah jadi TextField dengan `ClickAwayListener`. Enter atau klik luar → commit. Shortcut untuk adjust cepat tanpa buka dialog.

```tsx
{isEditingAmount ? (
  <ClickAwayListener onClickAway={commitInlineAmount}>
    <TextField autoFocus inputMode="numeric" ... />
  </ClickAwayListener>
) : (
  <Box onClick={() => setEditingAmountIdx(index)}>
    <Typography>{formatCurrency(amount, currency)}</Typography>
  </Box>
)}
```

## Branch & cabang tunggal

Pakai shared hook `useBranchVisibility` — field branch hidden kalau user hanya 1 cabang. Lihat [reference-data.md](reference-data.md).

## Dual currency (foreign cash account)

Kalau cash account non-IDR: tambah field exchange rate (auto-fetch dari frankfurter.dev public API, silent fail OK), tampilkan IDR equivalent sebagai caption di amount column + footer.

```tsx
// Fetch kurs saat cash account berubah
useEffect(() => {
  if (!isForeign || initialValue?.exchange_rate) return;
  fetchRate(currency);  // https://api.frankfurter.dev/v1/latest?base=...&symbols=IDR
}, [isForeign, currency]);

// Display
<Typography variant="body2">{formatCurrency(amount, currency)}</Typography>
{isForeign && <Typography variant="caption">≈ {formatCurrency(amount * rate, 'IDR')}</Typography>}
```

Exchange rate adalah UI-only state (bukan bagian schema form) — BE enforce sendiri saat posting.

## Reference implementation

Baca source sebagai contoh lengkap:
- [cash-transaction-form-dialog.tsx](../../src/module/finance/features/cash-transactions/components/cash-transaction-form-dialog.tsx) — parent + table + state management
- [cash-transaction-line-dialog.tsx](../../src/module/finance/features/cash-transactions/components/cash-transaction-line-dialog.tsx) — nested dialog
- [use-line-attachments.ts](../../src/module/finance/features/cash-transactions/hooks/use-line-attachments.ts) — per-line attachment buckets

## Jangan

- ❌ Render lines sebagai cards/accordion inline — cepat menuhin form saat 3+ baris
- ❌ Expose `is_pinned` toggle di line dialog — user ganti via star icon di table
- ❌ Tampilkan separate description input di parent form — derive dari pinned line
- ❌ Hover-reveal action icons — user mau affordance langsung tampil
- ❌ Letakkan amount di kolom bukan-terakhir dengan action inline — nominal harus flush rata kanan
- ❌ Include asset accounts di counter dropdown — asset purchase bukan cash-book concern
