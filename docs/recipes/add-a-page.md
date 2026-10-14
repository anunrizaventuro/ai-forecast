# Resep: menambah halaman baru

Urutan bakunya: **paths.ts → section → view → layout → page → nav → sitemap**.
Contoh nyata yang dipakai di sepanjang resep ini: halaman `/support` (FAQ) — halaman
paling lengkap karena punya data API + fallback statis.

> Aturan arsitektur lengkap ada di [CLAUDE.md](../../CLAUDE.md). Resep ini versi
> langkah-demi-langkah-nya.

## 1. Daftarkan route di `src/routes/paths.ts`

Semua string URL terpusat di sini — komponen tidak boleh hardcode `'/support'`.

```ts
export const paths = {
  // ...
  support: '/support',                              // halaman statis
  article: {
    root: '/article',
    details: (slug: string) => `/article/${slug}`,  // halaman dinamis = fungsi
  },
};
```

Entri **tanpa** trailing slash. URL untuk crawler (canonical, sitemap, JSON-LD)
**wajib** ber-slash — rakit dengan `pathWithSlash(paths.support)`.

## 2. Buat section components di `src/sections/<nama>/`

Satu folder per vertical, nama kebab-case polos (`support`, bukan `_support` —
satu-satunya prefix underscore adalah `_examples`, galeri komponen).

```
src/sections/support/
├── support-hero.tsx        ← blok presentasional per-bagian halaman
├── support-nav.tsx
├── support-content.tsx
└── view/
    └── support-view.tsx    ← WAJIB: view yang merangkai section jadi halaman
```

**Sebelum menulis pola UI baru, cek dulu galerinya** di `/components` (`yarn dev`) —
carousel, form, animate, image, dsb. sudah ada contoh kanoniknya di
`src/sections/_examples/`. Ikuti pola itu, jangan bikin varian paralel.

## 3. Buat view di `src/sections/<nama>/view/<nama>-view.tsx`

View adalah `'use client'` component yang menerima data dari server sebagai props
dan merangkai section:

```tsx
'use client';

import type { FaqGroup } from 'src/lib/api';

type SupportViewProps = {
  faqGroups?: FaqGroup[] | null;   // null = API mati → pakai fallback statis
  waLink?: string | null;
};

export function SupportView({ faqGroups, waLink }: SupportViewProps) {
  const resolvedGroups = faqGroups?.length ? faqGroups : FALLBACK_GROUPS;
  // ...rangkai <SupportHero />, <SupportNav />, <SupportContent />
}
```

Bentuk ini wajib untuk SEMUA vertical — termasuk halaman utilitas
(lihat `src/sections/error/view/`, `coming-soon`, `maintenance`).

## 4. Layout: pilih shell atau route group

- Butuh header+footer utama → `layout.tsx` yang me-render `MainLayout`
  (contoh: `src/app/support/layout.tsx`).
- Halaman utilitas compact → masukkan ke route group `(simple)` yang sudah ada
  (`src/app/(simple)/` — coming-soon & maintenance berbagi satu layout).
- Aturan route group: group = layout bersama TANPA menambah segmen URL.
  Jangan buat group baru hanya untuk satu halaman.

## 5. Buat `src/app/<route>/page.tsx` — tipis saja

Page = Server Component tipis: metadata + fetch + render satu `*View`. Jangan
menaruh UI substansial di `app/`.

```tsx
import type { Metadata } from 'next';

import { paths, pathWithSlash } from 'src/routes/paths';
import { getFaqGroups, getWhatsAppLink } from 'src/lib/api';

import { SupportView } from 'src/sections/support/view/support-view';

export const metadata: Metadata = {
  title: 'FAQ',                    // judul PENDEK — root layout menambah "- AI Forecast"
  description: '…',
  alternates: { canonical: pathWithSlash(paths.support) },
};

export default async function Page() {
  const [faqGroups, waLink] = await Promise.all([
    getFaqGroups('id').catch(() => null),     // API mati → view pakai fallback
    getWhatsAppLink('id').catch(() => null),
  ]);

  return <SupportView faqGroups={faqGroups} waLink={waLink} />;
}
```

Pilih **mode data-flow** sesuai kebutuhan (detail di CLAUDE.md):

| Mode | Kapan | Contoh |
|---|---|---|
| RSC props + fallback | konten marketing, SEO penting, tanpa interaksi filter | home, support |
| Prefetch + HydrationBoundary | list interaktif (filter/paginasi client) | `src/app/article/page.tsx` |
| Pure RSC + ISR | halaman detail per-slug + `generateMetadata` | `src/app/article/[slug]/page.tsx` |

Jebakan metadata: `openGraph` level halaman **me-replace seluruh** objek openGraph
root (termasuk og:image) — kalau menulisnya, tulis lengkap (lihat
`src/app/(home)/page.tsx`).

## 6. Tambahkan ke nav — SETELAH halamannya jadi

`src/layouts/nav-config-main.tsx`:

```ts
export const navData = [
  { title: 'Home', path: paths.home },
  { title: 'Article', path: paths.article.root },
  { title: 'FAQ', path: paths.support },   // path dari paths.ts, jangan '#'
];
```

## 7. Daftarkan di sitemap (halaman publik yang boleh diindex)

`src/app/sitemap.ts` → tambah satu entri ke `staticEntries`:

```ts
{ url: `${CONFIG.siteUrl}${pathWithSlash(paths.support)}` },
```

Halaman yang TIDAK boleh diindex (utility/error) justru diberi
`robots: { index: false }` di metadatanya — lihat `src/app/(simple)/coming-soon/page.tsx`.

## 8. Verifikasi

```sh
yarn dev            # cek visual di :8002
yarn tsc:check      # gate utama (tidak ada test runner)
yarn build          # pastikan halaman ikut ter-build tanpa error
```

Untuk halaman ber-API: matikan backend lalu muat ulang halaman — harus tetap
utuh dengan konten fallback, bukan error.
