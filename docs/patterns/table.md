# Table pattern

Semua list view pakai **shared table toolkit** di `src/shared/ui/table/`. Ini bukan satu `DataTable` all-in-one — tapi kumpulan lego: hook state + komponen kecil yang di-compose manual. Copy-paste dari fund-transfer / cash-transactions; jangan balik ke raw MUI table primitives.

## Kenapa pattern ini

- **Konsisten** — padding, dense toggle, pagination, skeleton, empty-state punya look & behavior yang sama di semua feature
- **Snappy** — dense rows by default (MUI `size="small"`) + short transitions. Tabel densitas standar MUI terasa longgar dan boros vertical space di BE-paginated list
- **Minim boilerplate** — state tabel (page/rowsPerPage/selected/dense) di-encapsulate di `useTable()` — tidak perlu `useState` manual lagi

## Toolkit (`src/shared/ui/table/`)

| Komponen / helper | Kegunaan |
|---|---|
| `useTable()` | Hook state: `page`, `rowsPerPage`, `order/orderBy`, `selected[]`, `dense`. Expose handler (`onChangePage`, `onChangeRowsPerPage`, `onResetPage`, `onSort`, `onSelectRow`, `onSelectAllRows`, `onChangeDense`) |
| `<TableHeadCustom>` | Header dengan `headCells: {id, label, align?, width?}[]`. Auto sort icon (opt-in via `onSort`), auto select-all checkbox (opt-in via `onSelectAllRows`) |
| `<TableSkeleton>` | Placeholder rows saat first-load. `<TableSkeleton rowCount={rowsPerPage} cellCount={HEAD.length} />` |
| `<TablePaginationCustom>` | Wrapper `TablePagination` + dense switch opsional (pass `dense` + `onChangeDense`) |
| `<TableSelectedAction>` | Toolbar overlay "N selected" saat multi-select aktif. Tidak dipasang default — opt-in per feature |
| `<TableNoData>` | Empty-state row generic. Kalau feature punya empty-state kustom (mis. `SearchNotFound` vs onboarding), render sendiri — skip component ini |
| `<TableEmptyRows>` | Filler row untuk jaga tinggi tabel konstan. Relevan untuk client-side pagination; BE-paginated list biasanya tidak butuh |
| `rowInPage`, `emptyRows`, `getComparator` (utils) | Client-side slice + comparator. **Tidak dipakai** di BE-paginated list — pagination & sort dilakukan di server |

## Standar baseline (BE-paginated list)

Format wajib semua list view:

```tsx
import {
  useTable,
  TableSkeleton,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/shared/ui/table';

const table = useTable({ defaultRowsPerPage: 25, defaultDense: true });

const TABLE_HEAD = useMemo(
  () => [
    { id: 'name', label: t('table.name') },
    { id: 'status', label: t('table.status') },
    { id: 'actions', label: '', align: 'right' as const },
  ],
  [t]
);

const listParams = useMemo(
  () => ({ page: table.page + 1, limit: table.rowsPerPage, search }),
  [table.page, table.rowsPerPage, search]
);

// saat filter/tab/search change → reset ke page 0
const handleFilterChange = useCallback(
  (patch) => {
    // ... setState(...)
    table.onResetPage();
  },
  [table]
);

return (
  <TableContainer>
    <Scrollbar>
      <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
        <TableHeadCustom headCells={TABLE_HEAD} />

        <TableBody>
          {showSkeletons && (
            <TableSkeleton rowCount={table.rowsPerPage} cellCount={TABLE_HEAD.length} />
          )}

          {data.map((row) => <MyTableRow key={row.id} row={row} ... />)}

          {isEmpty && (
            <TableRow>
              <TableCell colSpan={TABLE_HEAD.length}>
                {/* custom empty state */}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Scrollbar>
  </TableContainer>

  <TablePaginationCustom
    component="div"
    page={table.page}
    count={meta.total}
    rowsPerPage={table.rowsPerPage}
    rowsPerPageOptions={[25, 50, 100]}
    onPageChange={table.onChangePage}
    onRowsPerPageChange={table.onChangeRowsPerPage}
    labelRowsPerPage={tCommon('pagination.rowsPerPage')}
  />
);
```

## Aturan

### `defaultDense: true` selalu

Baseline row padding MUI (`size="medium"`) terlalu longgar untuk list data-heavy. **Semua list pakai `defaultDense: true`** + `<Table size={table.dense ? 'small' : 'medium'}>`.

Kalau feature butuh row lebih tinggi (mis. multiline content, avatar besar), override ke `false` dengan catatan alasan.

### Dense toggle switch — **tidak** default

