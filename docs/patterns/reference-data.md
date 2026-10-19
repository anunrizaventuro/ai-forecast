# Pattern: Reference Data (Cached Hooks)

Data yang sering dipakai untuk dropdown / lookup — branches, accounts, contacts, dll. — **harus pakai module-level cached hook**. Kalau tidak, akan N+1 fetch (setiap table row fetch sendiri).

## Pattern

Module-level `cache` + `inFlight` promise + React `useState` + `useEffect`. **Wajib**: self-register ke `cache-registry` dan depend pada `companyVersion` supaya otomatis refetch saat user switch company (detail di [§ Company-scoped invalidation](#company-scoped-invalidation)).

### Cache tanpa parameter (mis. branches)

```ts
// src/module/core/features/branches/hooks/use-branches.ts
import i18n from 'i18next'; // for error fallback messages in non-React scope
import { registerCompanyCacheInvalidator } from 'src/shared/lib/cache-registry';
import { useAuthContext } from 'src/module/core/features/auth/hooks/use-auth-context';

let cache: Branch[] | null = null;
let inFlight: Promise<Branch[]> | null = null;

function ensure(): Promise<Branch[]> {
  if (cache) return Promise.resolve(cache);
  if (!inFlight) {
    inFlight = listBranches({ is_active: true, limit: 100 })
      .then((data) => { cache = data; return data; })
      .catch((err) => { inFlight = null; throw err; });  // allow retry on error
  }
  return inFlight;
}

export function invalidateBranchesCache() {
  cache = null;
  inFlight = null;
}

// Self-register so AuthProvider.switchCompany() clears this cache.
registerCompanyCacheInvalidator(invalidateBranchesCache);

export function useBranches() {
  const { companyVersion } = useAuthContext();
  const [state, setState] = useState(() => ({
    data: cache ?? [],
    loading: !cache,
    error: null as string | null,
  }));

  useEffect(() => {
    // Cache hit (hydration-time or across components) — sync local state and skip fetch.
    if (cache) {
      setState({ data: cache, loading: false, error: null });
      return;
    }
    // Cache miss (first load OR after switchCompany invalidated) — re-enter loading.
    setState((s) => ({ ...s, loading: true, error: null }));
    ensure()
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err) => setState({
        data: [], loading: false,
        error: err instanceof Error ? err.message : i18n.t('fund-transfer:errors.loadData'),
      }));
  }, [companyVersion]);

  const byId = useMemo(() => new Map(state.data.map((b) => [b.id, b])), [state.data]);

  return {
    ...state,
    getById: (id: string | null | undefined) => (id ? byId.get(id) : undefined),
  };
}
```

### Cache dengan parameter (mis. accounts by type)

```ts
// src/module/finance/features/chart-of-accounts/hooks/use-accounts.ts
import { registerCompanyCacheInvalidator } from 'src/shared/lib/cache-registry';
import { useAuthContext } from 'src/module/core/features/auth/hooks/use-auth-context';

const caches = new Map<string, Account[]>();
const inFlights = new Map<string, Promise<Account[]>>();

function cacheKey(params: AccountListParams): string {
  return JSON.stringify(params);
}

function ensure(params: AccountListParams): Promise<Account[]> {
  const key = cacheKey(params);
  const cached = caches.get(key);
  if (cached) return Promise.resolve(cached);
  const existing = inFlights.get(key);
  if (existing) return existing;

  const promise = listAccounts(params)
    .then((data) => { caches.set(key, data); inFlights.delete(key); return data; })
    .catch((err) => { inFlights.delete(key); throw err; });
  inFlights.set(key, promise);
  return promise;
}

export function invalidateAccountsCache() {
  caches.clear();
  inFlights.clear();
}

registerCompanyCacheInvalidator(invalidateAccountsCache);

export function useAccounts(params: AccountListParams = {}) {
  const { companyVersion } = useAuthContext();
  const key = cacheKey(params);
  const stableParams = useMemo(() => params, [key]);  // eslint-disable react-hooks/exhaustive-deps

  const [state, setState] = useState(() => {
    const cached = caches.get(key);
    return { data: cached ?? [], loading: !cached, error: null };
  });

  useEffect(() => {
    const cached = caches.get(key);
    if (cached) { setState({ data: cached, loading: false, error: null }); return; }
    setState((s) => ({ ...s, loading: true, error: null }));
    ensure(stableParams)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err) => setState({ data: [], loading: false, error: err.message }));
  }, [key, stableParams, companyVersion]);

  const byId = useMemo(() => new Map(state.data.map((a) => [a.id, a])), [state.data]);
  return { ...state, getById: (id) => (id ? byId.get(id) : undefined) };
}
```

## Usage di komponen

Setiap komponen yang butuh lookup:

```tsx
const branchesQuery = useBranches();
const accountsQuery = useAccounts({ account_type: 'asset', is_active: true, is_header: false });

// Di table row — lookup by id
const fromAccount = accountsQuery.getById(row.from_account_id);
const toBranch = branchesQuery.getById(row.to_branch_id);

// Di Select options
<Field.Select name="from_account_id">
  {accountsQuery.data.map((a) => <MenuItem key={a.id} value={a.id}>{a.code} — {a.name}</MenuItem>)}
</Field.Select>
```

**Semua komponen share cache** — 30 table rows + 4 Select fields di form = **2x fetch total** (1 branches, 1 accounts with asset filter), bukan 68x.

## Company-scoped invalidation

Semua data reference di proyek ini **scoped per-company**. Saat user pindah company via `switchCompany(...)`, cache modul dan state hook harus di-flush — kalau tidak, dropdown/table masih tampilkan data company sebelumnya.

### Registry (auto-invalidate)

`src/shared/lib/cache-registry.ts` adalah publish/subscribe kecil. Pola pakainya:

1. Tiap cached-hook file **self-register** invalidator-nya di top-level module scope (lihat [§ Pattern](#pattern) di atas).
2. `AuthProvider.switchCompany(...)` panggil `invalidateAllCompanyCaches()` sekali — semua invalidator ter-register jalan.
3. Setelah invalidate, `AuthProvider` bump `companyVersion: prev + 1` di state.
4. Tiap hook pakai `companyVersion` dari `useAuthContext()` sebagai deps di effect-nya → effect jalan ulang → cache miss → fetch ulang dengan token company baru.

Kenapa dua lapis (registry + version)?

- **Registry** bersihkan module-level state yang tidak live di React (cache Map, inFlight promise) — tidak bisa dipicu cuma dari re-render.
- **`companyVersion`** bikin semua hook (termasuk list hooks yang **tidak** punya module-level cache) refetch — effect butuh dependency value, bukan sekadar side-effect global.

Kenapa tidak `AuthProvider` langsung import tiap `invalidateXxxCache()`? Akan bikin dependency balik dari `core/auth` ke feature modules — feature shouldn't force-couple auth.

### Checklist untuk hook baru

Kalau hook-mu fetch data dari endpoint yang di-scope company BE:

- **Cached (module-level) hook** — wajib:
  - [ ] Export `invalidateXxxCache()` (clear `cache`/`caches` + `inFlight`/`inFlights`)
  - [ ] Panggil `registerCompanyCacheInvalidator(invalidateXxxCache)` di top-level
  - [ ] Baca `companyVersion` dari `useAuthContext()` dan masukkan ke deps effect
  - [ ] Cabang `if (cache) { setState(...); return; }` **wajib** `setState` (bukan sekadar `return`) — karena setelah switch, cache hit akan kembali terjadi ketika hook re-mounted di company lama, harus resync; dan saat cache miss post-switch effect perlu reset ke loading

- **List/pagination hook** (tanpa module-level cache — `useBranchList`, `useContactList`, `useFundTransferList`, dll) — wajib:
  - [ ] Baca `companyVersion` dari `useAuthContext()`
  - [ ] Masukkan ke deps effect yang fetch:
    ```ts
    useEffect(() => { load(); }, [load, companyVersion]);
    ```
  - List hooks tidak perlu register ke registry (tidak ada module-level cache untuk di-clear).

### Manual invalidation

Selain company switch, panggil `invalidateXxxCache()` manual **setelah mutate master data yang sama** — mis. setelah bikin branch baru panggil `invalidateBranchesCache()` sebelum refetch list, supaya dropdown di form lain ikut fresh.

## Current modules

| Hook | File | Cache type | Registry |
|---|---|---|---|
| `useBranches` | [use-branches.ts](../../src/module/core/features/branches/hooks/use-branches.ts) | Single (parameter-less) | ✅ |
| `useRoles` | [use-roles.ts](../../src/module/core/features/roles/hooks/use-roles.ts) | Single (parameter-less) | ✅ |
| `useAccounts(params)` | [use-accounts.ts](../../src/module/finance/features/chart-of-accounts/hooks/use-accounts.ts) | Keyed by params | ✅ |
| `useAccountMeta` | [use-account-meta.ts](../../src/module/finance/features/chart-of-accounts/hooks/use-account-meta.ts) | Single (parameter-less) | ✅ |
| `useContacts(type?)` | [use-contacts.ts](../../src/module/finance/features/contacts/hooks/use-contacts.ts) | Keyed by contact type | ✅ |
| `useBranchVisibility()` | [use-branch-visibility.ts](../../src/shared/hooks/use-branch-visibility.ts) | Wrapper di atas `useBranches` | (via useBranches) |

Pattern sama untuk hook baru — jangan lupa self-register ke cache-registry.

## `useBranchVisibility` — wrapper untuk single-branch UX

Kalau user cuma punya 1 cabang, field picker cabang tidak perlu tampil — cuma bikin form makin panjang. Nilainya tetap harus di-submit ke BE. Wrapper ini return flag `showBranch` + `defaultBranchId`:

```ts
// src/shared/hooks/use-branch-visibility.ts
export function useBranchVisibility() {
  const { data } = useBranches();
  return useMemo(() => {
    const branches = data ?? [];
    const show = branches.length > 1;
    const fallback = branches.length === 1
      ? branches[0].id
      : (branches.find((b) => b.is_default)?.id ?? '');
    return {
      branches,
      showBranch: show,
      defaultBranchId: fallback,
      branchNameById: new Map(branches.map((b) => [b.id, b.name] as const)),
    };
  }, [data]);
}
```

Usage di form:
```tsx
const { branches, showBranch, defaultBranchId } = useBranchVisibility();

// defaultValues (new mode)
{ branch_id: defaultBranchId, ... }

// JSX
{showBranch && (
  <Field.Select name="branch_id" label={t('form.branch')}>
    {branches.map((b) => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
  </Field.Select>
)}

// Layout grid adaptif (2 kolom kalau single-branch, 3 kalau multi)
<Box sx={{
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', md: showBranch ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' }
}}>
```

Reusable di semua feature finance — cash-transactions, fund-transfer, journal-entry, dll.

## Kenapa tidak pakai React Query / SWR?

Stack proyek ini sengaja minimal. Pattern di atas sudah cukup untuk reference data yang semi-static dan jarang berubah. Kalau suatu saat butuh invalidation kompleks, optimistic update, atau mutation hook dengan rollback — baru pertimbangkan React Query.

## Jangan

- ❌ Fetch langsung di TableRow tanpa cache — langsung N+1
- ❌ Pass data via props dari parent ke semua row component (bikin coupling)
- ❌ Pakai Context Provider untuk data yang simple read-only (over-engineering)
- ❌ Bikin cached hook baru tanpa `registerCompanyCacheInvalidator(...)` — data company lama akan bocor setelah switch
- ❌ Bikin list/pagination hook baru tanpa `companyVersion` di deps effect — list tidak refresh setelah switch company
- ❌ Import `invalidateXxxCache` langsung dari `auth-provider.tsx` — bikin dependency balik; pakai registry
- ❌ Cabang `if (cache) return;` di effect tanpa `setState(...)` di dalamnya — kalau cache di-invalidate lalu re-isi saat hook lain, hook ini tidak sync
