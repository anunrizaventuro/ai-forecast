# Pengaturan Rekomendasi — Design

Tanggal: 2026-10-15 · Repo: ai-forecast-fe + ai-forecast-be

## Tujuan

Admin bisa mengatur parameter aturan rekomendasi stok (terutama sinyal retur / BS)
tanpa mengubah kode: batas retur maksimal, besar pengurangan, dan berapa lama retur
tinggi harus terjadi sebelum stok diturunkan. Satu pengaturan **global** untuk semua
toko & produk (pengecualian per produk/toko = pekerjaan lanjutan).

Berhasil bila: mengubah pengaturan langsung mengubah hasil di Rekomendasi Stok
(kedua mode sumber data), FE dan BE menghasilkan angka identik untuk parameter yang
sama, dan default menghasilkan perilaku persis seperti sekarang.

## Parameter

Satuan waktu = **kunjungan** (interval tiap toko beda-beda, 2–7 hari). Form menampilkan
perkiraan hari berdasarkan interval rata-rata semua toko.

| Field (FE / BE json) | Default | Rentang | Arti |
|---|---|---|---|
| `returnThreshold` / `return_threshold` | 0.15 | 0.01–1 | Rasio BS ÷ kiriman sebelumnya yang dianggap retur tinggi |
| `returnWindow` / `return_window` | 3 | 1–8 | Jumlah observasi terakhir untuk menghitung rasio retur agregat |
| `returnStreak` / `return_streak` | 1 | 1–8, ≤ `returnWindow` | Kunjungan beruntun (terakhir) yang masing-masing harus > ambang |
| `returnCutUnit` / `return_cut_unit` | `pcs` | `pcs` \| `persen` | Satuan pengurangan |
| `returnCut` / `return_cut` | 1 | pcs: 1–50; persen: 0.01–0.9 | Besar pengurangan |
| `stockoutBonus` / `stockout_bonus` | 1 | 0–20 | Tambahan pcs saat sinyal habis (Lanjutan) |
| `window` | 4 | 1–12 | Observasi dasar median (Lanjutan, sudah ada) |
| `minObservations` / `min_observations` | 3 | 1–`window` | Minimum sebelum pakai riwayat sendiri (Lanjutan, sudah ada) |
| `maxStepRatio` / `max_step_ratio` | 0.3 | 0.05–1 | Batas perubahan per kunjungan (Lanjutan, sudah ada) |
| `minStep` / `min_step` | 2 | 0–50 | Batas perubahan minimum pcs (Lanjutan, sudah ada) |

### Aturan sinyal retur (baru, menggantikan "> 15% pada 3 obs → −1")

```
obs        = observasi andal (reliable, estSold ≠ null), terakhir `window` → dasar median (tidak berubah)
retObs     = observasi andal terakhir `returnWindow` (diambil dari SEMUA observasi andal, bukan hanya `obs`)
returnRate = Σ bs(retObs) / Σ prevKirim(retObs)           (null bila penyebut 0)
streakOk   = returnStreak ≤ 1
             ATAU (len(retObs) ≥ returnStreak DAN returnStreak observasi terakhir
                   masing-masing bs/prevKirim > returnThreshold)
retur-tinggi bila returnRate > returnThreshold DAN streakOk
cut        = pcs    → returnCut
             persen → max(1, round(base × returnCut))
adjustment -= cut
```

Dengan default (window 3, streak 1, 1 pcs) hasilnya identik dengan aturan sekarang
(sekarang `recentObs = obs.slice(-3)` dengan `obs` ≤ 4 terakhir — sama dengan 3
observasi andal terakhir). Sinyal habis: `adjustment += stockoutBonus` (default 1 = sekarang).
Langkah lain (fallback, batas langkah, floor) tidak berubah.

## Backend (ai-forecast-be)

- `internal/forecast/model.go`: `Params` + field baru, `DefaultParams` diperbarui,
  `func (p Params) Validate() map[string][]string` (pesan bahasa Indonesia per field).
- `internal/forecast/recommend.go`: aturan di atas. Backtest otomatis ikut (memakai `Params`).
- `internal/settings` (paket baru): `Store` dengan `Get() forecast.Params` dan
  `Set(forecast.Params) error`; mutex RW; persist ke file JSON (tulis ke temp lalu rename).
  File tidak ada → `DefaultParams`. File rusak → log peringatan + `DefaultParams`.
  Field yang hilang di file diisi dari default (decode di atas salinan `DefaultParams`).