`<TablePaginationCustom>` support dense toggle (switch "Dense" di kiri). **Tidak dipasang default** karena dense sudah baseline. Kalau user case butuh toggle (mis. power user mau extra compact vs comfortable), pass:

```tsx
<TablePaginationCustom
  dense={table.dense}
  onChangeDense={table.onChangeDense}
  denseLabel={tCommon('table.dense')}  // i18n — hardcoded default 'Dense'
  ...
/>
```

### Sort — opt-in, pakai BE endpoint

Utilities `getComparator` dari toolkit adalah **client-side** — hanya jalan kalau data full-loaded. BE-paginated list tidak pakainya.

Untuk BE-paginated list, opt-in sort via:
1. Tambah `sort: string` + `order: 'asc' | 'desc'` ke list params → BE endpoint support
2. Pass `order={table.order}`, `orderBy={table.orderBy}`, `onSort={table.onSort}` ke `<TableHeadCustom>`

Jangan enable sort UI kalau BE belum support — akan misleading (sort icon aktif tapi data tidak berubah).

### Multi-select — opt-in, butuh bulk action API

`useTable` sudah expose `selected/onSelectRow/onSelectAllRows/onUpdatePageDeleteRows`. Tapi **tidak enable default**. Enable hanya kalau:
- Ada bulk action API (bulk delete, bulk approve, dst)
- Multi-select meaningful untuk feature ini

Wire-up:
```tsx
<TableContainer sx={{ position: 'relative' }}>
  <TableSelectedAction
    numSelected={table.selected.length}
    rowCount={data.length}
    onSelectAllRows={(checked) =>
      table.onSelectAllRows(checked, data.map((r) => r.id))
    }
    action={<Tooltip title={t('bulk.delete')}><IconButton>...</IconButton></Tooltip>}
  />
  <Table>
    <TableHeadCustom
      headCells={TABLE_HEAD}
      numSelected={table.selected.length}
      rowCount={data.length}
      onSelectAllRows={(checked) =>
        table.onSelectAllRows(checked, data.map((r) => r.id))
      }
    />
    ...
  </Table>
</TableContainer>
```

### Empty state — custom per feature

`<TableNoData>` adalah generic fallback "No data". Kebanyakan feature punya empty-state kustom:
- **Ada filter aktif & tidak ada hasil** → `<SearchNotFound query={search} sx={{ py: 8 }} />`
- **Tidak ada filter & tidak ada data** (first-time) → `<Typography>Empty title + subtitle</Typography>` (onboarding copy)

Pola di fund-transfer / cash-transactions / contacts: render row manual dengan conditional di dalam:
```tsx
{isEmpty && (
  <TableRow>
    <TableCell colSpan={TABLE_HEAD.length}>
      {hasActiveFilters || tabNotAll ? (
        <SearchNotFound query={search} sx={{ py: 8 }} />
      ) : (
        <Box sx={{ py: 8, textAlign: 'center' }}>
          <Typography variant="h6">{t('list.emptyTitle')}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {t('list.emptySubtitle')}
          </Typography>
        </Box>
      )}
    </TableCell>
  </TableRow>
)}
```

Pakai `<TableNoData>` hanya kalau tidak ada empty-state khusus.

### List loading UX

Baca [CONVENTIONS.md § List loading UX](../CONVENTIONS.md). Singkatnya:
- **Skeleton HANYA first-load** (`data.length === 0 && loading`)
- **Refetch**: data lama tetap tampil — jangan gate `data.map` dengan `!loading`
- Tidak ada `LinearProgress` / fade / spinner — terasa lebih snappy

```tsx
const showSkeletons = loading && data.length === 0;
const isEmpty = !loading && data.length === 0;

{showSkeletons && <TableSkeleton rowCount={table.rowsPerPage} cellCount={TABLE_HEAD.length} />}
{data.map((row) => <Row ... />)}  {/* always render */}
{isEmpty && <EmptyState />}
```

### Row click — primary interaction (wajib konsisten)

`TableRow` wajib clickable dengan `sx={{ cursor: 'pointer' }}` + `onClick={() => onView(row.id)}` — **selalu ke View Detail**, bukan Edit. Berlaku untuk semua flat list view: transactional (fund-transfer, cash-transactions, journal-entry) maupun master data (contacts).

**Master data sederhana tetap wajib punya detail dialog** — walau tanpa tabs approval/audit. Tujuannya: kebiasaan "klik row → lihat data" konsisten di seluruh app, user tidak perlu mikir "feature ini row click edit atau view?". Detail dialog master data isinya minimal:

- DialogTitle: nama entity + badge status/type + X close
- DialogContent dividers: 2-column grid field display (read-only)
- DialogActions: **Delete** (`variant="outlined" color="error"`) + **Edit** (`variant="outlined"` dengan `startIcon="solar:pen-bold"`). **Jangan** `variant="contained"` — Edit di detail dialog bukan primary CTA page, outlined lebih tenang dan konsisten dengan pola edit di transactional detail (fund-transfer, cash-transactions, journal-entry)

