# Branding per-client — checklist

> **Status AI Forecast (14 Okt 2026):** langkah 1–2 dan 4 sudah diterapkan —
> `appName`/`appDescription` di `src/global-config.ts`, ikon merek di
> `public/assets/brand/`, favicon, apple-touch-icon, OG/Twitter image, manifest,
> footer, nav. Vertikal marketing (home/article/support) beserta asetnya sudah
> dihapus, jadi butir yang merujuk `home-data.ts` / `(home)/page.tsx` tidak
> berlaku lagi. Palette & font (langkah 3) sengaja tetap bawaan skeleton.

Urutan kerja saat meng-clone skeleton ini untuk client baru. Semua titik sentuh
brand terkumpul di sini; kerjakan atas-ke-bawah, coret satu per satu.

## 1. Identitas dasar

- [ ] **`.env`** — isi dari `.env.example`: `NEXT_PUBLIC_COMPANY_SLUG`,
      `NEXT_PUBLIC_CLIENT_SLUG`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL`
      (domain client). Deploy client: `NEXT_PUBLIC_SHOW_COMPONENTS` dibiarkan
      kosong → galeri `/components` 404.
- [ ] **`package.json`** — `name` (`@venturo/<client>-web`), `description`.
- [ ] **`src/global-config.ts`** — `appName` (dipakai title template
      "%s - <appName>", manifest, JSON-LD Organization/WebSite).
- [ ] **`src/app/layout.tsx`** — `lang` html bila bukan `id`; default
      `description` + judul default.

## 2. Logo & ikon

- [ ] **Logo** — ganti dua file yang dirujuk `src/components/logo/logo.tsx`:
      logo penuh + logo ikon (webp, di `public/assets/venturo/` → pindahkan ke
      folder client sendiri dan update path-nya). `aria-label` ikut diganti.
- [ ] **Favicon** — `public/favicon.ico` + `public/apple-touch-icon.png` (180×180).
- [ ] **OG image** — `src/app/opengraph-image.png` + `twitter-image.png`
      (1200×630) beserta file `*.alt.txt`-nya. Ini og:image default seluruh site.
- [ ] **Manifest** — `src/app/manifest.ts`: `description`; `theme_color` otomatis
      ikut palette primary.

## 3. Warna & font

- [ ] **Palette** — `src/theme/theme-config.ts` → `palette.primary`
      (lighter/light/main/dark/darker). Generator shade yang praktis:
      https://mui.com/material-ui/customization/color/ atau eva.design.
      Jaga kontras teks-di-atas-primary ≥ 4.5:1 (WCAG AA).
- [ ] **Font** — tiga titik yang harus konsisten:
      1. file woff2 di `src/assets/fonts/` (ambil dari fontsource, subset latin),
      2. definisi `localFont` di `src/app/layout.tsx` (CSS variable),
      3. `fontFamily.primary/secondary` di `src/theme/theme-config.ts`
         (merujuk `var(--font-…)`).
- [ ] **Tweak theme app-level** — `src/theme/theme-overrides.ts` (jangan edit
      `core/` — itu milik template, menyulitkan diff upstream).

## 4. Konten & navigasi

- [ ] **Copy home** — `src/sections/home/home-data.ts`: semua teks, gambar
      (webp, terkompres!), `CONTACT` (nomor WhatsApp fallback + email).
- [ ] **Metadata home** — `src/app/(home)/page.tsx`: `TITLE` + `DESCRIPTION`
      (ini judul SEO utama site; tulis lengkap dengan kata kunci client).
- [ ] **Nav** — `src/layouts/nav-config-main.tsx`: menu sesuai halaman yang ada.
- [ ] **Footer** — `src/layouts/main/footer.tsx`: alamat, sosial media, copyright.
- [ ] **FAQ fallback** — `FAQS` di `home-data.ts` (dipakai home & /support saat
      API mati) — isi dengan Q&A client, jangan biarkan punya Venturo.

## 5. SEO teknis (jarang perlu disentuh, cukup dicek)

- [ ] JSON-LD Organization (`src/lib/seo.ts`) — logo & contactPoint sudah ikut
      `CONFIG.appName`/props; pastikan path logo benar setelah langkah 2.
- [ ] `robots.ts` + `sitemap.ts` — otomatis ikut `NEXT_PUBLIC_SITE_URL`; tidak
      perlu edit kecuali ada halaman baru (lihat resep add-a-page).
- [ ] Utility pages (`coming-soon`, `maintenance`, `error/*`) — teks masih
      bahasa Inggris bawaan template; terjemahkan bila client memintanya.

## 6. Verifikasi akhir

```sh
yarn fix:all && yarn tsc:check && yarn build
```

- Grep sisa brand lama: `grep -ri "venturo" src public --include="*.ts*" -l`
  (kecuali yang memang milik Venturo sebagai vendor).
- Cek og:image & title: view-source pada `/` — `<title>`, `og:image`,
  JSON-LD Organization.
- Lighthouse sekali jalan (Performance + SEO + a11y) sebelum serah terima.
