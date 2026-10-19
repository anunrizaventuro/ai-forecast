# Pattern: Feature Module

Cara scaffold feature baru (mis. `cash-in`, `expense`, `invoice`) mengikuti template fund-transfer.

## Struktur direktori

```
src/module/{core|finance}/features/{feature-name}/
├── api/
│   └── index.ts              # Axios calls: unwrap<T>, unwrapList<T>
├── components/
│   ├── {feature}-form-dialog.tsx     # Create + edit dalam satu dialog
│   ├── {feature}-line-dialog.tsx     # (jika multi-line) nested dialog add/edit baris
│   ├── {feature}-detail-dialog.tsx   # View dengan tabs
│   ├── {feature}-confirm-dialog.tsx  # Reusable untuk submit/approve/reject/delete
│   ├── {feature}-table-row.tsx       # Baris tabel dengan popover action menu
│   ├── {feature}-status-label.tsx    # Label wrapper dengan color mapping
│   └── {feature}-toolbar.tsx         # Search + filter
├── hooks/
│   ├── use-{feature}-list.ts         # List fetch + pagination state
│   ├── use-{feature}.ts              # Detail fetch
│   ├── use-{feature}-dialog.ts       # Dialog open/close state (local)
│   ├── use-approval-history.ts       # (jika punya approval) BE→FE mapping
│   ├── use-audit-log.ts              # (jika punya audit) BE→FE mapping
│   ├── use-attachments.ts            # (jika file per-entity) upload flat
│   └── use-line-attachments.ts       # (jika file per-line) bucket per fieldKey
├── pages/
│   └── list.tsx                      # Satu-satunya page — thin wrapper title + View
├── types/
│   └── index.ts                      # Entity type + API payloads + envelope
├── utils/
│   └── format.ts                     # Status labels, colors, date formatters
├── views/
│   └── {feature}-list-view.tsx       # Main UI: table + toolbar + dialogs
└── index.ts                          # Barrel exports
```

## Flow integrasi

### 1. Daftarkan endpoint di shared axios

**[src/shared/lib/axios.ts](../../src/shared/lib/axios.ts)**

```ts
export const endpoints = {
  ...,
  finance: {
    {featureName}: {
      root: '/finance/v1/{feature}',
      byId: (id: string) => `/finance/v1/{feature}/${id}`,
      submit: '/finance/v1/{feature}/submit',
      submitById: (id: string) => `/finance/v1/{feature}/${id}/submit`,
      approve: (id: string) => `/finance/v1/{feature}/${id}/approve`,
      reject: (id: string) => `/finance/v1/{feature}/${id}/reject`,
      attachments: (id: string) => `/finance/v1/{feature}/${id}/attachments`,
    },
  },
};
```

### 2. Tambah path di paths.ts

**[src/routes/paths.ts](../../src/routes/paths.ts)**

```ts
dashboard: {
  ...,
  {featureName}: {
    root: '/{feature}',   // tanpa /dashboard prefix
  },
},
```

### 3. Register route

**[src/routes/sections/dashboard.tsx](../../src/routes/sections/dashboard.tsx)**

```ts
const {Feature}ListPage = lazy(
  () => import('src/module/finance/features/{feature}/pages/list')
);

// Di dashboardRoutes.children:
{ path: '{feature}', element: <{Feature}ListPage /> },
```

### 4. Tambah nav menu

**[src/layouts/nav-config-dashboard.tsx](../../src/layouts/nav-config-dashboard.tsx)**

```ts
{
  title: 'Feature Name',
  path: paths.dashboard.{featureName}.root,
  icon: ICONS.featureIcon,
},
```

### 5. Buat namespace i18n (id + en)

**[src/locales/langs/id/{feature}.json](../../src/locales/langs/id/)** dan **[src/locales/langs/en/{feature}.json](../../src/locales/langs/en/)** — struktur paralel, key identik. Namespace otomatis lazy-loaded saat komponen panggil `useTranslate('{feature}')`.

```json
// langs/id/{feature}.json
{
  "title": "Nama Fitur",
  "buttons": { "new": "Baru" },
  "table": { "no": "Nomor", "date": "Tanggal" },
  "form": { "name": "Nama", ... },
  "validation": { "nameRequired": "Nama wajib diisi." },
  "confirm": { ... },
  "feedback": { "saved": "Data tersimpan." },
  "errors": { "loadData": "Gagal memuat data." }
}
```

Shared labels (Batal, Hapus, Tutup, Edit, Submit) ambil dari `common.json` via `useTranslate('common')`. Lihat [i18n.md](i18n.md).

## Pola yang konsisten

### api/index.ts — template

