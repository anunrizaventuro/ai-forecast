# Pattern: Reports

Laporan keuangan (General Journal, General Ledger, Income Statement, Balance Sheet, dll) adalah **read-only flat view** dari data yang dipakai untuk dicetak / diekspor. Pola ini berbeda dari CRUD feature di [feature-module.md](feature-module.md).

Canonical reference: [src/module/finance/features/reports/general-journal/](../../src/module/finance/features/reports/general-journal/).

## Keputusan arsitektural

**Read-only, page-based, bukan dialog.**
- Tidak ada create/edit — user hanya membaca, memfilter, print, export.
- Satu page per laporan; navigasi di sidebar Laporan.

**Filter sebagai first-class state.**
- Semua kontrol filter berada di atas tabel, pakai shared `<ReportFilterBar />`.
- Filter state lokal (useState) — tidak ada URL sync di iterasi pertama.
- Setiap perubahan filter panggil `table.onResetPage()` — bukan `setPage(0)` manual.

**Default period = bulan berjalan.**
- `startDate` default = `dayjs().startOf('month')`, `endDate` default = `dayjs().endOf('month')`.
- Alasan: user paling sering buka laporan bulan aktif; kosongin default = request semua data historis → lambat + BE cost besar.

```ts
const [startDate, setStartDate] = useState(() => dayjs().startOf('month').format('YYYY-MM-DD'));
const [endDate, setEndDate] = useState(() => dayjs().endOf('month').format('YYYY-MM-DD'));
```

**Server-side pagination.**
- List endpoint paginated (25/50/100), tapi summary dihitung **dari seluruh data yang match filter** (bukan per page). Ambil dari `response.data.summary`.

**Table wajib pakai shared toolkit.**
- Sama dengan list view transactional — [patterns/table.md](table.md).
- `useTable({ defaultRowsPerPage: 25, defaultDense: true })`, `<TableHeadCustom>`, `<TableSkeleton>`, `<TablePaginationCustom>`.
- Jangan pakai raw `<TableHead>` / `<TablePagination>` / `Array.from` skeleton loop.

**Print & Export: JWT-protected endpoint → axios blob, BUKAN `window.open(url)`.**
- Kedua endpoint dilindungi `JWTAuth()` — header `Authorization: Bearer <token>` wajib.
- `window.open(fullUrl)` / `window.location.href = url` → **401** karena navigasi browser tidak bisa attach custom header.
- Solusi: fetch via axios dengan `responseType: 'blob'`, lalu `URL.createObjectURL(blob)`:
  - **Print**: `window.open(blobUrl, '_blank')` → Chrome render PDF inline (BE set `Content-Disposition: inline`).
  - **Export**: `<a href={blobUrl} download={filename}>` + `click()` → trigger download.

## Struktur direktori

```
src/module/finance/features/reports/
├── shared/                              # Komponen reusable antar semua laporan
│   ├── components/
│   │   ├── report-filter-bar.tsx        # <ReportFilterBar /> — toolbar filter (select + daterange)
│   │   └── report-summary-card.tsx      # <ReportSummaryCard /> — card summary metric
│   ├── types.ts                         # ReportFilterField, SelectOption
│   └── index.ts
│
├── general-journal/                     # Laporan spesifik
│   ├── api/index.ts                     # list + print + export
│   ├── hooks/use-general-journal.ts     # fetch + state
│   ├── types/index.ts
│   ├── views/general-journal-view.tsx
│   └── pages/list.tsx
│
├── general-ledger/                      # Template sama
│   └── ...
```

## shared/ReportFilterBar

Driver adalah `fields: ReportFilterField[]`:
- `{ type: 'select', name, label, value, options, onChange }` — single select
- `{ type: 'daterange', name, startLabel, endLabel, startDate, endDate, onStartChange, onEndChange }` — dua DatePicker side-by-side

**Aturan field:**
- **Default size (medium), width 200** — sama dengan fund-transfer / cash-transactions toolbar. **Jangan pakai `size="small"`** atau width 180.
- Date picker label **terpisah** (`startLabel` = "Dari tanggal", `endLabel` = "Sampai tanggal"). Jangan pakai satu `label` compound yang dibuntut `(start)/(end)` — itu pola lama, sudah dihapus.
- Format tanggal `DD MMM YYYY` + `clearable: true`.

```tsx
<ReportFilterBar
  fields={[
    {
      type: 'daterange',
      name: 'date',
      startLabel: t('filters.dateFrom'),
      endLabel: t('filters.dateTo'),
      startDate, endDate, onStartChange, onEndChange,
    },
    { type: 'select', name: 'branch', label, value, options, onChange },
  ]}
  actions={<Button>Custom action</Button>}
/>
```

