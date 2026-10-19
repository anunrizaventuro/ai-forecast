# Migrasi ke venturo-skeleton-react — desain

Tanggal: 2026-10-19 · Status: draf, menunggu persetujuan

## Intent

ai-forecast-fe saat ini dibangun di atas skeleton Next.js (Zone UI v4.6.0). Fondasinya
diganti **seluruhnya** dengan `venturo-skeleton-react`
(`/Users/user/Documents/Claude/Projects/Venturo-sekeleton/venturo-skeleton-react`,
github.com/venturo-id/venturo-skeleton-react): Vite 7 + React 19 + React Router 7 +
MUI 7 + Emotion + RHF/Zod + Axios. Semua yang berbau Next dihapus. Fitur forecast
dipindahkan ke struktur skeleton dan **tampilannya disesuaikan dengan gaya skeleton**
(bukan port piksel-per-piksel).

Skeleton hanya basis awal — sama seperti sebelumnya, tidak ada remote `skeleton` dan tidak
ada sinkronisasi/cherry-pick ke/dari repo skeleton setelah migrasi.

## Goals

1. Repo `ai-forecast-fe` berisi aplikasi Vite/React Router berbasis skeleton React; tidak
   tersisa file/dependensi Next.js (`next`, `next.config.ts`, `next-env.d.ts`, `src/app/`,
   `middleware.ts`, Zone UI `src/components`/`src/sections`/`src/theme` lama, galeri
   `/components`, `.next/`).
2. Enam halaman forecast berfungsi setara dengan sekarang (informasi, filter, interaksi,
   perhitungan): **Dashboard, Rekomendasi Stok, Analisis Penjualan, Data Toko, Data Produk,
   Pengaturan**.
3. Dua sumber data tetap ada, dipilih saat build: `simulasi` (default, generator dummy
   deterministik) dan `api` (ai-forecast-be, `/api/v1/forecast/*`).
4. Aturan rekomendasi baseline (`forecast-utils.ts`) dipindah **tanpa perubahan perilaku** —
   tetap sinkron dengan backend; `DEFAULT_REC_PARAMS` tetap sama dengan `DefaultParams` BE.
5. Penanda sumber ("simulasi" / "data asli · baseline") tetap tampil di setiap halaman
   forecast.
6. Gerbang verifikasi tetap: lint, prettier, typecheck, build — via husky (pre-commit
   lint-staged, pre-push typecheck) dan Jenkinsfile.

## Non-goals

- Login/auth sungguhan. Dashboard dibuka langsung lewat URL.
- Bahasa Inggris / multi-bahasa.
- Mengubah aturan rekomendasi, kontrak API, atau backend (termasuk endpoint settings yang
  masih tertunda).
- Menambah fitur baru di halaman forecast.

## Anti-goals (gagal walau "jalan")

- Angka rekomendasi/metrik berbeda dari versi Next untuk input yang sama.
- Halaman crash atau kosong saat backend mati di mode `api` (harus tampil state error yang
  jelas, seperti sekarang lewat `ForecastDataState`).
- Aplikasi memanggil endpoint skeleton yang tidak ada di ai-forecast-be (`/core/v1/*`,
  translation override, auth/me) lalu memunculkan error/redirect ke login.
- Rahasia milik skeleton (Firebase key di `.env.prod` skeleton) ikut ter-commit ke repo ini.
- `package-lock.json` ikut ter-commit (yarn satu-satunya package manager).

## Keputusan dari user

- **Skeleton:** venturo-skeleton-react, menggantikan semuanya; salin ke repo ini lalu ubah.
- **Akses:** tanpa login, cukup buka URL.
- **Modul core skeleton** (auth JWT, users, roles, branches, companies, audit-log,
  translation-override, onboarding): **kode disimpan tapi dimatikan** — `CONFIG.auth.skip
  = true`, menu & route-nya tidak tampil, tidak ada request ke `/core/v1/*` saat runtime.
- **Bahasa:** Indonesia saja.
- **Tampilan:** halaman forecast disesuaikan dengan gaya skeleton.

## Keputusan builder (panggilan saya, bisa dikoreksi)

- **Cara salin:** ambil isi skeleton dari commit HEAD-nya (`git archive`), bukan working
  tree (working tree skeleton punya perubahan lockfile yang belum di-commit). Kerjakan di
  branch baru dari `staging`, mis. `feat/skeleton-react`. Riwayat git ai-forecast-fe tetap.
