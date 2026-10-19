# Migrasi ke venturo-skeleton-react — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti fondasi Next.js ai-forecast-fe dengan venturo-skeleton-react (Vite + React Router 7 + MUI 7) dan pindahkan enam halaman forecast ke struktur & gaya skeleton tanpa mengubah perhitungan.

**Architecture:** Isi skeleton (commit HEAD `f0f95e2`) disalin ke repo ini menggantikan semua file Next; auth/core skeleton disimpan tapi dimatikan (`CONFIG.auth.skip`). Kode domain forecast pindah ke `src/module/forecast/` (pola `features/<halaman>/{pages,views,components}` + `shared/`). TanStack Query diganti hook cache kecil di atas axios bersama skeleton; generator simulasi & `forecast-utils` dipindah utuh dan dibuktikan setara lewat skrip baseline.

**Tech Stack:** Vite 7, React 19, React Router 7, MUI 7, `@mui/x-charts` 9, `@mui/x-date-pickers` 8, RHF + Zod 4, axios, dayjs, yarn 1.22.22, Node ≥ 22.12.

**Spec:** [docs/superpowers/specs/2026-10-19-migrasi-skeleton-react-design.md](../specs/2026-10-19-migrasi-skeleton-react-design.md)

**Path singkat:** `SK=/Users/user/Documents/Claude/Projects/Venturo-sekeleton/venturo-skeleton-react`, repo = `/Users/user/Documents/Claude/Projects/ai-forecast/ai-forecast-fe`.

## Global Constraints

