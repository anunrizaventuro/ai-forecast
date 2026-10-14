# Deployment

## Variabel environment

Satu-satunya tempat env dibaca adalah `src/lib/env.ts` (divalidasi zod saat
module load — var wajib yang kosong/salah bentuk **menggagalkan build** dengan
pesan jelas). Konsumen memakai `CONFIG` dari `src/global-config.ts`, bukan
`process.env` (pengecualian: `src/middleware.ts`, bundle terpisah).

| Var | Wajib? | Build/Runtime | Isi |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | ya | **build** (di-inline) | URL publik backend Go, reachable dari browser |
| `NEXT_PUBLIC_COMPANY_SLUG` | ya | **build** | tenant — header `X-Company-Slug` |
| `NEXT_PUBLIC_SITE_URL` | ya (production) | **build** | origin publik — canonical, OG, sitemap |
| `NEXT_PUBLIC_CLIENT_SLUG` | opsional | build | whitelabel slug (translation overrides) |
| `NEXT_PUBLIC_ASSETS_DIR` | opsional | build | prefix direktori aset public |
| `NEXT_PUBLIC_SHOW_COMPONENTS` | opsional | **build** (dibaca middleware) | `true` = galeri `/components` tampil di production; kosong = 404 |
| `API_URL` | opsional | **runtime** (server-only) | URL internal API untuk fetch RSC/sitemap (mis. service DNS k8s) — fallback ke `NEXT_PUBLIC_API_URL` |
| `REVALIDATE_TOKEN` | opsional | **runtime** (server-only) | bearer token webhook `POST /api/revalidate/` (min 16 char); kosong = endpoint nonaktif (503) |

Aturan emas: **semua `NEXT_PUBLIC_*` dibekukan saat build** (di-inline Next ke
bundle). Ganti nilainya = build ulang, bukan restart. Var server-only (`API_URL`,
`REVALIDATE_TOKEN`) dibaca `process.env` saat runtime — boleh diganti lewat
restart container.

## Docker (jalur utama)

```sh
cp .env.example .env.prod    # isi nilai production (file ini di-gitignore)
docker compose up -d --build # image standalone, site tersaji di port 80
```

Detailnya:

- `Dockerfile` multi-stage `node:22-alpine`; runner non-root berisi HANYA output
  `standalone` + `.next/static` + `public` (image ramping).
- Saat build, `.env.prod` di-copy jadi `.env.production` supaya `NEXT_PUBLIC_*`
  ter-inline; saat run, compose meneruskannya lagi via `env_file` untuk var
  server-only.
- `output: 'standalone'` hanya aktif bila `BUILD_STANDALONE=true` (di-set
  Dockerfile) — `yarn build`/`yarn start` lokal tidak berubah.
- `.dockerignore` mengecualikan `.env` lokal — nilai dev tidak bisa bocor ke image.

### k8s / runtime non-Docker

Container listen di `PORT=80` (aman di Docker ≥ 20.10). Di k8s, sysctl
`ip_unprivileged_port_start` tidak default 0 — **override `PORT` ke ≥ 1024**
(mis. 8080) dan biarkan Service/Ingress memetakan ke 80/443. Set `API_URL` ke
service DNS internal backend supaya fetch RSC tidak keluar lewat ingress.

## Jenkins (CI gate)

`Jenkinsfile` di root: install (frozen lockfile) → env contoh
(`cp .env.example .env`) → lint → fm:check → tsc:check → build. Daftarkan
sebagai pipeline job biasa; tidak butuh credential (CI hanya gate kualitas,
deploy memakai `.env.prod` asli di server).

## Setelah deploy — checklist

- [ ] `curl -I https://<domain>/` — 200, header security lengkap
      (`Strict-Transport-Security`, `X-Frame-Options`, CSP report-only).
- [ ] `https://<domain>/sitemap.xml` & `/robots.txt` — domain benar (bukti
      `NEXT_PUBLIC_SITE_URL` benar).
- [ ] `/components/` → 404 (build client tanpa flag galeri).
- [ ] Matikan backend sebentar → home tetap utuh dengan konten fallback.
- [ ] Webhook revalidate: set `REVALIDATE_TOKEN` lalu daftarkan URL
      `POST https://<domain>/api/revalidate/` (trailing slash WAJIB — tanpa itu
      kena redirect 308) ke backend/CMS. Uji:
      `curl -X POST -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d '{"tags":["articles"]}' https://<domain>/api/revalidate/`
- [ ] CSP masih report-only — pantau pelanggaran beberapa minggu, lalu
      promosikan ke `Content-Security-Policy` penuh di `next.config.ts`.