- `internal/config`: env `AI_FORECAST_SETTINGS` (default `settings.json`, di-.gitignore).
- `internal/httpapi`: `Server.params` diganti `*settings.Store`.
  - `GET /api/v1/forecast/settings` → `{ data: { params, defaults, updated_at } }`
  - `PUT /api/v1/forecast/settings` body = params lengkap → 422 + `errors` per field bila
    tidak valid; 200 dengan bentuk sama seperti GET bila sukses.
  - CORS: izinkan `PUT` dan `Content-Type`.
- Tes: `forecast_test.go` (default = perilaku lama, streak, cut persen, stockout bonus),
  `server_test.go` (GET, PUT valid, PUT 422, persist ke file temp).
- `docs/api.md`: dokumentasi endpoint + parameter.

## Frontend (ai-forecast-fe)

- `src/types/forecast.ts`: tipe `RecommendationParams`, `ReturnCutUnit`.
- `forecast-utils.ts`: `REC_PARAMS` → `DEFAULT_REC_PARAMS`; `computeRecommendations(cells, asOf, params)`.
  Validasi lewat satu zod schema bersama (`src/sections/forecast/recommendation-params-schema.ts`)
  yang dipakai form dan pembacaan `localStorage` — rentangnya sama dengan `Params.Validate()` di BE.
  `SIGNAL_LABEL` statis tetap, ditambah `signalLabel(signal, params)` untuk label dinamis
  ("Retur tinggi (−2 pcs)", "Retur tinggi (−10%)", "Sinyal habis (+1)").
- `src/lib/api`: endpoint `forecast.settings`, schema zod (snake → camel), `getForecastSettings`,
  `updateForecastSettings`, key `forecastKeys.settings`.
- `use-recommendation-params.ts` (file sendiri — dipakai `use-forecast-data.ts`, hindari import melingkar): `useRecommendationParams()` → `{ params, defaults, updatedAt, loading, save, saving }`.
  - api: `useQuery` + `useMutation`; sukses simpan → invalidate `forecastKeys.settings`
    dan semua query rekomendasi/backtest.
  - simulasi: `localStorage` key `ai-forecast:rec-params` (try/catch, divalidasi schema,
    fallback default), state lewat `useSyncExternalStore` agar semua halaman ikut berubah.
  - `useForecastRecommendations` memasukkan params ke query key simulasi.
- Pemakai `REC_PARAMS` (`forecast-cells.tsx`, `recommendation-method.tsx`, `store-list-view.tsx`,
  `recommendation-table.tsx`) beralih ke params aktif.
- Halaman `/dashboard/pengaturan` (`paths.dashboard.settings`), menu sidebar "Pengaturan":
  - `src/app/dashboard/pengaturan/page.tsx` (metadata "Pengaturan") → `SettingsView`.
  - `src/sections/forecast/view/settings-view.tsx` + `settings-return-form.tsx`:
    Form RHF + zod (`Field.*`), kartu "Sinyal Retur (BS)" dan accordion "Lanjutan".
    Pratinjau kalimat aturan ("Jika retur > 15% dari 3 kunjungan terakhir, dan 1 kunjungan
    terakhir berturut-turut di atas batas, kurangi 1 pcs") + perkiraan hari.
  - Tombol Simpan (dialog konfirmasi: berlaku untuk semua pengguna di mode api),
    Batal (reset form), Kembalikan ke default. Toast sukses/gagal; error 422 dipetakan ke field.
  - Penanda sumber data ("simulasi — tersimpan di browser ini" / "data asli · baseline") tetap ada.
- Halaman Rekomendasi Stok: `recommendation-method.tsx` menampilkan parameter aktif + link ke Pengaturan.

## Di luar cakupan

- Pengaturan per produk / toko / kecamatan.
- Autentikasi/otorisasi (dashboard belum punya login; dicatat sebagai risiko).
- Riwayat/audit perubahan pengaturan.

## Verifikasi

- BE: `go test ./...`.
- FE: `yarn lint`, `yarn tsc:check`, `yarn build`; cek manual halaman Pengaturan di kedua mode.
- Paritas: default params menghasilkan rekomendasi identik dengan sebelum perubahan (tes BE
  dengan fixture yang ada; FE dibandingkan sebelum/sesudah pada data simulasi).
