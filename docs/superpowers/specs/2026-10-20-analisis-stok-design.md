# Analisis Penjualan Berbasis Stok — Design

Tanggal: 2026-10-20 · Tahap 4. Keputusan user: ganti rumus B (`kirim(t−1) − bs(t)`) dengan rumus stok.

## Rumus per sel (toko × roti × kunjungan *t*, *t−1* = kunjungan sebelumnya ke toko yang sama)

```
stok tersedia(t−1) = sisa(t−1) + kiriman(t−1)
terjual(t)         = sisa(t−1) + kiriman(t−1) − sisa(t) − BS(t)      (periode t−1 → t)
terjual/hari       = terjual(t) ÷ jumlah hari t−1 → t
```

Asumsi (dari format LPK, perlu konfirmasi klien): saat kunjungan kurir mencatat SISA (roti layak
jual yang masih di rak, **tidak termasuk** BS), menarik BS, lalu meninggalkan ROTI baru. SISA dan BS
dicatat untuk seluruh stok di toko, bukan hanya kiriman terakhir. Umur roti tidak dicatat.

Status sel (dihitung dari **keberadaan baris**, bukan nilai 0 — nol berarti "dicatat nol"):

| Status | Kapan |
|---|---|
| `lengkap` | ada kunjungan sebelumnya; baris KIRIMAN dan STOCK di *t−1*; baris STOCK dan BS di *t*; hasil ≥ 0; kiriman *t−1* bukan pencilan |
| `belum-cukup` | salah satu baris di atas tidak ada (alasan dicatat) |
| `perlu-diperiksa` | hasil negatif, atau kiriman *t−1* pencilan |

Hanya sel `lengkap` yang masuk total estimasi terjual, rasio BS (`BS ÷ stok tersedia`), dan
sell-through (`terjual ÷ stok tersedia`). Ringkasan menyertakan jumlah sel per status.

## Analisis toko × roti (memakai Pengaturan versi aktif)

Observasi = sel `lengkap` dalam rentang filter **dan** dalam `history_days` terakhir dari akhir
rentang, maksimal `history_visits` terakhir.

- Perkiraan terjual per hari: `rata-rata` = total terjual ÷ total hari observasi (tahan terhadap
  jarak kunjungan pendek); `median` = median terjual/hari tiap observasi.
- Status `belum-cukup` bila observasi < `min_observations` — tanpa angka perkiraan.
- Tren (≥ 4 observasi): paruh terbaru vs paruh lama, > +20% naik, < −20% turun, selain itu stabil.
- Indikator risiko (urutan prioritas):
  1. **Kelebihan stok** — rasio BS > `bs_risk_pct`, atau rata-rata sisa > perkiraan terjual satu
     interval (`terjual/hari × visit_interval_days`).
  2. **Kekurangan stok** — dua observasi terakhir sama-sama habis (sisa 0 dan BS 0): permintaan
     mungkin lebih besar dari kiriman (tidak teramati).
  3. Wajar.

API: `GET /api/v1/forecast/analysis` (daftar pasangan, filter umum) dan
`GET /api/v1/forecast/analysis/detail?nit=&product=` (pasangan + riwayat semua kunjungan dengan
status dan alasan). Sama di mode simulasi (`forecast-utils.ts`).

## Lain-lain

- Generator simulasi: sisa stok kini terbawa ke kunjungan berikutnya (konsisten dengan rumus).
- Filter tanggal default = seluruh periode data (meta), bukan periode simulasi tetap — data impor
  (Okt 2026) ikut tampil.
- Aturan rekomendasi lama tetap jalan, tetapi kini memakai estimasi terjual rumus stok sampai Tahap 5.