## shared/ReportSummaryCard

Tampilkan total dari BE summary (debit, credit, balanced, count, dll). Support `align: 'right'` per item — **wajib** untuk nominal angka (konsisten dengan table amount flush-right).

```tsx
<ReportSummaryCard
  items={[
    { label: 'Total Debit', value: formatAmount(s.total_debit), color: 'primary', align: 'right' },
    { label: 'Total Credit', value: formatAmount(s.total_credit), color: 'warning', align: 'right' },
    { label: 'Status', value: s.is_balanced ? 'Balanced' : 'Out of Balance', color: s.is_balanced ? 'success' : 'error' },
    { label: 'Count', value: String(s.count), align: 'right' },
  ]}
/>
```

> Summary card **opt-in per laporan** — tidak semua report butuh. Kalau ruang terbatas atau metric tidak informatif untuk skim, skip saja dan mulai langsung dengan filter bar + table.

## Data-fetch pattern

Tiap laporan punya 1 hook `use-{report}.ts`:
- Trigger fetch otomatis saat `params` berubah (useEffect keyed by `JSON.stringify(params)`).
- Kembalikan `{ data, meta, loading, error, refresh }`.
- Error fallback via `i18n.t('reports-{report}:errors.loadData')` karena hook bukan React scope.

```ts
export function useGeneralJournal(params: GeneralJournalParams) {
  const key = JSON.stringify(params);
  const stableParams = useMemo(() => params, [key]);
  const [state, setState] = useState(INITIAL);
  // ... load effect
  return { ...state, refresh: load };
}
```

## API functions

Tiga fungsi standar per laporan:

