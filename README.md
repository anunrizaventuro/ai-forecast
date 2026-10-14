# AI Forecast — Frontend

Dashboard analisis distribusi roti dan rekomendasi stok: memantau kiriman, estimasi penjualan, retur (BS), dan menyarankan jumlah roti yang sebaiknya dibawa sales ke setiap toko pada kunjungan berikutnya.

> **Sumber data** dipilih lewat `NEXT_PUBLIC_FORECAST_SOURCE`:
> - `simulasi` (default) — generator dummy di [src/_mock/_forecast.ts](src/_mock/_forecast.ts), tanpa backend.
> - `api` — data asli dari [ai-forecast-be](https://github.com/venturo-id/ai-forecast-be) (SQLite klien, read-only) di `NEXT_PUBLIC_API_URL`.
>
> Di kedua mode rekomendasi masih **aturan baseline dengan parameter contoh** — belum dioptimasi dan belum divalidasi lapangan; UI menampilkan penandanya. Dasar analisis: `ai-forecast-be/docs/`.

**Stack:** Next.js 16 (App Router) · React 19 · MUI 9 (theme CSS variables) · TypeScript strict · TanStack Query 5 · ky + zod · react-hook-form + zod. Dibangun di atas skeleton internal (basis Zone UI v4.6.0).

## Halaman

| URL | Isi |
|---|---|
| `/` | redirect ke `/dashboard` |
| `/dashboard` | KPI, tren kiriman vs estimasi terjual, produk teratas, ringkasan rekomendasi |
| `/dashboard/rekomendasi-stok` | tabel rekomendasi toko × produk (filter, sort, unduh CSV) |
| `/dashboard/analisis-penjualan` | tren, retur, per wilayah, kinerja per produk |
| `/dashboard/toko` | daftar toko + detail & rekomendasi per toko |
| `/dashboard/produk` | master produk (MRoti) + volume & status rekomendasi |
| `/components` | galeri komponen (hanya `yarn dev` / flag env) |

## Prerequisites

- Node.js >= 22.12 (lihat `.nvmrc`)
- Yarn 1.22 (satu-satunya package manager — jangan pakai npm)

## Quick start

```sh
cp .env.example .env   # wajib — env divalidasi zod saat start/build
yarn install
yarn dev               # http://localhost:8002 → /dashboard
```

Mode data asli: jalankan backend (`make run` di ai-forecast-be, port 8080), set `NEXT_PUBLIC_FORECAST_SOURCE=api` di `.env`, lalu restart `yarn dev` (nilai `NEXT_PUBLIC_*` dibaca saat start/build).

## Commands

```sh
yarn dev          # dev server (port 8002)
yarn build        # production build
yarn start        # serve production build (port 8002)

yarn tsc:check    # type-check (tidak ada test runner; ini gate utama)
yarn lint         # eslint
yarn fix:all      # lint:fix + prettier — jalankan sebelum commit
```

Gate otomatis: pre-commit menjalankan eslint+prettier pada file staged, pre-push menjalankan `tsc:check`, dan Jenkins menjalankan gate penuh (install → lint → format → typecheck → build).

Production via Docker: `docker compose up -d --build` (env dari `.env.prod`, site di port 80).

## Struktur folder

```
├── docs/                    # dokumentasi tim (resep, branding, deployment, distribusi)
├── public/
│   └── assets/brand/        # ikon merek AI Forecast (svg + png)
├── src/
│   ├── app/                 # App Router — page.tsx TIPIS: metadata + render View
│   │   ├── dashboard/       # 5 halaman dashboard + layout sidebar
│   │   ├── (simple)/        # group layout compact: coming-soon, maintenance
│   │   ├── components/      # galeri komponen (di-gate middleware di production)
│   │   ├── error/           # pratinjau 404/500
│   │   ├── layout.tsx       # root: font lokal, provider, metadata default, og image
│   │   └── page.tsx / robots.ts / manifest.ts
│   │
│   ├── sections/
│   │   ├── forecast/        # semua UI dashboard + forecast-utils.ts (metrik & aturan)
│   │   │   └── view/        #   view per halaman
│   │   ├── error/  coming-soon/  maintenance/
│   │   └── _examples/       # sumber galeri /components
│   │
│   ├── _mock/_forecast.ts   # generator data SIMULASI (struktur tabel KIRIMAN/BS/STOCK)
│   ├── sections/forecast/use-forecast-data.ts  # hook data: simulasi ↔ API
│   ├── types/forecast.ts    # tipe sumber (MRoti, MToko, transaksi) + turunan
│   ├── lib/
│   │   ├── api/             # lapisan data: forecast.ts (ai-forecast-be) + pola referensi
│   │   ├── query/           # TanStack Query: QueryClient + provider
│   │   ├── env.ts           # SATU-SATUNYA pembaca env — zod, fail-fast
│   │   └── seo.ts           # helper JSON-LD
│   ├── components/          # komponen bersama reusable + barrel
│   ├── layouts/             # dashboard/ (sidebar), main/, simple/, nav-config-*.tsx
│   ├── theme/               # theme MUI CSS-vars (JANGAN edit core/)
│   ├── routes/              # paths.ts (SEMUA string URL) + hooks + RouterLink
│   └── global-config.ts     # CONFIG (appName, appDescription, env)
│
├── Dockerfile / docker-compose.yml / Jenkinsfile
├── CLAUDE.md                # aturan arsitektur lengkap
└── .env.example             # template env — copy ke .env / .env.prod
```

## Arsitektur dalam 30 detik

Setiap halaman mengikuti lapisan **page → view → section**:

1. `src/app/<route>/page.tsx` — Server Component tipis: metadata + render satu View.
2. `src/sections/<vertical>/view/<nama>-view.tsx` — `'use client'`, merangkai section.
3. `src/sections/<vertical>/<nama>-section.tsx` — blok presentasional.

Semua view mengambil data lewat hook di `src/sections/forecast/use-forecast-data.ts`; mode `api` memanggil `src/lib/api/forecast.ts` (zod di batas fetch, snake_case → tipe `src/types/forecast.ts`), mode `simulasi` menghitung di client. Aturan lengkap ada di [CLAUDE.md](CLAUDE.md).

## Dokumentasi tim

| Dokumen | Isi |
|---|---|
| [docs/recipes/add-a-page.md](docs/recipes/add-a-page.md) | Langkah menambah halaman: paths → section → view → layout → page → nav |
| [docs/recipes/add-an-api-endpoint.md](docs/recipes/add-an-api-endpoint.md) | Menambah endpoint API meniru pola `src/lib/api/articles.ts` |
| [docs/branding.md](docs/branding.md) | Checklist branding (status AI Forecast di bagian atas) |
| [docs/deployment.md](docs/deployment.md) | Env production, Docker, Jenkins |
| [docs/distribution.md](docs/distribution.md) | Hubungan dengan skeleton upstream (remote & cherry-pick) |
