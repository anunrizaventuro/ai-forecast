# Import Data (Excel/CSV) — Design

Tanggal: 2026-10-20 · Repo: ai-forecast-be + ai-forecast-fe · Tahap 2 dari rencana
"import → pengaturan → analisis → SPK" (keputusan: DB kerja salinan, rumus stok, pengaturan
ringkas, laporan per tahap).

## Tujuan

Pengguna operasional bisa memasukkan data toko, produk, laporan kunjungan kurir (LPK),
SPK, dan data kiriman/sisa/BS terpisah dari file `.xlsx`/`.csv` lewat dashboard: pilih jenis →
unggah → lihat preview + masalah → konfirmasi → ringkasan. Validasi di backend, data lama
tidak rusak, impor ulang file yang sama tidak menggandakan data.

## Database kerja

- File klien (`AI_FORECAST_DB`) **tidak pernah ditulis**. Saat start, bila `AI_FORECAST_DATA`
  (default `data/ai-forecast.db`, folder `data/` sudah di-.gitignore) belum ada, backend
  membuat salinan konsisten dengan `VACUUM INTO` dari sumber yang dibuka read-only.
- Tabel klien (MToko, MRoti, MKurir, KIRIMAN, BS, STOCK) tidak diubah strukturnya.
  Migrasi hanya **menambah** tabel (`app_migration` mencatat versi):
  - `app_import_batch` — satu baris per unggahan: jenis, nama file, SHA-256, status
    (`preview`/`selesai`), hitungan, payload operasi (JSON) untuk diterapkan saat konfirmasi.
  - `app_import_issue` — masalah per baris (`error`/`peringatan`, kolom, pesan).
  - `SPK` — SPK hasil impor, gaya tabel klien: `tgl, nit, nik, urut` + 21 kolom produk,
    UNIQUE (`tgl`,`nit`,`nik`).
- Dataset di memori dimuat ulang setelah setiap impor (pointer atomik; request yang sedang
  berjalan tetap memakai dataset lama).

## Jenis data & pemetaan (diperiksa dari file klien)

| Urutan | Jenis | Tujuan | Format yang dikenali |
|---|---|---|---|
| 1 | Data toko | MToko (kunci `nit`) | sheet `MToko` ekspor DB atau CSV dengan header `nit, nama, …` |
| 2 | Data produk | MRoti (kunci `nir`) | sheet `MRoti` atau CSV `nir, nama, harga_beli, harga_jual` |
| 3 | Laporan kunjungan (LPK) | KIRIMAN + STOCK + BS | CSV `LapK_*`: baris info `TANGGAL;KURIR`, header `STATUS;ID_TRANSAKSI;…`, 3 baris per toko: ROTI → KIRIMAN, SISA → STOCK, BS → BS |
| 3b | Kiriman / Sisa stok / BS terpisah | KIRIMAN / STOCK / BS | sheet `KIRIMAN`/`STOCK`/`BS` ekspor DB atau CSV `tgl, nit, nik, <produk…>` |
| 4 | SPK | SPK | CSV `Spk_*`: baris harga di atas, header `urut;nit;nama;kurir;tanggal;<produk…>` |

- Header dicari di 15 baris pertama (judul/baris harga dilewati), dinormalkan huruf kecil +
  trim. Alias produk: `jske→jasuke`, `cang→cocang`, `skmi→sukemi`, `ssr3/sisir3000→sisir3`,
  `ssr2/sisir2000→sisir2`.
- CSV: pemisah `;` atau `,` (dideteksi), BOM dibuang. Tanggal `dd/mm/yyyy`, `yyyy-mm-dd`,
  atau serial Excel. Desimal koma pada koordinat → titik. Koordinat: `LONGITUDE→long`,
  `LATITUDE→latt` (sama dengan isi DB).
- Kurir numerik `1` → `nik` `kurir 1` (bentuk yang sudah ada di DB Agt 2026). Dicatat sebagai
  asumsi yang perlu konfirmasi klien.
- MToko baru: kolom yang tidak ada di file memakai default tabel; `tglmasuk` = `1900-01-01`
  (placeholder yang sudah dipakai data klien); `kec` kosong → digit pertama `nit` (pola 529/529).
  Toko lama: hanya kolom yang ada di file yang dibandingkan/diubah.
- MRoti: hanya `nir` yang punya kolom transaksi (21 produk) — produk baru ditolak dengan
  penjelasan (butuh perubahan struktur tabel).

## Validasi (backend)

Tingkat **file** (impor ditolak seluruhnya): format tidak didukung, > 10 MB, header wajib
tidak ditemukan, tanggal/kurir LPK tidak ada, tidak ada baris data.

Tingkat **baris** — `error` (baris dilewati) atau `peringatan` (baris tetap diimpor):

| Cek | Tingkat |
|---|---|
| Kolom wajib kosong (`nit`, `nama`, `tgl`, `nik`, …) | error |
| Tanggal tidak terbaca / di masa depan (kecuali SPK) | error |
| Jumlah bukan bilangan bulat ≥ 0 | error |
| Toko tidak ada di data toko (transaksi, SPK) | error — "impor data toko dulu" |
| Kunci ganda di file yang sama | error pada baris kedua |
| STATUS LPK tidak dikenal | error |
| Jumlah > 500 pcs untuk satu produk | peringatan |
| Nama toko di file ≠ nama di data toko | peringatan (nama master tidak diubah oleh LPK/SPK) |
| Kunjungan tgl × toko sudah ada atas kurir lain | peringatan — keduanya dijumlahkan di analisis |
| LPK tanpa baris SISA atau BS untuk satu toko | peringatan — kunjungan itu dianggap "data belum cukup" |
| Harga di baris atas SPK ≠ MRoti | peringatan |
| File sama (SHA-256) sudah pernah diimpor | peringatan tingkat file |

Setiap baris valid diklasifikasikan terhadap DB: **baru**, **diperbarui** (dengan daftar
perubahan lama → baru), atau **sama** (dilewati).

## API (envelope sama)

| Endpoint | Fungsi |
|---|---|
| `GET /api/v1/imports/kinds` | daftar jenis + urutan, keterangan, kolom wajib/opsional |
| `POST /api/v1/imports/preview` (multipart `kind`, `file`) | parse + validasi + klasifikasi → batch `preview` |
| `POST /api/v1/imports/{id}/commit` | terapkan dalam satu transaksi (klasifikasi diulang terhadap DB saat itu), muat ulang dataset |
| `GET /api/v1/imports` | riwayat 50 terakhir |
| `GET /api/v1/imports/{id}` | detail + masalah |

Commit kedua untuk batch yang sama → 409. Tanpa autentikasi (sama seperti API lain, listen
127.0.0.1) — dicatat sebagai risiko sebelum dipasang di server bersama.

## Frontend

- Halaman baru `/import-data` (menu "Import Data"), `features/data-import`.
- Langkah: kartu jenis data (urutan disarankan + impor terakhir) → unggah (drag & drop /
  pilih file) → preview (ringkasan angka, tabel masalah, contoh baris + status) → konfirmasi
  (dialog) → ringkasan hasil. Di bawahnya riwayat impor.
- Mode `simulasi`: halaman menampilkan pemberitahuan bahwa impor butuh backend.

## Verifikasi

`go test ./...` (parser LPK/SPK dengan file contoh klien, upsert idempoten, 409, kunci ganda),
FE `yarn lint`, `yarn tsc:check`, `yarn build`; cek manual impor `LapK_1_19-10-2026.csv` dan
`Spk_1_20-10-2026.csv` dua kali (kedua kali: semua "sama").