- **Tidak dibawa dari skeleton:** `.env.prod` (berisi kredensial Firebase skeleton),
  `.env`, `package-lock.json`, `node_modules`, `.DS_Store`, `.claude/`, `vercel.json`.
  Contoh dashboard `src/module/dashboard/features/{finance,monitoring,sales}` dan
  `module/core/features/home` dihapus; komponen `KpiCard`/`ChartCard` dan `utils/format.ts`
  di `module/dashboard` dipakai ulang (pindahkan ke `src/shared/ui` atau ke modul forecast).
- **Dipertahankan dari repo ini:** `.husky/`, lint-staged config, `Jenkinsfile`
  (diadaptasi: hapus langkah `cp .env.example .env` bila tak perlu, `tsc:check` →
  skrip typecheck skeleton), `.nvmrc`, `docker-compose.yml` (diadaptasi ke image nginx
  skeleton, port 80), `docs/superpowers/` (spec/plan lama), `docs/` lain ditulis ulang.
- **Identitas app:** `package.json` name `@venturo/ai-forecast-web`, version `0.1.0`;
  `CONFIG.appName = 'AI Forecast'`; `<title>` dan meta `robots: noindex` di `index.html`;
  `public/robots.txt` disallow semua. Logo/favicon: pakai milik repo ini bila ada,
  selain itu bawaan skeleton.
- **Port dev & preview:** 8002 (bukan 8081).
- **Tambah skrip** `tsc:check` (`tsc --noEmit --pretty`) supaya husky/Jenkins tetap sama.
- **Env:** `VITE_SERVER_URL` (base URL ai-forecast-be), `VITE_FORECAST_SOURCE`
  (`simulasi`|`api`, default `simulasi`), `VITE_COMPANY_SLUG` opsional (header
  `X-Company-Slug` hanya dikirim bila diisi — BE forecast tidak memerlukannya),
  `VITE_ASSETS_DIR`. Divalidasi zod di satu tempat (`src/shared/config`) — gagal jelas bila
  salah bentuk. Firebase env tetap opsional (kosong) karena auth dimatikan.
- **Bahasa/i18n:** i18next skeleton tetap terpasang (kode core bergantung padanya), bahasa
  dikunci ke `id`, `LanguagePopover` disembunyikan. **Teks halaman forecast ditulis
  langsung dalam Bahasa Indonesia, tidak lewat `t()`** — menyimpang dari aturan skeleton;
  dicatat di CLAUDE.md/docs beserta alasannya (satu bahasa, mengurangi beban migrasi).
  Label nav forecast juga hardcode.
- **Provider runtime yang dimatikan:** `OnboardingDialog`, `TranslationOverrideSync`, dan
  apa pun di `AuthProvider` yang memanggil backend saat mount tidak boleh menembak
  request bila `auth.skip`. Nav: hapus item contoh dashboard & settings core; nav berisi
  enam menu forecast.
- **Routing:** semua route di `src/routes/paths.ts`. Forecast di root, tanpa prefix
  `/dashboard` (skeleton memakai `/` sebagai dashboard):
  `/` Dashboard, `/rekomendasi-stok`, `/analisis-penjualan`, `/toko`, `/produk`,
  `/pengaturan`. Route core (`/auth/*`, `/settings/*`) tidak didaftarkan selama
  `auth.skip`. 404 memakai halaman error skeleton. Path lama `/dashboard/*` di-redirect
  ke path baru supaya bookmark tidak putus.
- **Struktur modul:** `src/module/forecast/` mengikuti `docs/patterns/feature-module.md`:
  - `features/<halaman>/{pages,views,components,hooks}` untuk dashboard,
    recommendation, sales-analysis, stores, products, settings.
  - `shared/` (atau `features/_shared`) untuk yang dipakai lintas halaman: `api/`
    (endpoint + zod schema + fetcher), `hooks/` (`use-forecast-data`,
    `use-recommendation-params`), `utils/forecast-utils.ts`, `data/simulasi.ts`
    (eks `_mock/_forecast.ts`), `types/`, komponen bersama (filter bar, penanda sumber,
    state data).
  Nama persisnya diserahkan ke builder asal konsisten dengan feature-module.md.