- Yarn 1.22.22 saja; jangan pernah commit `package-lock.json`. Node ≥ 22.12 (`.nvmrc`).
- Import absolut `src/...`; urutan import diurus `yarn lint:fix` (perfectionist error-level).
- `import type` untuk import tipe-saja.
- Dev & preview di port **8002**.
- Teks UI forecast: Bahasa Indonesia ditulis langsung (bukan `t()`); bahasa i18next dikunci `id`.
- Tidak ada request ke `/core/v1/*` atau translation-override saat runtime (`CONFIG.auth.skip = true`).
- `.env.prod`/`.env` skeleton (kredensial Firebase) TIDAK disalin.
- `forecast-utils.ts`, generator simulasi, dan `DEFAULT_REC_PARAMS` pindah tanpa perubahan logika (hanya path import).
- Setiap halaman forecast menampilkan penanda sumber: `simulasi` atau `data asli · baseline`.
- Gerbang tiap task: `yarn lint && yarn fm:check && yarn tsc:check && yarn build` hijau (mulai Task 1). Tidak ada test runner — "test" di plan ini = skrip baseline + cek browser yang disebut eksplisit.
- Commit per task di branch `feat/skeleton-react`; pesan commit diakhiri baris `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.

## Review Focus

1. **Backend mati di mode `api`** — tiap halaman menampilkan `ForecastDataState` (pesan error + tombol Coba lagi), tidak blank/crash. Cek di Task 11 dengan `VITE_SERVER_URL` menunjuk port kosong.
2. **Ganti filter cepat berturut-turut** — respons lama yang datang belakangan tidak menimpa data filter terbaru, dan data lama tetap tampil (tidak berkedip ke skeleton) selama memuat. Dipin di Task 4 (abort + `requestId`) dan dicek di Task 6.
3. **Simpan Pengaturan** — setelah PUT sukses, semua data forecast (kecuali settings) dimuat ulang; di mode simulasi rekomendasi langsung berubah. 404 dari endpoint settings = pakai default tanpa retry. Dicek di Task 10.
4. **Buka bookmark lama `/dashboard/...`** — redirect ke path baru; path tak dikenal → 404 skeleton. Dicek di Task 2.
5. **localStorage berisi pengaturan rusak/versi lama** — `parseStoredSettings` mengembalikan `null` → default, tidak crash. Logika dipindah utuh (Task 3); dicek manual di Task 10.

---

### Task 0: Branch kerja + baseline perhitungan

Mengunci angka acuan dari kode Next sebelum dihapus.

**Files:**
- Create: `scripts/forecast-baseline.ts`
- Create: `scripts/forecast-baseline.json` (output, di-commit)

**Interfaces:**
- Produces: `scripts/forecast-baseline.ts` dengan satu blok import dari `forecast-utils` (Task 3 hanya mengganti path-nya). Output JSON berbentuk `{ summary, products, kec, storesTop10, series: { harian, mingguan }, recommendations: { total, summary, first20 } }`.

- [ ] **Step 1: Buat branch & skrip baseline**

```bash
git switch -c feat/skeleton-react   # dari staging
```

`scripts/forecast-baseline.ts` mengimpor `forecastCells, DEFAULT_FILTERS, DEFAULT_REC_PARAMS, filterCells, summarize, groupByProduct, groupByKec, groupByStore, timeSeries, computeRecommendations, summarizeRecommendations, PERIOD` dari `src/sections/forecast/forecast-utils` (Task 3 hanya mengganti path ini), lalu `console.log(JSON.stringify(result, null, 2))` dengan:
- `summary` = `summarize(filterCells(forecastCells, DEFAULT_FILTERS))`
- `products` = `groupByProduct(...)`, `kec` = `groupByKec(...)`, `storesTop10` = 10 pertama `groupByStore(...)`
- `series.harian` / `series.mingguan` = `timeSeries(..., 'harian' | 'mingguan')` (cek signature aslinya di `forecast-utils.ts:277`)
- `recommendations` dari `computeRecommendations(...)` dengan `asOf = PERIOD.end` dan `DEFAULT_REC_PARAMS` (cek signature di `forecast-utils.ts:383`): `total` = panjang, `summary` = `summarizeRecommendations(recs)`, `first20` = 20 pertama.

- [ ] **Step 2: Jalankan & simpan**

```bash
$SK/node_modules/.bin/esbuild scripts/forecast-baseline.ts --bundle --platform=node --format=esm --tsconfig=tsconfig.json --outfile=/tmp/fb.mjs && node /tmp/fb.mjs > scripts/forecast-baseline.json
```
Expected: file JSON non-kosong; `recommendations.total` > 0.

- [ ] **Step 3: Commit** — `chore: baseline perhitungan forecast sebelum migrasi` (sertakan spec & plan di `docs/superpowers/`)

---

### Task 1: Ganti fondasi Next → skeleton React

**Files:**
- Delete: `src/` (seluruhnya; kode forecast diambil lagi dari git `staging` di Task 3–10), `next.config.ts`, `next-env.d.ts`, `.next/`, `Dockerfile`, `docker-compose.yml` (ditulis ulang Task 11), `public/` lama (simpan dulu logo/favicon/OG ke `/tmp/old-public` untuk Task 2), `eslint.config.mjs`, `prettier.config.mjs`, `tsconfig.json`, `.prettierignore`, `.dockerignore`, `.editorconfig`, `docs/distribution.md`, `docs/branding.md`, `docs/recipes/`
- Copy dari `git -C $SK archive HEAD`: semua kecuali `.env.prod`, `.env`, `package-lock.json`, `vercel.json`, `.claude/`, `.DS_Store`, `CLAUDE.md`, `README.md`
- Keep: `.git`, `.husky/`, `.nvmrc`, `Jenkinsfile`, `docs/superpowers/`, `docs/deployment.md`, `scripts/`
- Modify: `package.json`, `vite.config.ts`, `.gitignore`, `.env.example`
- Delete (skeleton demo): `src/module/dashboard/features/{finance,monitoring,sales}`, `src/module/core/features/home`, `src/locales/langs/*/dashboard.json` bila hanya dipakai demo

- [ ] **Step 1: Salin skeleton**

```bash
mkdir -p /tmp/sk && git -C $SK archive HEAD | tar -x -C /tmp/sk
rm -f /tmp/sk/{.env.prod,.env,package-lock.json,vercel.json,CLAUDE.md,README.md}; rm -rf /tmp/sk/.claude
```
Hapus file Next (daftar di atas), lalu `rsync -a /tmp/sk/ ./`.

- [ ] **Step 2: `package.json`**
- `name: "@venturo/ai-forecast-web"`, `version: "0.1.0"`, `author: "Venturo"`, `description: "AI Forecast — dashboard distribusi roti & rekomendasi stok"`.
- Tambah skrip `"tsc:check": "tsc --noEmit --pretty"`, `"prepare": "husky"`; `fix:all` → `yarn lint:fix && yarn fm:fix`; `clean` tanpa `.next`; hapus `re:build-npm`.
- Tambah devDeps `husky`, `lint-staged` (versi dari `package.json` staging) dan blok `lint-staged` yang sama dengan staging.
- `engines.node: ">=22.12.0"`.

- [ ] **Step 3: Port & ignore** — `vite.config.ts`: `PORT = 8002`. `.gitignore`: tambah `package-lock.json`, `.env`, `.env.prod`, `dist`, `.DS_Store`, `.superpowers/`.

- [ ] **Step 4: Buang demo skeleton** — hapus folder demo (daftar di atas); pindahkan `src/module/dashboard/components/{kpi-card,chart-card}.tsx` → `src/shared/ui/dashboard-card/` (+ `index.ts`) dan `src/module/dashboard/utils/format.ts` ikut ke sana bila dipakai keduanya; hapus sisa `src/module/dashboard`. Route & nav yang menunjuk demo/home dihapus sementara; `/` menampilkan placeholder `<Box>AI Forecast</Box>` sampai Task 2.

- [ ] **Step 5: Install & gate**

```bash
rm -rf node_modules && yarn install && yarn lint:fix && yarn fm:fix && yarn lint && yarn fm:check && yarn tsc:check && yarn build
```
Expected: semua hijau; `ls package-lock.json` → tidak ada.

- [ ] **Step 6: Cek dev** — `yarn dev` → `http://localhost:8002/` menampilkan shell skeleton.

- [ ] **Step 7: Commit** — `refactor!: ganti fondasi Next.js dengan venturo-skeleton-react`

---

### Task 2: Shell tanpa login, identitas app, route & nav forecast

**Files:**
- Modify: `src/shared/config/index.ts`, `src/app.tsx`, `src/module/core/features/auth/context/jwt/auth-provider.tsx`, `src/layouts/dashboard/layout.tsx`, `src/layouts/nav-config-dashboard.tsx`, `src/routes/paths.ts`, `src/routes/sections/{index,dashboard}.tsx`, `src/locales/locales-config.ts`, `index.html`, `.env.example`
- Create: `public/robots.txt`, `src/module/forecast/features/<halaman>/pages/index.tsx` ×6 (placeholder)

**Interfaces:**
- Produces: `CONFIG.forecastSource: 'simulasi' | 'api'`, `CONFIG.companySlug: string` (boleh `''`), `CONFIG.serverUrl`, `CONFIG.appName = 'AI Forecast'`, `CONFIG.auth.skip = true`.
- Produces: `paths.dashboard = { root: '/', recommendation: '/rekomendasi-stok', salesAnalysis: '/analisis-penjualan', stores: '/toko', products: '/produk', settings: '/pengaturan' }`. Path core (`paths.auth`, `paths.dashboard.settings*` core) diganti nama ke `paths.core.*` supaya tidak bentrok dengan `settings` forecast.
- Produces: tiap `src/module/forecast/features/{dashboard,recommendation,sales-analysis,stores,products,settings}/pages/index.tsx` default-export page; Task 6–10 mengisi view-nya.

- [ ] **Step 1: Config + env** — `src/shared/config/index.ts` membaca `import.meta.env` lewat satu skema zod: `VITE_SERVER_URL` (`z.url()` bila `VITE_FORECAST_SOURCE === 'api'`, selain itu boleh kosong), `VITE_FORECAST_SOURCE` (`enum ['simulasi','api']`, default `simulasi`), `VITE_COMPANY_SLUG` (default `''`), `VITE_ASSETS_DIR` (default `''`), `VITE_FIREBASE_*` (default `''`). Gagal parse → `throw new Error('[env] ...')` dengan daftar field (gaya `src/lib/env.ts` lama). `.env.example` mendokumentasikan semuanya dalam Bahasa Indonesia; tambah tipe di `src/vite-env.d.ts`.

- [ ] **Step 2: Matikan runtime core** — `app.tsx`: render `<OnboardingDialog />` dan `<TranslationOverrideSync />` hanya bila `!CONFIG.auth.skip`. `AuthProvider`: bila `CONFIG.auth.skip`, jangan panggil `checkUserSession()`; set state `loading: false`, tanpa user. `layout.tsx`: sembunyikan `AccountDrawer` bila `auth.skip` (LanguagePopover sudah dikomentari). `locales-config.ts`: `fallbackLng = 'id'`; `i18n-provider.tsx`: inisialisasi selalu `lng: 'id'` (abaikan localStorage). `supportedLngs` dibiarkan.

- [ ] **Step 3: Route & nav** — `routes/sections/dashboard.tsx`: anak route `index` → Dashboard, `rekomendasi-stok`, `analisis-penjualan`, `toko`, `produk`, `pengaturan` (lazy dari `src/module/forecast/features/*/pages`); route core (branches/roles/users/translation-override) dan `authRoutes` hanya didaftarkan bila `!CONFIG.auth.skip`. Tambah redirect `<Navigate replace>`: `/dashboard` → `/`, `/dashboard/rekomendasi-stok` → `/rekomendasi-stok`, dst. untuk keenam path. `nav-config-dashboard.tsx`: satu section berisi enam item dengan label hardcode `Dashboard`, `Rekomendasi Stok`, `Analisis Penjualan`, `Data Toko`, `Data Produk`, `Pengaturan` (ikon dari `public/assets/icons/navbar/`: `ic-dashboard`, `ic-order`, `ic-analytics`, `ic-ecommerce` (toko), `ic-product`, `ic-parameter` — pilih yang ada).

- [ ] **Step 4: Identitas** — `index.html`: `lang="id"`, `<title>AI Forecast</title>`, `<meta name="robots" content="noindex, nofollow">`, `<meta name="description" content="Dashboard analisis distribusi roti dan rekomendasi stok.">`. `public/robots.txt`: `User-agent: *\nDisallow: /`. Logo/favicon: pakai dari `/tmp/old-public` bila ada logo AI Forecast/Venturo, ganti `src/shared/ui/logo` agar menunjuk file itu.

- [ ] **Step 5: Gate + cek browser** — gerbang global hijau. `yarn dev`, buka `/`: sidebar enam menu, tidak ada redirect ke sign-in; DevTools Network: tidak ada request ke `/core/v1` atau translation; `/dashboard/toko` → URL jadi `/toko`; `/xyz` → 404.

- [ ] **Step 6: Commit** — `feat: shell tanpa login, route & nav AI Forecast`

---

### Task 3: Inti domain forecast (types, simulasi, rumus)

**Files (ambil dari `git show staging:<path>`):**
- Create: `src/module/forecast/shared/types/index.ts` ← `src/types/forecast.ts`
- Create: `src/module/forecast/shared/data/simulasi.ts` ← `src/_mock/_forecast.ts`
- Create: `src/module/forecast/shared/utils/forecast-utils.ts` ← `src/sections/forecast/forecast-utils.ts`
- Create: `src/module/forecast/shared/utils/format-number.ts` ← `src/utils/format-number.ts`
- Create: `src/module/forecast/shared/utils/recommendation-params-schema.ts` ← `src/sections/forecast/recommendation-params-schema.ts`
- Create: `src/module/forecast/shared/utils/index.ts`
- Modify: `scripts/forecast-baseline.ts` (path import saja)

**Interfaces:**
- Produces: semua export file-file di atas dengan nama & signature identik dengan versi staging (`PERIOD`, `DEFAULT_REC_PARAMS`, `DEFAULT_FILTERS`, `filterCells`, `summarize`, `timeSeries`, `groupBy*`, `computeRecommendations`, `summarizeRecommendations`, `fDate*`, `fNumber`, `fCurrency`, `fShortCurrency`, `fPercent`, `recParamsFormSchema`, `toFormValues`, `toParams`, `API_FIELD_TO_FORM`, `parseStoredSettings`, …).

- [ ] **Step 1: Salin & ubah hanya path import** (`src/types/forecast` → `src/module/forecast/shared/types`, dst.). Diff isi selain baris import harus kosong:

```bash
for p in "src/sections/forecast/forecast-utils.ts:src/module/forecast/shared/utils/forecast-utils.ts" ...; do diff <(git show staging:${p%%:*} | grep -v '^import\|^} from') <(grep -v '^import\|^} from' ${p##*:}); done
```
Expected: tidak ada output (kecuali perubahan urutan import dari lint:fix).

- [ ] **Step 2: Baseline setara** — ubah path import di `scripts/forecast-baseline.ts` ke `src/module/forecast/shared/utils`, lalu:

```bash
node_modules/.bin/esbuild scripts/forecast-baseline.ts --bundle --platform=node --format=esm --tsconfig=tsconfig.json --outfile=/tmp/fb2.mjs && node /tmp/fb2.mjs | diff - scripts/forecast-baseline.json
```
Expected: tidak ada output (identik).

- [ ] **Step 3: Gate + commit** — `refactor(forecast): pindahkan types, simulasi & rumus ke module/forecast`

---

### Task 4: API layer + hook data tanpa TanStack Query

**Files:**
- Create: `src/shared/api/envelope.ts` (angkat `ApiEnvelope<T>` & `unwrap<T>()` dari `module/core/features/auth/{types,api}`; auth meng-import dari sini)
- Create: `src/module/forecast/shared/api/{endpoints.ts,schemas.ts,index.ts}`
- Create: `src/module/forecast/shared/hooks/{use-forecast-query.ts,use-forecast-data.ts,use-recommendation-params.ts,index.ts}`
- Modify: `src/shared/lib/axios.ts` (header `X-Company-Slug` bila `CONFIG.companySlug`)

**Interfaces:**
- Consumes: Task 3 types/utils; `CONFIG.forecastSource`, `CONFIG.companySlug`.
- Produces (api): `forecastEndpoints = { meta: '/api/v1/forecast/meta', summary, timeseries, products, regions, stores, recommendations, settings }`; schemas zod persis dari `staging:src/lib/api/forecast.ts`; fetcher `getForecastMeta(opts?)`, `getForecastSummary(p, opts?)`, `getForecastTimeseries(p, granularity, opts?)`, `getForecastProducts`, `getForecastRegions`, `getForecastStores`, `getForecastRecommendations(p, opts?)`, `getForecastSettings(opts?)`, `updateForecastSettings(params)` — `opts = { signal?: AbortSignal }`, implementasi `unwrap(axios.get(url, { params: clean(p), signal }))` lalu `schema.parse(data)`. Error axios sudah dinormalisasi jadi `Error & { status?: number }` oleh interceptor skeleton; pakai `err.status === 404`.
- Produces (hook): `useForecastQuery<T>(key: readonly unknown[], fetcher: (signal: AbortSignal) => Promise<T>, opts?: { enabled?: boolean; retry?: (count: number, err: Error) => boolean }): { data: T | undefined; isPending: boolean; isFetching: boolean; error: Error | null; refetch(): void }` dan `invalidateForecast(predicate?: (key: readonly unknown[]) => boolean): void`, `setForecastData(key, data): void`.
- Produces: `use-forecast-data.ts` dan `use-recommendation-params.ts` dengan export & tipe identik dengan staging (`IS_API`, `ForecastResult<T>`, `useForecastMeta`, `useForecastSummary`, `useForecastSeries`, `useForecastProducts`, `useForecastRegions`, `useForecastStores`, `useStoreSales`, `useForecastRecommendations`, `useRecommendationParams`, `RecommendationParamsResult`) — hanya isi TanStack diganti `useForecastQuery`. Key factory `forecastKeys` dipertahankan.

- [ ] **Step 1: `useForecastQuery`** — cache module-level `Map<string, { data?, error?, promise?, updatedAt }>` per `JSON.stringify(key)` + `Set` listener; perilaku wajib:
  - data terakhir yang sukses untuk hook itu tetap dikembalikan saat key berubah (setara `keepPreviousData`) — `isPending` hanya true bila hook belum pernah punya data;
  - request in-flight per key di-dedupe; saat key berubah / unmount, `AbortController` request lama di-abort dan hasilnya dibuang;
  - retry default 1x kecuali `opts.retry` menolak;
  - `invalidateForecast(pred)` menghapus entri yang cocok dan memicu refetch hook yang sedang mount dengan key itu;
  - `enabled: false` → tidak fetch, `isPending: false`.
  Meta di-cache permanen per sesi (tidak pernah di-invalidate kecuali eksplisit).

- [ ] **Step 2: Port hook** — salin `staging:src/sections/forecast/use-forecast-data.ts` & `use-recommendation-params.ts`, ganti `useQuery/useMutation/useQueryClient` dengan `useForecastQuery` + state `saving` lokal; `save()` di mode api: `await updateForecastSettings(p)` → `setForecastData(forecastKeys.settings, data)` → `invalidateForecast((k) => k[1] !== 'settings')`. Retry settings: tidak retry bila `status === 404`. Mode simulasi tak berubah (`useSyncExternalStore` localStorage).

- [ ] **Step 3: Gate** — gerbang global hijau; `grep -r "@tanstack" src package.json` → kosong.

- [ ] **Step 4: Commit** — `feat(forecast): API layer axios + hook data tanpa TanStack Query`

---

### Task 5: Komponen forecast bersama (gaya skeleton)

**Files (`src/module/forecast/shared/components/`):**
- `forecast-page-header.tsx` — bungkus `PageHeader` skeleton + chip penanda sumber
- `forecast-source-chip.tsx` — `simulasi` (warna warning) / `data asli · baseline` (warna info), dari `IS_API`
- `forecast-simulation-alert.tsx` — port isi staging, ganti komponen ke skeleton
- `forecast-data-state.tsx` — port isi staging
- `forecast-filter-bar.tsx` — port; rentang pakai `DateRangePicker` skeleton
- `forecast-kpi-grid.tsx` — pakai `KpiCard` dari `src/shared/ui/dashboard-card`
- `forecast-trend-chart.tsx` — `ChartCard` + `LineChart`/`BarChart` `@mui/x-charts`
- `forecast-bar-list.tsx`, `forecast-segment-bar.tsx` — `BarChart` horizontal / stacked `@mui/x-charts`
- `forecast-cells.tsx`, `forecast-chart-colors.ts` — port (`Label` & `Iconify` skeleton)
- `forecast-table.ts` — helper `sortRows` (port) di atas `useTable` skeleton
- `index.ts`
- Modify: `src/shared/ui/date-range-picker/{date-range-picker.tsx,use-date-range-picker.ts}`

**Interfaces:**
- Consumes: Task 4 hooks; `PageHeader` (`title, subtitle?, crumbs?, action?, sx?`); `KpiCard`, `ChartCard`; `useTable`, `TableHeadCustom` (`headCells: { id, label?, width?, align? }[]`, `order`, `orderBy`, `onSort`), `TablePaginationCustom`, `TableNoData`, `TableSkeleton`.
- Produces: props komponen sama dengan versi staging (`ForecastFilterBar({ filters, onChange, dateMode?: 'range'|'asOf'|'none', showStore?, showProduct?, children? })`, `ForecastKpiGrid({ summary, points, hideSalesValue? })`, `ForecastTrendChart({ categories, series: TrendSeries[], height?, ariaLabel? })`, `ForecastBarList({ items: BarListItem[], series, unit?, emptyText?, ranked? })`, `ForecastSegmentBar<K>`, `ForecastDataState({ error, fetching, onRetry })`, `ForecastPageHeader({ title, description?, icon?, action? })`) supaya view bisa dipindah dengan perubahan minimal. `useTableState`/`ForecastTableHead`/`ForecastTablePagination` lama DIHAPUS — view memakai toolkit skeleton langsung (`useTable({ defaultDense: true, defaultRowsPerPage: 25, defaultOrderBy, defaultOrder })`).
- Produces (picker): `DateRangePicker` props tambahan opsional `presets?: { label: string; start: string; end: string }[]`, `minDate?: string`, `maxDate?: string`. Tanpa prop ini perilaku lama tak berubah.

- [ ] **Step 1: Perluas `DateRangePicker`** — bila `presets` diberikan, daftar preset di popover/dialog diganti daftar itu (aktif = yang `start/end`-nya sama); `minDate/maxDate` diteruskan ke `DateCalendar`/`DatePicker`.
- [ ] **Step 2: Port komponen** — filter bar: mode `range` → `DateRangePicker` dengan `presets` = lima `PRESETS` staging (`Periode inti`, `14 hari terakhir`, `7 hari terakhir`, `September 2026`, `Agustus 2026 (19–31)`), `minDate=PERIOD.start`, `maxDate=PERIOD.end` (mode api: dari `meta.period`); mode `asOf` → `DatePicker` tunggal seperti staging; Autocomplete toko & produk + tombol reset seperti staging.
- [ ] **Step 3: Gate + commit** — `feat(forecast): komponen bersama bergaya skeleton`

---

### Task 6: Halaman Dashboard

**Files:**
- Create: `src/module/forecast/features/dashboard/views/dashboard-view.tsx`
- Create: `src/module/forecast/features/dashboard/components/{dashboard-hero,dashboard-recommendation-summary,dashboard-top-products}.tsx`
- Modify: `src/module/forecast/features/dashboard/pages/index.tsx`

**Interfaces:**
- Consumes: Task 4 hooks, Task 5 komponen. Sumber: `staging:src/sections/forecast/{view/dashboard-view,dashboard-hero,dashboard-recommendation-summary,dashboard-top-products,forecast-stat-strip,recommendation-mix}.tsx`.

- [ ] **Step 1: Port** — susunan & informasi sama dengan staging; kerangka halaman `<Box sx={{ p: { xs: 2, md: 3 } }}>` seperti view skeleton; hero/ringkasan memakai `Card`, grafik di `ChartCard`, KPI di `ForecastKpiGrid`. `RecommendationMix` & `ForecastStatStrip` dipindah ke `src/module/forecast/shared/components/` bila juga dipakai Rekomendasi.
- [ ] **Step 2: Gate + cek browser (simulasi)** — angka KPI & "total rekomendasi" di Dashboard sama dengan `scripts/forecast-baseline.json` (`summary`, `recommendations.summary`) pada filter default; ganti preset 3x cepat → tidak berkedip kosong, angka akhir sesuai preset terakhir.
- [ ] **Step 3: Commit** — `feat(forecast): halaman Dashboard`

---

### Task 7: Halaman Rekomendasi Stok

**Files:**
- Create: `src/module/forecast/features/recommendation/views/recommendation-view.tsx`
- Create: `src/module/forecast/features/recommendation/components/{recommendation-cells,recommendation-delta,recommendation-empty,recommendation-group,recommendation-method,recommendation-sales-list,recommendation-store-list,store-detail-drawer}.tsx`
- Modify: `.../recommendation/pages/index.tsx`

**Interfaces:**
- Consumes: `useForecastRecommendations`, `useStoreSales`, `useRecommendationParams`, `ForecastFilterBar` (`dateMode="asOf"`), `RecommendationMix`.

- [ ] **Step 1: Port** — tabel di `recommendation-group` memakai toolkit tabel skeleton (dense). Detail toko tetap `Drawer` (isi sama).
- [ ] **Step 2: Gate + cek browser** — jumlah baris & ringkasan (naik/turun/tetap/dikecualikan) sama dengan `recommendations.summary` baseline; klik toko → drawer detail; filter status dari mix berfungsi.
- [ ] **Step 3: Commit** — `feat(forecast): halaman Rekomendasi Stok`

---

### Task 8: Halaman Analisis Penjualan

**Files:** `src/module/forecast/features/sales-analysis/{views/sales-analysis-view.tsx,components/analysis-product-table.tsx,pages/index.tsx}`

- [ ] **Step 1: Port** dari `staging:src/sections/forecast/{view/sales-analysis-view,analysis-product-table,forecast-trend-card}.tsx`; tren di `ChartCard` + x-charts; toggle harian/mingguan tetap.
- [ ] **Step 2: Gate + cek browser** — total seri harian = `series.harian` baseline; tabel produk tersortir & berpaginasi.
- [ ] **Step 3: Commit** — `feat(forecast): halaman Analisis Penjualan`

---

### Task 9: Halaman Data Toko & Data Produk

**Files:** `src/module/forecast/features/stores/{views/store-list-view.tsx,pages/index.tsx}`, `src/module/forecast/features/products/{views/product-list-view.tsx,pages/index.tsx}`

- [ ] **Step 1: Port** dari `staging:src/sections/forecast/view/{store-list-view,product-list-view}.tsx`; tabel memakai `useTable` + `TableHeadCustom` + `TablePaginationCustom` + `TableNoData`/`TableSkeleton`; pencarian & sortir client-side tetap.
- [ ] **Step 2: Gate + cek browser** — 10 toko teratas sama urutan & nilainya dengan `storesTop10` baseline (sortir default sama); jumlah produk = `products.length` baseline.
- [ ] **Step 3: Commit** — `feat(forecast): halaman Data Toko & Data Produk`

---

### Task 10: Halaman Pengaturan

**Files:** `src/module/forecast/features/settings/{views/settings-view.tsx,components/settings-params-form.tsx,pages/index.tsx}`

**Interfaces:**
- Consumes: `useRecommendationParams`, `recParamsFormSchema`, `toFormValues`, `toParams`, `API_FIELD_TO_FORM`; `Form` + `Field.*` dari `src/shared/ui/hook-form`.

- [ ] **Step 1: Port** — field, validasi, pesan, tombol reset ke default & simpan sama dengan staging; error 422 dari API dipetakan ke field via `API_FIELD_TO_FORM`; notifikasi pakai `toast` (sonner) skeleton.
- [ ] **Step 2: Gate + cek browser (simulasi)** — ubah ambang retur → simpan → buka Rekomendasi: ringkasan berubah; reload: nilai tersimpan; set `localStorage` key pengaturan ke `"{rusak"` → reload → halaman memakai default tanpa crash.
- [ ] **Step 3: Commit** — `feat(forecast): halaman Pengaturan`

---

### Task 11: Deploy, docs, verifikasi akhir

**Files:**
- Modify: `Dockerfile` (dari skeleton; `COPY .env.prod .env` tetap — `.env.prod` gitignored, dibuat di server), `docker-compose.yml` (image `ai-forecast-web`, port `80:80`, tanpa `env_file` runtime karena Vite inline saat build), `Jenkinsfile` (stage env: `cp .env.example .env`; typecheck `yarn tsc:check`; build `yarn build`), `.dockerignore`
- Rewrite: `CLAUDE.md`, `README.md`, `docs/deployment.md`
- Copy: `$SK/docs/CONVENTIONS.md`, `$SK/docs/patterns/` → `docs/`
- Delete: `scripts/forecast-baseline.*` TIDAK — dipertahankan sebagai alat cek kesetaraan; dokumentasikan di CLAUDE.md
- Memory: perbarui `~/.claude/projects/-Users-user-Documents-Claude-Projects-ai-forecast-ai-forecast-fe/memory/` (path file pengaturan berubah ke `src/module/forecast/...`)

- [ ] **Step 1: CLAUDE.md** — gabungan: perintah (port 8002, `tsc:check`, tak ada test runner, yarn saja), arsitektur skeleton (module layout, routing, axios, guard) + aturan forecast dari CLAUDE.md lama (dua sumber `VITE_FORECAST_SOURCE`, penanda sumber wajib, aturan harus sinkron dengan BE, `DEFAULT_REC_PARAMS` = `DefaultParams`, endpoint settings BE tertunda), penyimpangan dari skeleton (auth skip, i18n tidak dipakai di forecast + alasan, tanpa remote skeleton), skrip baseline.
- [ ] **Step 2: Verifikasi akhir**

```bash
yarn lint && yarn fm:check && yarn tsc:check && yarn build
grep -rn "from 'next\|process.env\|@tanstack" src || echo bersih
docker build -t ai-forecast-web . (bila Docker tersedia; buat .env.prod sementara dari .env.example)
```
Browser: mode simulasi — keenam halaman tampil dengan chip "simulasi". Mode api (`VITE_FORECAST_SOURCE=api VITE_SERVER_URL=http://127.0.0.1:8080`, ai-forecast-be jalan) — keenam halaman memuat data asli dengan chip "data asli · baseline"; matikan BE → tiap halaman menampilkan `ForecastDataState` dengan tombol Coba lagi.
- [ ] **Step 3: Commit** — `chore: deploy nginx, docs & CLAUDE.md untuk skeleton React`
