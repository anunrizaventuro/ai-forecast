# Tahap 6 — Pengujian alur import → pengaturan → analisis → SPK

Tanggal: 2026-10-20 · FE `staging` + BE `staging` · data: file klien di `../doc-from-client`
(`XDistribution_Export_Excel.xlsx`, `LapK_1_19-10-2026.csv`, `Spk_1_20-10-2026.csv`) di atas
database kerja baru (salinan `XDistribution (2) (1).db`).

## Hasil

| Lapisan               | Alat                                                                                                            | Hasil                  |
| --------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------- |
| Unit BE               | `go test ./...`                                                                                                 | lulus                  |
| Paritas rumus FE ↔ BE | `cmd/parity-spk` (BE) + `scripts/parity-spk-dump.ts` (FE): 6 kombinasi pengaturan × tanggal, ±3.000 baris saran | selisih 0              |
| Baseline lama         | `scripts/forecast-baseline.ts`                                                                                  | sama dengan JSON acuan |
| API end-to-end        | `ai-forecast-be/scripts/e2e_api.py`                                                                             | 37/37                  |
| UI mode simulasi      | `scripts/e2e/ui-e2e.mjs` (Playwright, Chromium)                                                                 | 20/20                  |
| UI mode api           | `scripts/e2e/ui-e2e.mjs`                                                                                        | 20/20                  |
| UI Import Data (api)  | `scripts/e2e/import-e2e.mjs`                                                                                    | 6/6                    |
| Gate FE               | `yarn lint`, `yarn fm:check`, `yarn tsc:check`, `yarn build`                                                    | bersih                 |

Yang dicakup skenario API: impor semua jenis dari xlsx + LPK + SPK klien, impor ulang idempoten,
file salah format ditolak, dataset dimuat ulang setelah impor, validasi pengaturan (422 per field),
versi baru hanya bila berubah, analisis memakai versi aktif, SPK: validasi tanggal/duplikat, draf →
isi → finalisasi, SPK final **beku** setelah pengaturan & data berubah (PUT/DELETE → 409), ekspor CSV
terbaca kembali oleh importer SPK tanpa error, draf baru memakai versi terbaru, hapus draf.

Yang dicakup skenario UI: 8 halaman tampil tanpa error konsol dan dengan penanda sumber; simpan
pengaturan lewat dialog; buat draf SPK lewat dialog (toko dari sales) → edit sel → isi kosong →
simpan → muat ulang → finalisasi → unduh CSV; daftar SPK; lebar ponsel (390 px) tanpa scroll
horizontal; impor LPK lewat UI (preview → simpan, impor ulang = tidak ada perubahan, file salah jenis
ditolak, tanggal masa depan ditolak).

## Bug yang ditemukan & diperbaiki

1. **Saran SPK dari kiriman pencilan.** Kiriman terakhir 750 pcs (salah input) membuat batas bawah
   375 pcs → saran 375. Sekarang status `perlu-diperiksa`, tanpa angka, penjelasan di panel; tombol
   "isi kosong dengan kiriman terakhir" tidak mengisinya (wajib manual). BE + FE + tes + paritas.
2. **Toko tanpa riwayat terlihat seperti baris kosong tanpa penjelasan.** Halaman draf kini
   menyebutkan toko yang tidak punya kiriman dalam `history_days` dan meminta isi manual.
3. Subjudul panel hitungan menampilkan "mpc mpc" bila nama produk = kode — dirapikan.

## Temuan yang butuh keputusan klien

1. **Kode toko di file aplikasi baru tidak cocok dengan master lama.** Semua 22 kode toko di
   `LapK_1_19-10-2026.csv` dan `Spk_1_20-10-2026.csv` punya nama berbeda dengan MToko (mis. 1066
   "src umi" vs "Madura Mart Elza", 1002 "toko tatik" vs "Toko Paviliun"); sebagian toko itu terakhir
   dikirimi Juni–Juli di data lama. Kemungkinan aplikasi baru memakai penomoran toko sendiri. Impor
   saat ini hanya memberi **peringatan**, jadi riwayat dua toko berbeda bisa tergabung dan merusak
   estimasi terjual. Perlu konfirmasi: apakah nit di aplikasi baru = nit MToko? Bila tidak, impor
   harus dipetakan atau nama berbeda dijadikan error.
2. **SPK klien 20/10 vs saran sistem:** 13 toko, klien 570 pcs, sistem 10 pcs — karena 11 toko tidak
   punya kiriman dalam 42 hari terakhir (lihat temuan 1). Belum bisa dipakai untuk menilai akurasi.
3. Transaksi toko 3090, 7090, 9001 di file ekspor ditolak (tidak ada di master) — 7 baris per tabel.
   Sesuai aturan impor; perlu data toko bila memang toko sah.
4. Dengan pengaturan default, saran pada data asli lebih rendah dari kiriman terakhir dan ±60%
   saran (simulasi) mentok di batas perubahan — interval kunjungan & batas perubahan perlu
   dikonfirmasi sebelum dipakai operasional.

## Cara menjalankan ulang

```sh
# BE dengan database kerja baru (jangan pakai data/ai-forecast.db yang dipakai sehari-hari)
cd ai-forecast-be && go build -o /tmp/aif-api ./cmd/api
AI_FORECAST_DATA=/tmp/e2e-kerja.db AI_FORECAST_ADDR=127.0.0.1:8091 \
  AI_FORECAST_CORS_ORIGINS=http://localhost:8003,http://localhost:8004 /tmp/aif-api
python3 -I scripts/e2e_api.py http://127.0.0.1:8091 ../doc-from-client

# FE dua mode di port terpisah
VITE_FORECAST_SOURCE=api VITE_SERVER_URL=http://127.0.0.1:8091 node_modules/.bin/vite --port 8003
VITE_FORECAST_SOURCE=simulasi node_modules/.bin/vite --port 8004

# Playwright TIDAK menjadi dependensi repo: pasang di folder sementara lalu jalankan dari sana
mkdir -p /tmp/e2e && cd /tmp/e2e && npm i playwright@1.60.0 && npx playwright install chromium
cp <repo-fe>/scripts/e2e/*.mjs . && node ui-e2e.mjs http://localhost:8004 simulasi
node ui-e2e.mjs http://localhost:8003 api
node import-e2e.mjs http://localhost:8003 http://127.0.0.1:8091 <LapK tanggal lampau yang belum diimpor>
```

UI e2e membuat SPK & versi pengaturan di database uji; jalankan `e2e_api.py` lebih dulu pada
database baru (skrip itu mengharapkan pengaturan versi 0 di awal).
