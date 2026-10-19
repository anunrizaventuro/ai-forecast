# Pattern: Date Range Picker

Komponen seragam untuk semua filter periode (start_date + end_date) di proyek ini. Replace pola lama "dua `<DatePicker>` inline".

Canonical: [src/shared/ui/date-range-picker/](../../src/shared/ui/date-range-picker/)

## Kenapa pattern ini

**Trade-off vs dua DatePicker inline:**
- ✅ **1× refetch** per ganti range (deferred commit) — bukan 2× (start change + end change)
- ✅ **Compact** — satu trigger field menggantikan dua field 200px → hemat ~150px horizontal space
- ✅ **Preset cepat** (Hari Ini, Bulan Ini, Bulan Lalu, Tahun Ini, dll) — common case ter-cover tanpa interaksi calendar
- ✅ **Range visualization** — user lihat span tanggal yang akan di-apply lewat highlight bar di calendar (sama dengan UX MUI X DateRangePicker Pro, tapi pakai primitives **free**)
- ✅ **Auto-commit + auto-close** saat range complete → 1 click pattern, tidak perlu Apply button

**Trade-off:**
- Tidak fokus / tab navigation antar field tidak natural seperti dua DatePicker — tapi minor concern karena calendar UI sudah lebih cepat
- Mobile tetap pakai Dialog fallback (auto switch via media query)

## Komponen

```tsx
import { DateRangePicker } from 'src/shared/ui/date-range-picker';

<DateRangePicker
  startDate={startDate}             // ISO string YYYY-MM-DD, '' kalau kosong
  endDate={endDate}
  onApply={(v) => {                 // dipanggil saat range complete + berbeda dari current
    setStartDate(v.start);
    setEndDate(v.end);
  }}
  fullWidth                          // optional — default minWidth: 260
  variant="auto"                     // 'auto' (default) | 'calendar' | 'input'
/>
```

**Variants:**
- `'auto'` (default) — popover dengan dua `DateCalendar` + presets di kiri pada md+, fallback Dialog dengan dua DatePicker stacked di mobile
- `'calendar'` — paksa popover layout di semua breakpoint
- `'input'` — paksa Dialog dengan stacked DatePicker

## Integrasi di Report (via ReportFilterBar)

Field type `'daterange-popup'` di [shared/types.ts](../../src/module/finance/features/reports/shared/types.ts):

```tsx
const filters: ReportFilterField[] = [
  {
    name: 'date',
    type: 'daterange-popup',
    startDate,
    endDate,
    onApply: (v) => {
      setStartDate(v.start);
      setEndDate(v.end);
    },
  },
  // ... field lain (multiselect, select, dll)
];

<ReportFilterBar fields={filters} />
```

`ReportFilterBar` render `<DateRangePicker fullWidth />` dalam Box dengan `minWidth: 240` → field ikut flex layout sejajar dengan multiselect/select lain.

**Wajib pertama** di filters array (kiri-paling) — konvensi UX akuntansi: periode adalah filter primer, semua filter lain modifies "dalam periode ini, tampilkan apa".

> Field type `'daterange'` lama (dua DatePicker inline) **deprecated** untuk report baru. Migrate ke `'daterange-popup'`. Existing usage tetap support sampai migrasi selesai.

## Integrasi di List View Toolbar

Toolbar transactional list (fund-transfer, cash-transactions, journal-entry) — ganti dua `<DatePicker>` Box jadi satu `<DateRangePicker />`:

```tsx
// ❌ Lama
<Box sx={{ display: 'flex', gap: 2, flexShrink: 0 }}>
  <DatePicker label="Dari tanggal" value={...} onChange={...} ... />
  <DatePicker label="Sampai tanggal" value={...} onChange={...} ... />
</Box>

// ✅ Baru
<DateRangePicker
  startDate={filters.date_from}
  endDate={filters.date_to}
  onApply={(v) => onFilterChange({ date_from: v.start, date_to: v.end })}
/>
```

Note `onApply` patch **kedua field sekaligus** — itu bagian dari deferred commit (vs lama yang dispatch dua `onFilterChange` terpisah → dua refetch).

## Behavior wajib (sudah built-in)