Canonical: [contact-detail-dialog.tsx](../../src/module/finance/features/contacts/components/contact-detail-dialog.tsx) — template singkat untuk master data detail.

**Exception — tree view** (chart-of-accounts): row **tidak ada `onClick`** karena row punya chevron expand/collapse sendiri; aksi lewat popover menu. Add Child, Edit, Delete semua di menu popover.

**Kolom actions selalu `stopPropagation`** supaya klik more icon tidak ikut trigger row onClick:

```tsx
<TableRow hover sx={{ cursor: 'pointer' }} onClick={() => onView(row.id)}>
  {/* cells */}
  <TableCell align="right" onClick={(e) => e.stopPropagation()}>
    <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
      <Iconify icon="eva:more-vertical-fill" />
    </IconButton>
  </TableCell>
</TableRow>
```

**Row actions menu** (popover) selalu berisi `View Detail` sebagai item pertama (bahkan kalau sudah ada row click ke view) — sesuai [urutan standar](#urutan-menu-items-wajib). User yang pakai keyboard/menu navigation tetap bisa pilih "View Detail" eksplisit.

**Dialog mode state** harus support tiga: `'new' | 'edit' | 'view'`. Update type di `use-{feature}-dialog.ts` kalau belum ada `'view'`.

### Row typography — tidak boleh bold di body

Baseline cell body pakai `<Typography variant="body2">` (normal weight). **Jangan pakai `variant="subtitle2"`** di table body — `subtitle2` punya `fontWeight: 600` yang bikin sel terlihat seperti header sekunder, ganggu scan-ability.

```tsx
// ❌ Wrong — subtitle2 = fontWeight 600, kelihatan bold
<Typography variant="subtitle2" noWrap>{row.name}</Typography>

// ✅ Correct — body2 = normal weight
<Typography variant="body2" noWrap>{row.name}</Typography>

// Secondary line (pic, phone, etc) tetap caption + text.secondary
<Typography variant="caption" sx={{ color: 'text.secondary' }}>{row.pic_name}</Typography>
```

**Exception:** Angka nominal (amount/total) di kolom terakhir boleh `subtitle2` kalau butuh emphasize total — tapi pertimbangkan dulu apakah memang perlu, biasanya `body2` cukup.

**Kenapa:** dense table baseline punya padding rendah; kombinasi padding rendah + bold text di tiap row bikin grid padat secara visual. `body2` (400) + `caption` secondary (400, muted) kasih hierarchy yang lebih tenang.

### Row actions — popover menu (wajib)

Kolom actions **hanya berisi satu `IconButton`** dengan `eva:more-vertical-fill` yang buka `<CustomPopover>` + `<MenuList>`. **Bukan** inline icons untuk setiap aksi. Dipakai di fund-transfer, cash-transactions, journal-entry, chart-of-accounts.

**Kenapa popover:**
- Lebar kolom konsisten — tidak melebar saat banyak status / aksi
- Setiap item punya **label text**, bukan cuma icon (a11y + clarity)
- "More" icon selalu visible (sesuai memory `feedback-table-affordances` — no hover-reveal)
- Tambah aksi baru tidak bikin row semakin padat

**Struktur standar:**

```tsx
const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
const handleClose = () => setAnchorEl(null);

// Row cell paling kanan — stopPropagation supaya klik icon tidak trigger row onClick
<TableCell align="right" onClick={(e) => e.stopPropagation()}>
  <IconButton onClick={(e) => setAnchorEl(e.currentTarget)}>
    <Iconify icon="eva:more-vertical-fill" />
  </IconButton>
</TableCell>

<CustomPopover
  open={!!anchorEl}
  anchorEl={anchorEl}
  onClose={handleClose}
  slotProps={{ arrow: { placement: 'right-top' } }}
>
  <MenuList>
    <MenuItem onClick={() => { handleClose(); onView(row.id); }}>
      <Iconify icon="solar:eye-bold" />
      {t('rowActions.viewDetail')}
    </MenuItem>

    {canEdit && (
      <MenuItem onClick={() => { handleClose(); onEdit(row.id); }}>
        <Iconify icon="solar:pen-bold" />
        {t('rowActions.edit')}
      </MenuItem>
    )}

    {canSubmit && (
      <MenuItem onClick={() => { handleClose(); onSubmit(row.id); }}>
        <Iconify icon="eva:arrow-forward-fill" />
        {t('rowActions.submitApproval')}
      </MenuItem>
    )}

    {canApprove && (
      <MenuItem sx={{ color: 'success.main' }} onClick={() => { handleClose(); onApprove(row.id); }}>
        <Iconify icon="solar:check-circle-bold" />
        {t('rowActions.approve')}
      </MenuItem>
    )}

    {canReject && (
      <MenuItem sx={{ color: 'warning.main' }} onClick={() => { handleClose(); onReject(row.id); }}>
        <Iconify icon="solar:close-circle-bold" />
        {t('rowActions.reject')}
      </MenuItem>
    )}

    {canDelete && (
      <>
        <Divider sx={{ borderStyle: 'dashed' }} />
        <MenuItem sx={{ color: 'error.main' }} onClick={() => { handleClose(); onDelete(row.id); }}>
          <Iconify icon="solar:trash-bin-trash-bold" />
          {t('rowActions.delete')}
        </MenuItem>
      </>
    )}
  </MenuList>
</CustomPopover>
```

**Urutan menu items (wajib):**

1. **View Detail** (`solar:eye-bold`) — pertama, selalu ada (kecuali feature yang tidak punya detail dialog, misal COA tree)
2. **Edit** (`solar:pen-bold`)
3. **Feature-specific actions** — `Submit Approval` (`eva:arrow-forward-fill`), `Approve` (`solar:check-circle-bold`, `success.main`), `Reject` (`solar:close-circle-bold`, `warning.main`). Di COA: `Add Child` (`mingcute:add-line`) di sini
4. **`<Divider sx={{ borderStyle: 'dashed' }} />`** — visual separator sebelum destructive
5. **Delete** (`solar:trash-bin-trash-bold`, `error.main`) — terakhir, selalu

**Gating (status-based):**

Sesuai [CONVENTIONS.md § Status-based actions](../CONVENTIONS.md):
- `canEdit = true` & `canDelete = true` — **semua status** (BE enforce restriction, menunggu close-period feature)
- `canSubmit = draft || rejected`
- `canApprove | canReject = waiting`

Jangan gate edit/delete berdasar status di FE — user kehilangan akses padahal secara bisnis masih boleh (BE yang jadi gatekeeper).

**i18n keys standar** di `rowActions` namespace per feature:
```json
"rowActions": {
  "viewDetail": "Lihat Detail",
  "edit": "Ubah",
  "submitApproval": "Submit Persetujuan",
  "approve": "Setujui",
  "reject": "Tolak",
  "delete": "Hapus"
}
```

Feature tambahan bebas tambah key (mis. COA punya `addChild`), tapi key di atas **wajib ada** kalau action-nya dipakai.

## Exception — tree view (chart-of-accounts)

Tree view (chart-of-accounts) adalah **client-side tree**, bukan BE-paginated flat list. Di-handle beda:
- Tidak pakai `TablePaginationCustom` (data di-load full lalu di-filter client-side)
- `useTable` dipakai hanya untuk `dense` state
- `<TableHeadCustom>` + `<TableSkeleton>` masih relevan
- Kolom pertama berisi **expand/collapse chevron** (`eva:arrow-ios-forward-fill` / `eva:arrow-ios-downward-fill`) inline — ini *bukan* action, jadi tetap inline
- Row actions tetap pakai **popover pattern** di atas (more icon + menu). Aksi khas tree: `Add Child` masuk sebagai menu item, bukan icon terpisah

## Canonical reference

- **Simple flat list** (search + status filter + tabs): [contacts/views/contact-list-view.tsx](../../src/module/finance/features/contacts/views/contact-list-view.tsx)
- **Status workflow list** (tabs dengan count badge + date filter + row actions): [fund-transfer/views/fund-transfer-list-view.tsx](../../src/module/finance/features/fund-transfer/views/fund-transfer-list-view.tsx)
- **Parameterized list** (sub-route per jenis transaksi): [cash-transactions/views/cash-transaction-list-view.tsx](../../src/module/finance/features/cash-transactions/views/cash-transaction-list-view.tsx)

## Never do

- ❌ Import raw `<TableHead>`, `<TablePagination>`, `<Skeleton>` loop manual di list view baru — pakai `src/shared/ui/table` selalu
- ❌ `useState` untuk `page/rowsPerPage` — pakai `useTable()`
- ❌ Enable sort UI tanpa BE sort support — misleading
- ❌ `size="medium"` di `<Table>` list — baseline dense, override dengan alasan eksplisit
- ❌ `TableContainer sx={{ position: 'relative' }}` tanpa `TableSelectedAction` — sisa dari refactor yang lupa dibersihkan
- ❌ Inline icon buttons per aksi di kolom actions (edit/delete/submit/approve/reject berjejer) — pakai popover menu
- ❌ Gate `canEdit`/`canDelete` ke status tertentu di FE — selalu `true`, BE yang enforce
