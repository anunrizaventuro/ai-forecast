# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is **AI Forecast** — a dashboard for bread-distribution analysis and stock recommendations (how many units of each product a salesperson should bring to each store on the next visit). Next.js 16 + MUI 9 + TypeScript, built on an internal skeleton based on the Zone UI v4.6.0 template (Minimals). The UI language is Indonesian. Live vertical: **forecast** under `/dashboard` (Dashboard, Rekomendasi Stok, Analisis Penjualan, Data Toko, Data Produk); `/` redirects there. Also present: utility pages (error, coming-soon, maintenance, blank) and the `/components` reference gallery. The skeleton's marketing verticals (home/article/support) were removed.

**Data has two sources**, chosen at build time by `NEXT_PUBLIC_FORECAST_SOURCE` (`CONFIG.forecastSource`): `simulasi` (default) and `api` (real data from the Go backend **ai-forecast-be**, contract in `ai-forecast-be/docs/api.md`). Views never touch either directly — they call the hooks in [src/sections/forecast/use-forecast-data.ts](src/sections/forecast/use-forecast-data.ts), which use [src/lib/api/forecast.ts](src/lib/api/forecast.ts) (zod-validated, snake_case → camelCase) in `api` mode. In `simulasi` mode [src/_mock/_forecast.ts](src/_mock/_forecast.ts) generates deterministic dummy rows shaped like the client's source tables (MRoti, MToko, KIRIMAN, BS, STOCK — see `../ai-forecast-be/docs/database-analysis.md`), and [src/sections/forecast/forecast-utils.ts](src/sections/forecast/forecast-utils.ts) derives metrics and the baseline recommendation rule (`../ai-forecast-be/docs/forecast-feasibility.md` §3–§4). The same rule lives in the backend — keep both in sync. Every page must keep the source marker ("simulasi" / "data asli · baseline") until the recommendation rule is validated. Shared types live in [src/types/forecast.ts](src/types/forecast.ts). Other mock data in `src/_mock/` only feeds the component gallery.

Branch model: this repo (github.com/venturo-id/ai-forecast-fe) works on `main`. The upstream skeleton's `production` / `template-default-4.6.0` branches live in the skeleton repo, not here (see docs/distribution.md for cherry-picking fixes).

Step-by-step team recipes live in [docs/](docs/): add-a-page, add-an-api-endpoint, branding (per-client checklist), deployment (Docker/Jenkins), distribution (template-repo + cherry-pick model). Point users there for how-to questions; this file stays the source of truth for the rules themselves.

## Commands

Dev server and build run on **port 8002**.

```sh
yarn dev            # start dev server (port 8002)
yarn build          # production build
yarn start          # serve production build (port 8002)

yarn lint           # eslint over src/**/*.{js,jsx,ts,tsx}
yarn lint:fix       # eslint --fix
yarn fm:check       # prettier --check
yarn fm:fix         # prettier --write
yarn fix:all        # lint:fix + fm:fix (run before committing)

yarn tsc:check      # tsc --noEmit --pretty (type-check, no test runner exists)
yarn tsc:watch      # type-check in watch mode
```

There is **no test framework** configured — `tsc:check` plus lint are the verification gates, enforced automatically: husky pre-commit runs lint-staged (eslint + prettier on staged files), pre-push runs `tsc:check`, and the `Jenkinsfile` runs the full gate (install → lint → fm:check → tsc:check → build) in CI. Yarn is the ONLY package manager (`packageManager: yarn@1.22.22`, Node >= 22.12, see `.nvmrc`); never use npm or commit a `package-lock.json`.

**Production Docker:** `docker compose up -d --build` — multi-stage standalone image listening on port 80, env from `.env.prod` (gitignored). `NEXT_PUBLIC_*` values are baked into the bundle at image BUILD time — changing them requires a rebuild, not a restart; server-only vars (`API_URL`, `REVALIDATE_TOKEN`) also flow at runtime via compose `env_file`. `output: 'standalone'` only activates when `BUILD_STANDALONE=true` (set by the Dockerfile), so plain `yarn build`/`yarn start` behave as before.

