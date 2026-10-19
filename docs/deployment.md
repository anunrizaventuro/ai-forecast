# Deployment

## Variabel environment

Satu-satunya tempat env dibaca adalah `src/shared/config/index.ts` (divalidasi
zod saat module load — nilai yang salah bentuk **menggagalkan boot** dengan
pesan jelas). Kode lain memakai `CONFIG`, bukan `import.meta.env`.

| Var | Wajib? | Isi |
|---|---|---|
| `VITE_FORECAST_SOURCE` | opsional | `simulasi` (default, generator dummy tanpa backend) atau `api` |
| `VITE_SERVER_URL` | ya bila `api` | URL publik ai-forecast-be, reachable dari browser (tanpa trailing slash) |
| `VITE_COMPANY_SLUG` | opsional | header `X-Company-Slug`; hanya dikirim bila diisi |
| `VITE_ASSETS_DIR` | opsional | prefix direktori aset public |
| `VITE_FIREBASE_*` | tidak dipakai | login Google modul core skeleton — kosongkan selama auth dimatikan |

Aturan emas: **semua `VITE_*` dibekukan saat build** (di-inline Vite ke bundle).
Ganti nilainya = build ulang, bukan restart. Mode `api` juga butuh origin
frontend terdaftar di `AI_FORECAST_CORS_ORIGINS` milik ai-forecast-be.

## Docker (jalur utama)

```sh
cp .env.example .env.prod    # isi nilai production (file ini di-gitignore)
docker compose up -d --build # SPA statis di nginx, port 80
```

- `Dockerfile` multi-stage: `node:22-alpine` menjalankan `yarn build` dengan
  `.env.prod` disalin jadi `.env`, lalu hasil `dist/` disajikan
  `nginx:1.27-alpine` memakai `nginx.conf`.
- `nginx.conf`: fallback SPA (`try_files … /index.html`), `index.html` tanpa
  cache, aset ber-hash di `/assets/` di-cache 1 tahun, gzip, header keamanan
  dasar.
- `.dockerignore` mengecualikan `.env` lokal — nilai dev tidak bisa bocor ke image.

## Jenkins (CI gate)

`Jenkinsfile` di root: install (frozen lockfile) → env contoh
(`cp .env.example .env`) → lint → fm:check → tsc:check → build. Tidak butuh
credential (CI hanya gerbang kualitas; deploy memakai `.env.prod` asli di server).

## Setelah deploy — checklist

- [ ] `curl -I https://<domain>/` — 200 dengan header `X-Frame-Options`,
      `X-Content-Type-Options`, `Referrer-Policy`.
- [ ] Buka langsung `https://<domain>/rekomendasi-stok` (deep link) — tampil,
      bukan 404 nginx.
- [ ] `/robots.txt` → `Disallow: /`.
- [ ] Penanda sumber di header halaman sesuai mode (`simulasi` /
      `data asli · baseline`).
- [ ] Mode `api`: matikan backend sebentar → tiap halaman menampilkan pesan
      gagal memuat + tombol "Coba lagi", bukan halaman kosong.
