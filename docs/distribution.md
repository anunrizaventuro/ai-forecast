# Model distribusi skeleton

Bagaimana skeleton ini menjadi project client, dan bagaimana perbaikan skeleton
mengalir ke project-project yang sudah jalan.

## Peta branch (repo ini)

| Branch | Peran |
|---|---|
| `production` | skeleton hidup — semua perapian/perbaikan masuk sini |
| `template-default-4.6.0` | template Zone UI murni, beku — HANYA untuk diff & mengambil kembali bagian yang dulu dihapus (auth, section demo, dsb.) |

Update template upstream (Zone UI versi baru) masuk sebagai branch
`template-default-<versi>` baru, lalu di-diff terhadap `production` untuk
memilih apa yang diadopsi.

## Membuat project client baru

Jadikan repo ini **GitHub template repo** (Settings → centang "Template
repository"), lalu per client:

1. **Generate** repo baru dari template ("Use this template") — riwayat bersih,
   nama `client-<nama>-web`.
2. **Tambahkan skeleton sebagai remote** supaya perbaikan skeleton bisa
   di-cherry-pick masuk:

   ```sh
   git remote add skeleton git@github.com:venturo/venturo-skeleton-next.js.git
   git fetch skeleton
   ```

3. **Bootstrap** — jalankan checklist [branding.md](branding.md) (env, logo,
   palette, font, copy, nav).
4. Daftarkan pipeline Jenkins (lihat [deployment.md](deployment.md)).

## Mengalirkan perbaikan skeleton → project client

Perbaikan generik (bug fix, security, upgrade pola) dikerjakan **di repo
skeleton dulu**, baru disebarkan:

```sh
# di repo client
git fetch skeleton
git log --oneline skeleton/production   # pilih commit perbaikan
git cherry-pick <sha>                   # per commit; selesaikan konflik bila copy client berubah
```

Supaya cherry-pick tetap murah:

- Di skeleton, jaga commit **atomik dan bertema tunggal** (satu perbaikan =
  satu commit) — commit campur aduk tidak bisa dipetik sebagian.
- Di project client, hindari mengedit file "milik template" (`src/theme/core/`,
  `src/components/*` bersama) kecuali terpaksa; tweak lewat
  `theme-overrides.ts` dan section client sendiri. Makin kecil diff terhadap
  skeleton, makin lancar cherry-pick.
- Perbaikan yang lahir di project client dan bersifat generik → angkat balik ke
  skeleton (cherry-pick arah sebaliknya), supaya client berikutnya kebagian.

## Yang TIDAK ikut mengalir

- `.env` / `.env.prod` — selalu lokal per-deploy (gitignored).
- Konten & branding (`home-data.ts`, aset `public/assets/`, palette) — milik
  masing-masing client; konflik di file-file ini saat cherry-pick biasanya
  diselesaikan dengan "ours".
