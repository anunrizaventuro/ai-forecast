# AI Forecast — Frontend

Dashboard analisis distribusi roti dan rekomendasi stok: memantau kiriman, estimasi penjualan, retur (BS), dan menyarankan jumlah roti yang sebaiknya dibawa sales ke setiap toko pada kunjungan berikutnya.

> **Sumber data** dipilih lewat `VITE_FORECAST_SOURCE`:
> - `simulasi` (default) — generator dummy di [src/module/forecast/shared/data/simulasi.ts](src/module/forecast/shared/data/simulasi.ts), tanpa backend.
> - `api` — data asli dari [ai-forecast-be](https://github.com/venturo-id/ai-forecast-be) (SQLite klien, read-only) di `VITE_SERVER_URL`.
>
> Di kedua mode rekomendasi masih **aturan baseline dengan parameter contoh** — belum dioptimasi dan belum divalidasi lapangan; setiap halaman menampilkan penandanya. Dasar analisis: `ai-forecast-be/docs/`.

**Stack:** Vite 7 · React 19 · React Router 7 · MUI 7 · `@mui/x-charts` · TypeScript strict · axios + zod · react-hook-form + zod. Dibangun di atas [venturo-skeleton-react](https://github.com/venturo-id/venturo-skeleton-react) (basis Minimals v7.6.1) — skeleton hanya dipakai sebagai titik awal.

## Halaman

| URL | Isi |
|---|---|
| `/` | Dashboard: KPI, tren kiriman vs estimasi terjual, produk teratas, ringkasan rekomendasi |
| `/rekomendasi-stok` | rekomendasi toko × produk per toko / per sales (filter, unduh CSV) |
| `/analisis-penjualan` | tren, retur, per wilayah, kinerja per produk |
| `/toko` | daftar toko + detail & rekomendasi per toko |
| `/produk` | master produk (MRoti) + volume & status rekomendasi |
| `/pengaturan` | parameter aturan rekomendasi |

Alamat lama `/dashboard/...` otomatis dialihkan ke alamat di atas. Dashboard dibuka tanpa login (auth skeleton dimatikan).

## Prerequisites

- Node.js >= 22.12 (lihat `.nvmrc`)
- Yarn 1.22 (satu-satunya package manager — jangan pakai npm)

## Quick start

```sh
cp .env.example .env   # env divalidasi zod saat start
yarn install
yarn dev               # http://localhost:8002
```

Mode data asli: jalankan backend (`make run` di ai-forecast-be, port 8080), set `VITE_FORECAST_SOURCE=api` dan `VITE_SERVER_URL=http://127.0.0.1:8080` di `.env`, lalu restart `yarn dev`.

## Commands

```sh
yarn dev          # dev server (port 8002)
yarn build        # tsc + vite build → dist/
yarn start        # preview dist/ (port 8002)

yarn tsc:check    # type-check (tidak ada test runner; ini gate utama)
yarn lint         # eslint
yarn fix:all      # lint:fix + prettier — jalankan sebelum commit
```

Gate otomatis: pre-commit menjalankan eslint+prettier pada file staged, pre-push menjalankan `tsc:check`, dan Jenkins menjalankan gate penuh (install → lint → format → typecheck → build).

Cek kesetaraan perhitungan (setelah mengubah rumus/generator): lihat bagian *Equivalence check* di [CLAUDE.md](CLAUDE.md).

Production via Docker: `docker compose up -d --build` (env dari `.env.prod` di-inline saat build, SPA disajikan nginx di port 80). Detail: [docs/deployment.md](docs/deployment.md).

## Struktur folder

```
├── docs/                         # CONVENTIONS + patterns (skeleton), deployment, superpowers (spec/plan)
├── scripts/forecast-baseline.*   # angka acuan perhitungan + skrip pembandingnya
├── public/                       # favicon, assets/brand (ikon AI Forecast), ikon navbar, robots.txt
├── src/
│   ├── module/
│   │   ├── forecast/
│   │   │   ├── features/<halaman>/{pages,views,components}
│   │   │   └── shared/{api,hooks,utils,data,types,components}
│   │   └── core/                 # fitur skeleton (auth, users, roles, …) — dimatikan
│   ├── shared/                   # api (envelope), config (CONFIG + zod env), lib/axios, ui/*
│   ├── layouts/                  # dashboard shell, nav-config-dashboard.tsx
│   ├── routes/                   # paths.ts (SEMUA URL) + sections + hooks
│   ├── theme/  locales/
│   ├── app.tsx                   # provider stack
│   └── main.tsx                  # router
├── index.html / vite.config.ts
├── Dockerfile / nginx.conf / docker-compose.yml / Jenkinsfile
├── CLAUDE.md                     # aturan arsitektur lengkap
└── .env.example
```