- **Data layer:** buang TanStack Query (skeleton tidak memakainya). Fetcher memakai axios
  bersama skeleton (`src/shared/lib/axios.ts`, envelope `ApiEnvelope` + `unwrap<T>()`
  — envelope BE forecast identik; kedua helper itu sekarang hanya ada di
  `module/core/features/auth/{types,api}`, angkat ke `src/shared/api`), zod tetap memvalidasi `data` di batas fetch dan
  mengubah snake_case → camelCase seperti sekarang. Hook mengikuti pola skeleton
  (`useState`/`useEffect`; cache module-level untuk `meta`), dengan perilaku yang sekarang
  diberikan React Query tetap ada: data lama tetap tampil saat filter berubah (tidak
  berkedip ke skeleton loading), request basi dibuang (race), state loading/error, dan
  setelah simpan Pengaturan semua data turunan di-refetch. Mode `simulasi` tetap
  sinkron/tanpa jaringan.
- **Pengaturan:** `simulasi` → localStorage seperti sekarang; `api` →
  `GET/PUT /api/v1/forecast/settings` (BE masih tertunda; perilaku saat 404 sama dengan
  sekarang). Form pakai `Field.*` RHF skeleton + zod.
- **Gaya skeleton di halaman:**
  - Header: `PageHeader`. Penanda sumber tetap di header/area atas tiap halaman.
  - KPI: `KpiCard` skeleton (sparkline `@mui/x-charts`).
  - Grafik: `ChartCard` + `@mui/x-charts` (Line/Bar/Pie/SparkLine) menggantikan chart
    buatan sendiri (`forecast-trend-chart`, `forecast-sparkline`, `forecast-bar-list`,
    `forecast-segment-bar`) — data & seri yang ditampilkan sama.
  - Tabel: toolkit `src/shared/ui/table` (`useTable` dense default, `TableHeadCustom`,
    `TableSkeleton`, `TableNoData`, `TablePaginationCustom`); sortir/pencarian yang ada
    sekarang tetap ada (client-side, karena BE mengembalikan seluruh daftar).
  - Filter tanggal: `DateRangePicker` bersama skeleton di filter bar. Preset bawaannya
    dihitung mundur dari hari ini (akan memilih tanggal tanpa data), jadi komponen itu
    diberi prop opsional `presets`/`minDate`/`maxDate`; filter forecast memakai preset
    yang terikat ke periode data (`PERIOD.start`–`PERIOD.end`) seperti sekarang. Mode
    "Data s.d. tanggal" (satu tanggal, halaman rekomendasi) tetap `DatePicker` tunggal.
  - Detail toko: tetap drawer atau dialog view mengikuti `dialog-crud.md` (pilihan builder).
  - Tema/settings drawer: bawaan skeleton. `Label`, `Iconify` versi skeleton.
- **Dependensi:** basis `package.json` skeleton. Hapus yang khusus Next/Zone UI.
  Dependensi skeleton yang hanya dipakai kode core yang disimpan (firebase, x-data-grid,
  dll.) tetap ada selama kodenya ada. `lint-staged` + `husky` ditambahkan.
- **Docs:** tulis ulang `CLAUDE.md` dan `README.md` untuk struktur baru (gabungan aturan
  skeleton + aturan forecast: dua sumber data, penanda sumber, sinkron aturan dengan BE,
  penyimpangan i18n, auth skip). Bawa `docs/CONVENTIONS.md` + `docs/patterns/` skeleton.
  Hapus `docs/distribution.md`, `docs/branding.md` & recipe Next yang tak relevan;
  perbarui `docs/deployment.md` untuk Docker nginx. Perbarui memory: path file berubah.

## Constraints

- Yarn 1.22.22 saja; Node ≥ 22.12.
- Import absolut `src/...`; ESLint perfectionist skeleton (urutan import error-level) —
  jalankan `yarn fix:all`.
- Tidak ada test runner; verifikasi = `yarn lint`, `yarn fm:check`, `yarn tsc:check`,
  `yarn build`, plus cek manual di browser kedua mode data.
- Kesetaraan perhitungan: `forecast-utils.ts` dan generator simulasi dipindah utuh
  (hanya path import yang berubah); sebelum menghapus kode Next, catat beberapa angka acuan
  (mis. total rekomendasi & KPI dashboard pada rentang default mode simulasi) lalu cocokkan
  setelah migrasi.

## Diserahkan ke builder

- Urutan langkah, pembagian commit, nama file/folder rinci di dalam `module/forecast`.
- Pemetaan komponen lama → komponen skeleton per halaman, selama informasi & interaksi
  setara.
- Detail implementasi hook data (cache, abort) selama perilaku di atas terpenuhi.