- ✅ **Snappy transition** — Popover `enter: shortest, exit: shortest - 80` sesuai konvensi proyek
- ✅ **Auto-commit** saat `pendingStart && pendingEnd && range !== committed` → fire `onApply` + close
- ✅ **Locale-aware week start** — `Senin` start di id, `Sunday` start di en (via `dayjs.localeData().firstDayOfWeek()`)
- ✅ **Preset list** — 6 quick ranges: Hari Ini, Minggu Ini, Bulan Ini, Bulan Lalu, Tahun Ini, Tahun Lalu (via `useTranslate('common').t('dateRange.presets.*')`)
- ✅ **Range visualization** — highlight bar via custom `slot.day` + `styled(PickersDay)` (pattern MUI X v8 free)
- ✅ **Hover preview** — saat 1 date sudah dipilih, hover di calendar tampilkan preview range
- ✅ **No flicker** — `onPointerEnter` di day cell + `onPointerLeave` di calendar wrapper (bukan per cell)
- ✅ **Today indicator subtle** — bold + primary color tint, no ring border (border ring jadi kotak saat overlap range)
- ✅ **Manual navigation preserved** — `defaultValue` + `key` based remount: navigasi calendar manual ke bulan jauh tidak di-snap-back saat hover. Snap hanya saat preset apply.
- ✅ **Auto-swap** — kalau user click tanggal sebelum start, auto-swap (start jadi end, click jadi start baru)

## Format trigger label

Auto-pilih format ringkas:

| Kondisi | Format |
|---|---|
| Same year | `01 Apr — 30 Apr 2026` |
| Cross year | `21 Des 2025 — 5 Jan 2026` |
| Single day (start === end) | `01 Apr 2026` |
| Empty | `Pilih periode` (i18n placeholder) |

Implementation: [format-range-label.ts](../../src/shared/ui/date-range-picker/format-range-label.ts).

## i18n keys (di `common.json`)

Sudah tersedia di namespace `common.dateRange.*`:
- `title` — "Pilih Periode" / "Select Period"
- `placeholder` — empty state trigger label
- `startDate`, `endDate` — labels DatePicker (input variant only)
- `presets.*` — 6 preset labels
- `actions.apply`, `actions.reset` — Dialog (input variant) only
- `errors.endBeforeStart` — validasi end < start

**Tidak perlu** tambah key di feature namespace — semua sudah shared.

## Default period

**Setiap report wajib default ke bulan berjalan**:

```ts
const [startDate, setStartDate] = useState(() => dayjs().startOf('month').format('YYYY-MM-DD'));
const [endDate, setEndDate] = useState(() => dayjs().endOf('month').format('YYYY-MM-DD'));
```

**List view (transactional)** — default kosong (`''`) supaya tampil semua data, user opt-in filter.

## Custom variant

Kalau perlu force layout:
- Form dialog yang butuh date range tertentu (bukan filter): `variant="input"` (Dialog dengan dua DatePicker stacked) — lebih cocok untuk in-form editing
- Desktop-only kiosk app: `variant="calendar"` (paksa popover di semua viewport)

## Anti-pattern

| ❌ Jangan | ✅ Pakai |
|---|---|
| Dua `<DatePicker>` inline di toolbar/filter bar | `<DateRangePicker />` |
| `type: 'daterange'` di ReportFilterBar (untuk feature baru) | `type: 'daterange-popup'` |
| Dispatch 2× `onFilterChange` per ganti range | 1× `onApply({ start, end })` |
| Hardcode preset list per feature | Pakai built-in preset di hook (modifikasi shared kalau perlu kurang/tambah) |
| Tambah key i18n `dateRange.*` di feature namespace | Pakai `common.dateRange.*` (sudah shared) |
| Tulis ulang range visualization custom | Pakai komponen ini (sudah pakai pattern resmi MUI X v8 `slots.day`) |

## Reference implementation

- **Report (popup variant)**: [reports/general-ledger/views/general-ledger-view.tsx](../../src/module/finance/features/reports/general-ledger/views/general-ledger-view.tsx)
- **List toolbar**: [fund-transfer/components/fund-transfer-toolbar.tsx](../../src/module/finance/features/fund-transfer/components/fund-transfer-toolbar.tsx)

## Sumber pattern teknis

Range visualization tanpa Pro license — pakai pattern resmi `slots.day` + `styled(PickersDay)`:
- [MUI X — Date Calendar customization](https://mui.com/x/react-date-pickers/date-calendar/)
- [MUI X — Custom slots and subcomponents](https://mui.com/x/react-date-pickers/custom-components/)
- [PickersDay API](https://mui.com/x/api/date-pickers/pickers-day/)
