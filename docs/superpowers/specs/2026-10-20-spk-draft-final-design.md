# SPK draf → final — Design

Tanggal: 2026-10-20 · Tahap 5 (lanjutan import → pengaturan → analisis stok).
Pengguna memilih langsung dikerjakan tanpa sesi tanya-jawab; keputusan bertanda **[keputusan
pembuat]** adalah asumsi yang perlu dikonfirmasi klien.

## Tujuan

Admin membuat SPK (Surat Perintah Kerja — jumlah tiap roti yang dibawa kurir ke tiap toko) dari
saran sistem, mengoreksi angkanya, lalu memfinalisasi. SPK final **membeku**: angka, versi
pengaturan, dan tanggal data acuan tidak berubah walau pengaturan/data berubah kemudian. SPK final
bisa diunduh dalam format file `Spk_<kurir>_<dd-mm-yyyy>.csv` aplikasi klien.

Bukan tujuan: mengirim SPK ke aplikasi kurir, rute otomatis, mengubah tabel klien `SPK` (hasil
impor tetap terpisah), autentikasi/persetujuan berjenjang.

## Rumus saran (per toko × roti)

Memakai analisis Tahap 4 (`analyzePair`) dengan data s.d. `data_as_of = min(akhir data, tgl SPK − 1)`
dan pengaturan versi aktif saat draf dibuat. `r` = terjual/hari (rata-rata atau median).

1. `kebutuhan = r × visit_interval_days`
2. `hari = tgl SPK − kunjungan terakhir`; `perkiraan sisa = max(0, sisa terakhir + kiriman terakhir − r × hari)`
   **[keputusan pembuat]** — sisa saat kurir datang diperkirakan dari stok yang ditinggal di
   kunjungan terakhir dikurangi perkiraan penjualan sejak itu.
3. `dipakai = perkiraan sisa × stock_usable_pct %`; `mentah = max(0, kebutuhan − dipakai)`
4. `langkah = max(2, ⌈kiriman terakhir × max_change_pct %⌉)`; batas `[kiriman terakhir − langkah,
kiriman terakhir + langkah]`, bawah ≥ 0. Bila BS ÷ stok tersedia > `bs_risk_pct` %, batas atas =
   kiriman terakhir (tidak dinaikkan — sesuai spec pengaturan).
5. Bulatkan ke kelipatan `round_to` dengan arah `round_mode` (sama dengan `exampleCalculation`).

Baris yang dibuat: setiap roti yang pernah dikirim (> 0) ke toko itu dalam jendela `history_days`.
Data belum cukup (`r` tidak ada) → **tanpa angka otomatis**; jumlah kosong dan wajib diisi admin
sebelum finalisasi (tombol "isi kosong dengan kiriman terakhir" membantu, tetap aksi sadar).
Kiriman terakhir pencilan (> max(250, 30 × median), kemungkinan salah input) → status
`perlu-diperiksa`, juga tanpa angka dan tidak diisi otomatis (ditemukan saat uji Tahap 6: batas
perubahan dari 750 pcs menghasilkan saran 375).
**[keputusan pembuat]** Tidak ada pengecualian produk volume kecil (itu aturan baseline lama).
Logika ada di BE (`internal/forecast/spk.go`) dan FE (`suggestSpk` di forecast-utils) dan harus
identik pada data simulasi.

## Alur & aturan

- **Buat draf:** tanggal SPK, kurir (teks bebas ≤ 20 huruf — data kurir klien belum rapi), daftar
  toko berurutan (urut = urutan dipilih; FE menyediakan "ambil toko dari kunjungan terakhir sales X").
  Satu SPK per (tanggal, kurir). Tanggal harus setelah awal data.
- **Draf:** ubah jumlah per toko × roti (termasuk menambah roti yang tidak disarankan), catatan,
  hapus draf. Hitung ulang dengan pengaturan baru = buat ulang (FE memperingatkan bila versi aktif
  berbeda dari versi draf).
- **Finalisasi:** semua jumlah terisi; status `final`, `finalized_at` dicatat; tidak bisa diubah
  atau dihapus.
- **Unduh CSV (final saja):** baris singkatan, baris harga jual MRoti, baris kosong, header
  `urut;nit;nama;kurir;tanggal;<21 roti urutan file klien>`, tanggal `dd/mm/yyyy`, `;`.

## Penyimpanan & API (BE)

Migrasi 3: `app_spk (id, tgl, kurir, status draft|final, settings_version, data_as_of, stores JSON,
note, created_at, updated_at, finalized_at)`, unik `(tgl, kurir)`; `app_spk_line (spk_id, nit,
product, suggested NULL, qty NULL, calc JSON)`, unik `(spk_id, nit, product)`.

| Endpoint                         | Keterangan                                                        |
| -------------------------------- | ----------------------------------------------------------------- |
| `GET /api/v1/spk`                | daftar ringkas (terbaru dulu)                                     |
| `POST /api/v1/spk`               | `{ tgl, kurir, nits[], note }` → detail; 422 per field / duplikat |
| `GET /api/v1/spk/{id}`           | detail: header + toko + baris + params versi yang dipakai         |
| `PUT /api/v1/spk/{id}`           | draf saja: `{ note, lines: [{ nit, product, qty }] }` (patch)     |
| `POST /api/v1/spk/{id}/finalize` | 422 bila ada jumlah kosong                                        |
| `DELETE /api/v1/spk/{id}`        | draf saja                                                         |
| `GET /api/v1/spk/{id}/export`    | `text/csv`, final saja                                            |

Mode simulasi: SPK disimpan di localStorage, saran dihitung di browser.

## FE

Halaman `/spk` (nav "SPK"): daftar SPK + dialog "Buat draf". `/spk/:id`: tabel toko × roti
(kolom = roti yang ada di SPK, urutan file klien), sel bisa diedit saat draf, penanda saran vs
diubah, panel penjelasan hitungan per sel, aksi simpan/finalisasi/hapus/unduh. Source chip tetap.
