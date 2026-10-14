# Resep: menambah endpoint API baru

**`src/lib/api/articles.ts` adalah referensi pola — tiru bentuknya persis** untuk
setiap endpoint baru. Rantainya:

```
endpoints.ts → schema zod → fetcher (apiFetch) → query keys → hooks (use-*.ts)
```

## Kontrak backend

Sumber kebenaran kontrak adalah repo backend Go **`marketplace-be`**, folder
`docs/api-contract/` (satu file markdown per resource, mis.
`marketplace/articles.md`). Clone repo-nya bersebelahan dengan project ini dan
baca kontraknya SEBELUM menulis schema — komentar di tiap modul `src/lib/api/*`
menunjuk file kontrak yang dicerminkannya.

Semua endpoint publik memakai envelope yang sama:

```jsonc
{ "data": …, "message": "…", "meta": { "pagination": … }, "errors": null }
```

`apiFetch` (di `client.ts`) sudah meng-unwrap envelope ini, menyuntik header
tenant `X-Company-Slug`, dan menormalkan SEMUA kegagalan menjadi `ApiError`
(HTTP non-2xx, timeout, network error — abort diteruskan apa adanya).

## Langkah 1 — daftarkan path di `endpoints.ts`

```ts
export const endpoints = {
  // ...
  testimonials: {
    list: 'api/testimonials',                    // TANPA leading slash —
    details: (id: string) => `api/testimonials/${encodeURIComponent(id)}`,
  },
};
```

Path relatif (tanpa `/` di depan) supaya tetap benar saat `baseUrl` membawa
path prefix.

## Langkah 2 — schema zod, divalidasi di boundary

```ts
export const testimonialSchema = z.object({
  id: z.string(),                                 // field identitas: wajib
  name: z.string(),
  quote: z.string().optional().default(''),       // sisanya toleran + default aman
  avatar_url: z.string().nullish(),
});

export type Testimonial = z.infer<typeof testimonialSchema>;
```

Aturan: **tidak ada `as`-cast** — bentuk data dibuktikan `parse()` saat fetch,
sehingga drift kontrak backend gagal keras di satu tempat, bukan diam-diam di
dalam komponen. Go memarshal slice nil sebagai `null` → pakai helper
`nullableList()` (lihat articles.ts) untuk menormalkan ke `[]`.

## Langkah 3 — fetcher via `apiFetch`

```ts
export const TESTIMONIALS_TAG = 'testimonials';

type FetchOptions = { revalidate?: number; signal?: AbortSignal };

export async function getTestimonials(options: FetchOptions = {}): Promise<Testimonial[]> {
  const { data } = await apiFetch<unknown>(endpoints.testimonials.list, {
    signal: options.signal,
    next: { revalidate: options.revalidate ?? 300, tags: [TESTIMONIALS_TAG] },
  });

  return nullableList(testimonialSchema).parse(data);
}
```

- `next.revalidate/tags` → Next Data Cache di server (browser mengabaikannya);
  fetch di Next 15/16 TIDAK di-cache tanpa `revalidate` eksplisit.
- Tag baru? Tambahkan juga ke `ALLOWED_TAGS` di
  `src/app/api/revalidate/route.ts` supaya webhook CMS bisa membersihkannya.
- `meta.pagination` juga `unknown` sampai di-parse — pakai `apiPaginationSchema`
  (lihat `getArticles`).

## Langkah 4 — query keys (kalau dipakai TanStack Query)

```ts
export const testimonialKeys = {
  all: ['testimonials'] as const,
  list: (filters: Filters) => [...testimonialKeys.all, 'list', {
    page: filters.page ?? 1,
    limit: filters.limit ?? DEFAULT_LIMIT,   // SEMUA filter yang ikut request
  }] as const,                               // harus ikut key — kalau tidak,
};                                           // dua result set berbagi 1 cache
```

Keys tinggal di modul server-safe (BUKAN file `'use client'`) supaya bisa
dipakai `prefetchQuery` di Server Component.

## Langkah 5 — hooks di `use-<nama>.ts` terpisah

```ts
'use client';

export function useTestimonialsQuery() {
  return useQuery({
    queryKey: testimonialKeys.all,
    queryFn: ({ signal }) => getTestimonials({ signal }),  // teruskan signal!
  });
}
```

Modul hooks **sengaja TIDAK di-re-export dari barrel `index.ts`** — server code
meng-import barrel; kalau barrel ikut menarik file `'use client'`, semua
export-nya berubah jadi client reference. Import hooks langsung dari modulnya.

## Langkah 6 — konsumsi di halaman + idiom fallback

Halaman marketing tidak boleh pecah saat backend mati:

```tsx
// page.tsx (Server Component)
const testimonials = await getTestimonials().catch(() => null);
return <HomeView testimonials={testimonials} />;

// di view/section
const resolved = testimonials?.length ? testimonials : STATIC_FALLBACK;
```

Kebalikannya di halaman detail ISR: HANYA 404 definitif yang jadi `notFound()`;
kegagalan transien harus `throw` supaya ISR terus menyajikan versi terakhir yang
sehat (lihat `fetchArticle` di `src/app/article/[slug]/page.tsx`).

## Pembagian peran yang sudah diputuskan (jangan diubah tanpa alasan)

| Lapisan | Peran |
|---|---|
| ky (`client.ts`) | timeout 10 dtk; retry transport `{ limit: 2, methods: ['get'] }` |
| TanStack Query | retry level query di browser, cache client, `AbortSignal` |
| Next Data Cache | cache server via `next.revalidate` + tag → dibersihkan webhook `/api/revalidate/` |
| zod | validasi di fetch boundary — satu-satunya pintu masuk data eksternal |