```ts
// 1. Paginated list — for UI
export async function listGeneralJournal(params): Promise<{ data, meta }>;

// 2. Print PDF — axios blob → open as blob URL in new tab
export async function printGeneralJournal(params: Params): Promise<void> {
  const res = await axios.get<Blob>(endpoints.finance.reports.generalJournalPrint, {
    params: buildReportParams(params),
    responseType: 'blob',
    paramsSerializer: { indexes: null },
  });
  const url = URL.createObjectURL(res.data);
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// 3. Export Excel — axios blob → trigger download
export async function exportGeneralJournal(params: Params): Promise<void> {
  const res = await axios.get<Blob>(endpoints.finance.reports.generalJournalExport, {
    params: buildReportParams(params),
    responseType: 'blob',
    paramsSerializer: { indexes: null },
  });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = `general-journal-${dayjs().format('YYYY-MM-DD')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

> **`paramsSerializer: { indexes: null }`** penting untuk array params (mis. `excluded_accounts=a&excluded_accounts=b`) — default axios serialize jadi `excluded_accounts[]=a`.

### ❌ Jangan

```ts
// ❌ window.open(fullUrl) — tidak bisa attach Authorization header, 401
export function printGeneralJournal(params: Params): void {
  window.open(buildReportUrl(endpoints.finance.reports.generalJournalPrint, params), '_blank');
}

// ❌ window.location.href = url — sama masalahnya
// ❌ new Blob([res.data]) — re-wrap Blob dalam Blob, hilang MIME type. Pakai res.data langsung.
```

## Action buttons di page header

**Dua tombol berdampingan** (Print + Export Excel), keduanya `variant="outlined" color="inherit"` — match standar list-top action [CONVENTIONS.md § Add buttons](../CONVENTIONS.md#add-buttons--icon--noun-saja-no-tambahadd). Single export = **tidak perlu dropdown menu**; langsung tombol `Export Excel`.

```tsx
<Stack direction="row" spacing={1.5}>
  <Button
    variant="outlined"
    color="inherit"
    startIcon={<Iconify icon="solar:printer-minimalistic-bold" />}
    onClick={handlePrint}
  >
    {t('actions.print')}
  </Button>
  <Button
    variant="outlined"
    color="inherit"
    startIcon={<Iconify icon="solar:download-bold" />}
    onClick={handleExportExcel}
  >
    {t('actions.exportExcel')}
  </Button>
</Stack>
```

**Error handling**: bungkus handler di `try/catch`, set `errorMsg` state → render `<ErrorDialog>` — sama pola dengan form dialog di feature CRUD.

## Grouping view (date & transaction no shown once per journal)

BE kembalikan flat list (1 row = 1 line). Di FE, kita group by `journal_entry_id` supaya kolom date/no hanya tampil di baris pertama group:

```tsx
const rowsWithGrouping = useMemo(() => {
  const seen = new Set<string>();
  return data.entries.map((row) => {
    const first = !seen.has(row.journal_entry_id);
    seen.add(row.journal_entry_id);
    return { row, first };
  });
}, [data.entries]);

// Render:
<TableCell>{first ? formatDate(row.journal_date) : ''}</TableCell>
```

Simple, tidak perlu struktur nested.

## Column widths — sisakan ruang untuk nomor transaksi

Nomor transaksi hasil `COALESCE(reff_number, journal_number)` bisa cukup panjang (e.g., `CI/JKT-202604/0005` = 18 karakter). **Minimum width kolom transaksi = 220px** supaya tidak wrap di mode dense.

```tsx
const TABLE_HEAD = [
  { id: 'date', label: t('table.date'), width: 120 },
  { id: 'transactionNo', label: t('table.transactionNo'), width: 220 },  // WAJIB ≥ 220
  { id: 'account', label: t('table.account') },
  { id: 'description', label: t('table.description') },
  { id: 'debit', label: t('table.debit'), width: 140, align: 'right' as const },
  { id: 'credit', label: t('table.credit'), width: 140, align: 'right' as const },
];
```

## Endpoints registration

Semua endpoint report terdaftar di `endpoints.finance.reports.*`:

```ts
reports: {
  generalJournal: '/finance/v1/reports/general-journal',
  generalJournalPrint: '/finance/v1/reports/general-journal/print',
  generalJournalExport: '/finance/v1/reports/general-journal/export',
  // Tambah report lain di sini
},
```

## i18n namespace

Satu namespace per laporan: `reports-general-journal`, `reports-general-ledger`, dst. Struktur JSON:

```json
{
  "title": "...",
  "filters": {
    "dateFrom": "Dari tanggal",
    "dateTo": "Sampai tanggal",
    "status": "...", "allStatus": "...",
    "branch": "...", "allBranches": "...",
    "account": "...", "allAccounts": "..."
  },
  "statuses": { "draft": "...", "waiting": "...", "posted": "...", "rejected": "..." },
  "actions": { "print": "Cetak PDF", "exportExcel": "Export Excel" },
  "summary": { "totalDebit": "...", "totalCredit": "...", "balanced": "...", ... },
  "table": { "date": "...", "transactionNo": "...", ... },
  "list": { "emptyTitle": "...", "emptySubtitle": "..." },
  "errors": {
    "loadData": "...",
    "exportFailed": "...",
    "printFailed": "..."
  }
}
```

> **Catatan label:** "Export Excel" (bukan "Ekspor Excel") dipakai juga di locale `id` — istilah "Export" lebih familiar di domain finance/accounting Indonesia.

## Loading / empty / error

- Skeleton via `<TableSkeleton>` saat first-load (`loading && entries.length === 0`)
- Empty state saat `!loading && entries.length === 0` — Typography h6 + caption, colspan sama dengan `TABLE_HEAD.length`
- Error: `<Alert severity="error">` di atas table
- Jangan gate row render dengan `!loading` saat refetch — tetap tampilkan data lama (sama dengan list page CRUD — lihat [CONVENTIONS.md § List loading UX](../CONVENTIONS.md))
- Action gagal (print/export): `<ErrorDialog>` sibling — bukan Alert inline

## Checklist saat menambah laporan baru

- [ ] Daftarkan endpoint di `endpoints.finance.reports.*`
- [ ] Tambah path di `paths.dashboard.reports.*`
- [ ] Register route di `routes/sections/dashboard.tsx`
- [ ] Tambah nav menu (grup Laporan)
- [ ] Buat JSON i18n id/en dengan struktur mirip general-journal
- [ ] Api: list + print + export — **semua via axios blob** untuk print/export
- [ ] Hook: `use-{report}.ts`
- [ ] View: filter bar + (opsional summary card) + shared table toolkit + print/export buttons
- [ ] Default period = bulan berjalan (`dayjs().startOf('month')` / `endOf('month')`)
- [ ] Page: thin wrapper (title + view)
- [ ] Reuse `ReportFilterBar` + `ReportSummaryCard` — jangan buat ulang
- [ ] **Tidak** `window.open(fullUrl)` untuk print — gunakan blob URL

## Tidak dilakukan (untuk iterasi awal)

- URL-sync filter state (bisa ditambah nanti via `useSearchParams` kalau user minta shareable links)
- Client-side grouping lanjut (nested tree per journal) — cukup flat + flag first per group
- Export setup modal (pilih akun yang di-exclude) — belum diperlukan untuk v1; kalau butuh, tambah dialog kecil yang simpan `excludedCodes[]` lalu pass ke `exportGeneralJournal({ excluded_accounts: [...] })`. BE contract sudah support `excluded_accounts` string[] di query param.
- Print preview modal — langsung buka blob URL (Chrome native PDF viewer di tab baru)