## Architecture

### The page → view → section pattern (most important)

Routing uses the **App Router** under [src/app/](src/app/). Route-group rule: a group = a shared layout without adding a URL segment — `(simple)` for compact utility pages (coming-soon, maintenance); other routes carry their own `layout.tsx`. The layering is strict and pervasive:

- **`src/app/<route>/page.tsx`** — thin Server Component. Exports `metadata` (short title only — the root layout template appends "- AI Forecast") and does server-side data fetching, then renders a single `*View`. Keep these minimal.
- **`src/app/<route>/layout.tsx`** — wraps children in a layout (`MainLayout` or `SimpleLayout`).
- **`src/sections/<vertical>/view/<name>-view.tsx`** — the `'use client'` View that composes the page from section components. This shape is mandatory for every vertical (including error/coming-soon/maintenance). Section dirs use plain kebab-case names (`forecast`, `error`, …); the ONLY underscore-prefixed dir is `_examples` (the component gallery — not a page vertical).
- **`src/sections/<vertical>/<name>-section.tsx`** — individual presentational/section building blocks.

When adding a page, follow this chain: create the section components and a `view`, then a thin `page.tsx` that imports the view. Don't put substantial UI directly in `app/`.

### API/data layer (the reference pattern)

[src/lib/api/](src/lib/api/) is the canonical pattern for talking to the backend — **[src/lib/api/articles.ts](src/lib/api/articles.ts) is the reference implementation; copy its shape for every new endpoint**: entry in `endpoints.ts` → zod schema validated at the fetch boundary (no `as`-casts) → fetcher via the shared `apiFetch` (typed `ApiError`, `X-Company-Slug` header) → query-key factory → `'use client'` hooks in a separate `use-*.ts` module (intentionally NOT re-exported from the barrel — server code must not import client hooks).

Three data-flow modes, by SEO/interactivity need (the example pages were removed with the marketing verticals — the patterns still apply to future API-backed pages):

1. **RSC props**: fetch in `page.tsx`, pass as props, `.catch(() => null)` + static fallback in the section so the page never breaks when the API is down.
2. **Prefetch + HydrationBoundary** (interactive lists): server `prefetchQuery` + client `useQuery` for interactive lists (TanStack SSR pattern, see [src/lib/query/](src/lib/query/)).
3. **Pure RSC + ISR** (detail pages): `revalidate` export + `generateMetadata`; 404 via `notFound()`.

### Component reference gallery (for AI and developers)

**Before writing any new UI pattern, check whether an example already exists** — the gallery at `/components` renders [src/sections/_examples/](src/sections/_examples/), the canonical usage samples for every shared component in [src/components/](src/components/) (carousel, animate, hook-form fields, image, lightbox, markdown, icons, etc.). Follow those patterns; do not invent parallel ones.

The gallery is dev-only by default: always visible under `yarn dev`, and in production builds only when `NEXT_PUBLIC_SHOW_COMPONENTS=true` (client deploys leave it unset → all `/components/*` routes 404, enforced in [src/middleware.ts](src/middleware.ts) — a layout-level `notFound()` cannot gate statically prerendered pages). Several dependencies exist ONLY for the gallery (`yet-another-react-lightbox`, `react-phone-number-input`, `@mui/lab`, `mui-one-time-password-input`, embla `fade`/`auto-height` plugins, `@mui/x-date-pickers`) — a client project that strips the gallery can remove them too.

### Routing