```ts
import type { ApiEnvelope, Entity, EntityListParams, EntityListResponse } from '../types';
import axios, { endpoints } from 'src/shared/lib/axios';

async function unwrap<T>(p: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const res = await p;
  const payload = res.data;
  if (payload.data == null) {
    throw new Error(extractError(payload) ?? payload.message ?? 'Empty response');
  }
  return payload.data;
}

async function unwrapList<T>(
  p: Promise<{ data: ApiEnvelope<T[]> }>
): Promise<{ data: T[]; meta: EntityListResponse['meta'] }> {
  const res = await p;
  const payload = res.data;
  const data = payload.data ?? [];
  const pagination = payload.meta?.pagination;
  return {
    data,
    meta: {
      total: pagination?.total ?? data.length,
      page: pagination?.page ?? 1,
      limit: pagination?.limit ?? data.length,
      total_pages: pagination?.total_pages ?? 1,
    },
  };
}

function extractError(payload: ApiEnvelope<unknown>): string | null {
  if (!payload.errors) return null;
  if (typeof payload.errors === 'string') return payload.errors;
  return payload.errors.detail?.[0] ?? null;
}

export function list(params: EntityListParams) {
  return unwrapList<Entity>(axios.get(endpoints.finance.{feature}.root, { params }));
}

export function getById(id: string) {
  return unwrap<Entity>(axios.get(endpoints.finance.{feature}.byId(id)));
}
// ... create, update, delete, submit, approve, reject, dll.
```

### views/{feature}-list-view.tsx — skeleton

```tsx
export function EntityListView() {
  const dialog = useEntityDialog();
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const listParams = useMemo(() => ({ ... }), [page, rowsPerPage, search, statusTab]);
  const { data, meta, loading, error, refresh } = useEntityList(listParams);

  // Quick action state (submit/approve/reject/delete dari row menu)
  const [quickAction, setQuickAction] = useState<QuickActionState>({ type: 'none' });

  const handleFormSaved = useCallback((saved) => {
    dialog.open('view', saved.id);  // auto-buka detail setelah save
    refresh();
  }, [dialog, refresh]);

  return (
    <DashboardContent maxWidth="xl">
      <PageHeader title="..." action={<Button onClick={() => dialog.open('new')}>...</Button>} />

      <Stack spacing={3}>
        {feedback && <Alert ... />}
        <Card>
          <Tabs ... />
          <EntityToolbar ... />
          <TableContainer>
            <Table>
              <TableHead>...</TableHead>
              <TableBody>{data.map(row => <EntityTableRow row={row} ... />)}</TableBody>
            </Table>
          </TableContainer>
          <TablePagination ... />
        </Card>
      </Stack>

      <EntityFormDialog
        open={dialog.mode === 'new' || dialog.mode === 'edit'}
        mode={dialog.mode === 'edit' ? 'edit' : 'new'}
        entityId={dialog.mode === 'edit' ? dialog.id : null}
        onClose={dialog.close}
        onSaved={handleFormSaved}
      />
      <EntityDetailDialog
        open={dialog.mode === 'view'}
        entityId={dialog.mode === 'view' ? dialog.id : null}
        onClose={dialog.close}
        onEdit={(id) => dialog.open('edit', id)}
        onChanged={refresh}
        onDeleted={refresh}
      />
      {quickConfig && <EntityConfirmDialog ... />}
    </DashboardContent>
  );
}
```

### hooks/use-{feature}-dialog.ts

**Pattern pure local state** — TIDAK pakai URL sync:

```ts
type DialogMode = 'new' | 'view' | 'edit';
type State = { mode: DialogMode | null; id: string | null };

export function useEntityDialog() {
  const [state, setState] = useState<State>({ mode: null, id: null });
  const open = useCallback((mode: DialogMode, id?: string) => {
    setState({ mode, id: id ?? null });
  }, []);
  const close = useCallback(() => setState({ mode: null, id: null }), []);
  return { mode: state.mode, id: state.id, open, close };
}
```

## Feature multi-line (cash-book style)

Kalau entity punya banyak baris detail (mis. cash-transactions, journal-entry), ikuti [multiline-form.md](multiline-form.md):
- Table + nested line dialog (bukan inline cards)
- First line auto-pin, header description derive dari pinned line
- Counter account filter (exclude asset), contact conditional (AR/AP only)
- Attachment per-line via `use-line-attachments.ts` — bucket keyed by fieldKey/serverId

## Checklist sebelum merge

- [ ] ESLint clean (`yarn lint:fix`)
- [ ] TypeScript clean (`yarn tsc:dev` atau `yarn build`)
- [ ] Endpoint terdaftar di `shared/lib/axios.ts`
- [ ] Path terdaftar di `routes/paths.ts`
- [ ] Route terdaftar di `routes/sections/dashboard.tsx`
- [ ] Menu terdaftar di `layouts/nav-config-dashboard.tsx`
- [ ] Manual test: list, create, view, edit, delete, approve/reject (jika ada)
- [ ] Empty state & loading state tampil benar
- [ ] Dialog pakai `transitionDuration` snappy
- [ ] Tidak ada mock data — semua dari BE via hook
- [ ] Semua string user-facing pakai `t()` — JSON id & en paralel, tidak ada hardcoded literal
