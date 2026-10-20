# Pengaturan Perhitungan (berversi) — Design

Tanggal: 2026-10-20 · Tahap 3. Menggantikan form 14 parameter dari
`2026-10-15-pengaturan-rekomendasi-design.md` (backend-nya tidak pernah dibuat).

## Tujuan

Admin mengubah parameter perhitungan analisis & rekomendasi SPK lewat UI tanpa ubah kode.
Setiap simpan = **versi baru** di database kerja (versi lama tidak ditimpa), dengan catatan
alasan. SPK yang difinalisasi (Tahap 5) menyimpan nomor versi yang dipakai, jadi perubahan
pengaturan tidak mengubah SPK final secara diam-diam.

## Parameter (nilai awal = perlu konfirmasi, bukan aturan final)

| Field (BE json) | Default | Rentang | Dipakai untuk |
|---|---|---|---|
| `visit_interval_days` | 3 | 1–14 | Kebutuhan = rata-rata terjual per hari × interval |
| `history_days` | 42 | 7–180 | Hanya kunjungan dalam N hari terakhir yang dipakai |
| `history_visits` | 4 | 2–12 | Maksimum kunjungan (data lengkap) terakhir yang dipakai |
| `min_observations` | 2 | 1–`history_visits` | Kurang dari ini → "data belum cukup", tanpa angka otomatis |
| `method` | `rata-rata` | `rata-rata` \| `median` | Cara merangkum penjualan per hari |
| `stock_usable_pct` | 50 | 0–100 | Porsi perkiraan sisa stok yang dihitung masih bisa memenuhi kebutuhan |
| `bs_risk_pct` | 15 | 1–100 | BS ÷ stok tersedia di atas batas → risiko BS tinggi; rekomendasi tidak dinaikkan dari kiriman terakhir |
| `max_change_pct` | 50 | 10–300 | Rekomendasi tidak naik/turun lebih dari X% kiriman terakhir (minimal 2 pcs) |
| `round_to` | 1 | 1–50 | Kelipatan pembulatan |
| `round_mode` | `atas` | `atas` \| `terdekat` \| `bawah` | Arah pembulatan |
| `shelf_life_days` | 10 | 1–60 | Informasi produk saja — **tidak** dipakai menghitung umur stok (umur per roti tidak dicatat) |
| `product_shelf_life` | `{}` | kode produk → 1–60 | Pengecualian per produk |

Validasi sama di FE (zod) dan BE (`forecast.Settings.Validate`, 422 per field).

## Penyimpanan & API

- Migrasi 2: `app_settings_version (id, params JSON, note, created_at)`. Versi aktif = id terbesar;
  belum ada baris → default (versi 0).
- `GET /api/v1/forecast/settings` → `{ version, params, defaults, updated_at, note }`.
- `PUT /api/v1/forecast/settings` body `{ params, note }` → 422 per field / 200 bentuk sama.
  Params sama persis dengan versi aktif → tidak membuat versi baru.
- `GET /api/v1/forecast/settings/history` → 50 versi terakhir `{ version, params, note, created_at }`.
- Mode simulasi: localStorage (versi aktif + riwayat di browser itu).

## Masa transisi

Sampai Tahap 4–5, aturan rekomendasi lama tetap memakai parameter tetapnya
(`DefaultParams` / `DEFAULT_REC_PARAMS`). Halaman Pengaturan menyatakan ini terang-terangan.