All route strings are centralized in [src/routes/paths.ts](src/routes/paths.ts) as the `paths` object (use these, do not hardcode URLs; dynamic routes are functions, e.g. `paths.dashboard.recommendation`). Trailing-slash policy: `paths.*` entries have NO trailing slash; crawler-facing URLs (canonical/sitemap/JSON-LD) must end with `/` — compose them with `pathWithSlash()` from the same module. Navigation helpers in [src/routes/hooks/](src/routes/hooks/) (`useRouter`, `usePathname`, `useParams`, `useSearchParams`) wrap `next/navigation`; prefer them and the `RouterLink` component over importing `next/navigation`/`next/link` directly.

### Theme system

[src/theme/](src/theme/) is a full MUI theme built on **CSS variables** (light/dark via `colorSchemeSelector`). Key pieces: `theme-config.ts` (fonts, defaults), `create-theme.ts`, per-component overrides in `core/components/`, and `theme-overrides.ts` for app-level tweaks. User-facing settings are runtime state managed by `SettingsProvider`/`SettingsDrawer` in [src/components/settings/](src/components/settings/) and merged via `theme/with-settings/`. The whole provider stack is assembled in [src/app/layout.tsx](src/app/layout.tsx).

### Forms

Forms use **react-hook-form + Zod**. Do not use raw MUI inputs in forms — use the RHF wrappers in [src/components/hook-form/](src/components/hook-form/) (exported as the `Field.*` namespace plus `Form`). `schema-utils.ts` holds shared Zod helpers. Resolvers come from `@hookform/resolvers/zod`. Usage samples: `/components/form-validation` in the gallery.

### Layouts, components, mock data

- [src/layouts/](src/layouts/) — page shells (`main`, `simple`); nav config lives in `nav-config-main.tsx`.
- [src/components/](src/components/) — shared reusable components (iconify, carousel, image, animate, scrollbar, etc.). Each folder has an `index.ts` barrel.
- [src/_mock/](src/_mock/) — sample data for the gallery + static fallbacks only. Real features fetch from the backend via `src/lib/api`.
- [src/lib/env.ts](src/lib/env.ts) — the ONLY place env vars are read: zod-validated at module load, so a missing/malformed required var fails the build with a clear message. [src/global-config.ts](src/global-config.ts) exposes them as `CONFIG`; consume that, never `process.env` directly (exception: `src/middleware.ts`, which runs in its own bundle).

## SEO rules

- Root layout owns the title template (`%s - AI Forecast`, from `CONFIG.appName`), default description (`CONFIG.appDescription`), OG/Twitter defaults, and the file-convention `opengraph-image.png`/`twitter-image.png`. Page-level `openGraph` REPLACES the root's whole object — restate everything.
- The dashboard is internal: `/dashboard` sets `robots: noindex` and `robots.ts` disallows the whole site (no sitemap).
- Above-the-fold/LCP content must be visible in SSR HTML: no entry animations on hero H1/CTA, hero images use `visibleByDefault` + `fetchPriority: 'high'`.
- `NEXT_PUBLIC_SITE_URL` is required for production builds (build fails without it).

## Conventions

- **Path alias:** import internal modules as `src/...` (absolute, via `baseUrl: "."`). The ESLint `perfectionist` plugin sorts imports into ordered groups (mui → routes → hooks → utils → internal → components → sections → types → relative) by **line length ascending** — let `yarn fix:all` handle ordering rather than hand-sorting.
- **SVGs** import as React components via `@svgr/webpack` (configured for both webpack and turbopack in [next.config.ts](next.config.ts)).
- `trailingSlash: true` is set globally — generated URLs end in `/`.
- Prettier: single quotes, semicolons, `printWidth: 100`, `trailingComma: es5`.
- ESLint disables `@typescript-eslint/no-explicit-any` and enforces `consistent-type-imports` (use `import type`); unused imports/vars are auto-removable warnings (prefix intentionally-unused vars with `_`).
- Files use kebab-case; barrel `index.ts` files re-export from each directory.
- Env vars: copy `.env.example` to `.env` (committed template documents every variable); `.env` itself stays gitignored.
