# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is **AI Forecast** — a dashboard for bread-distribution analysis and stock recommendations (how many units of each product a salesperson should bring to each store on the next visit). Vite 7 + React 19 + React Router 7 + MUI 7 + TypeScript, built on **venturo-skeleton-react** (Minimals MUI starter v7.6.1). The skeleton was only the starting point — there is no `skeleton` remote and no syncing with it; fix things here. The UI language is Indonesian. Pages (all at the root): `/` Dashboard, `/rekomendasi-stok`, `/analisis-penjualan`, `/toko`, `/produk`, `/pengaturan`. Old Next.js paths `/dashboard/*` redirect to these (`legacyRedirects` in [src/routes/paths.ts](src/routes/paths.ts)).

**Data has two sources**, chosen at build time by `VITE_FORECAST_SOURCE` (`CONFIG.forecastSource`): `simulasi` (default) and `api` (real data from the Go backend **ai-forecast-be**, contract in `ai-forecast-be/docs/api.md`). Views never touch either directly — they call the hooks in [src/module/forecast/shared/hooks/use-forecast-data.ts](src/module/forecast/shared/hooks/use-forecast-data.ts), which use [src/module/forecast/shared/api/](src/module/forecast/shared/api/) (zod-validated, snake_case → camelCase) in `api` mode. In `simulasi` mode [src/module/forecast/shared/data/simulasi.ts](src/module/forecast/shared/data/simulasi.ts) generates deterministic dummy rows shaped like the client's source tables (MRoti, MToko, KIRIMAN, BS, STOCK — see `../ai-forecast-be/docs/database-analysis.md`), and [src/module/forecast/shared/utils/forecast-utils.ts](src/module/forecast/shared/utils/forecast-utils.ts) derives metrics and the baseline recommendation rule (`../ai-forecast-be/docs/forecast-feasibility.md` §3–§4). The same rule lives in the backend — keep both in sync. The rule's parameters are admin-editable at `/pengaturan` via [use-recommendation-params.ts](src/module/forecast/shared/hooks/use-recommendation-params.ts) — `simulasi` stores them in localStorage, `api` uses `GET/PUT /api/v1/forecast/settings` (backend side still pending, see `docs/superpowers/plans/2026-10-15-pengaturan-rekomendasi.md` Task 1–3); `DEFAULT_REC_PARAMS` must equal the backend's `DefaultParams`. Every page must keep the source marker (`ForecastSourceChip`: "simulasi" / "data asli · baseline") until the recommendation rule is validated. Shared types live in [src/module/forecast/shared/types/](src/module/forecast/shared/types/).

**Equivalence check:** `scripts/forecast-baseline.ts` prints the metrics + recommendations for the default filter in simulasi mode; `scripts/forecast-baseline.json` is the reference captured from the pre-migration Next.js code. After touching `forecast-utils.ts` or the simulator, run it and diff (an intended change → regenerate the JSON in the same commit):

```sh
node_modules/.bin/esbuild scripts/forecast-baseline.ts --bundle --platform=node --format=esm \
  --tsconfig=tsconfig.json --outfile=/tmp/fb.mjs && node /tmp/fb.mjs | diff - scripts/forecast-baseline.json
```

Branch model: this repo (github.com/venturo-id/ai-forecast-fe) works on `staging` (default branch).

## Commands

Dev server and preview run on **port 8002**.

```sh
yarn dev            # Vite dev server (+ in-process TS/ESLint checker overlay)
yarn build          # tsc && vite build → dist/
yarn start          # vite preview of dist/

yarn lint           # eslint over src/**/*.{js,jsx,ts,tsx}
yarn lint:fix
yarn fm:check       # prettier --check
yarn fm:fix
yarn fix:all        # lint:fix + fm:fix (run before committing)

yarn tsc:check      # tsc --noEmit --pretty
yarn tsc:watch
```

There is **no test framework** — `tsc:check` plus lint are the verification gates (and the baseline script above for calculation changes), enforced automatically: husky pre-commit runs lint-staged (eslint + prettier on staged files), pre-push runs `tsc:check`, and the `Jenkinsfile` runs install → lint → fm:check → tsc:check → build. Yarn is the ONLY package manager (`packageManager: yarn@1.22.22`, Node >= 22.12, see `.nvmrc`); never use npm or commit a `package-lock.json`.

**Production Docker:** `docker compose up -d --build` — multi-stage build, `dist/` served by nginx on port 80 ([nginx.conf](nginx.conf), SPA fallback). `.env.prod` (gitignored) is copied to `.env` at image BUILD time; every `VITE_*` value is inlined into the bundle, so changing one requires a rebuild. See [docs/deployment.md](docs/deployment.md).

## Architecture

### Module layout (feature modules)

Code is split into domain modules under [src/module/](src/module/), each feature following `features/<feature>/{api,components,hooks,pages,types,views}` (see [docs/patterns/feature-module.md](docs/patterns/feature-module.md)):

- [src/module/forecast/](src/module/forecast/) — the product. `features/{dashboard,recommendation,sales-analysis,stores,products,settings}` hold `pages/index.tsx` (thin lazy route leaf: sets `<title>` and renders the view), `views/*-view.tsx` (page body) and page-specific `components/`. `shared/` holds what several pages use: `api/`, `hooks/` (`use-forecast-data`, `use-forecast-query`, `use-recommendation-params`), `utils/`, `data/simulasi.ts`, `types/`, `components/` (filter bar, page header + source chip, KPI grid, trend chart, tables helpers, …).
- [src/module/core/](src/module/core/) — skeleton cross-cutting features (auth JWT, users, roles, branches, companies, audit-log, translation-override, settings drawer, error pages). **Auth is switched off** (`CONFIG.auth.skip = true` in [src/shared/config/index.ts](src/shared/config/index.ts)): no session check, no `/core/v1/*` requests, core routes/menus/account drawer/company picker not mounted. Kept so login can be enabled later once ai-forecast-be has auth.

Everything else lives in [src/shared/](src/shared/) (`api`, `config`, `lib`, `ui`, `utils`, …), [src/layouts/](src/layouts/), [src/routes/](src/routes/), [src/theme/](src/theme/).

### Data fetching

No TanStack Query/SWR. API calls go through the single shared axios instance [src/shared/lib/axios.ts](src/shared/lib/axios.ts) (baseURL `CONFIG.serverUrl`, adds `X-Company-Slug` when configured, normalizes errors to `ApiError` with `.status` and field `.errors`, passes cancellations through). Envelope helpers (`unwrap`, `unwrapNullable`, `ApiError`, `apiErrorStatus`, `apiFieldErrors`) are in [src/shared/api/](src/shared/api/). Forecast data goes through `useForecastQuery` ([use-forecast-query.ts](src/module/forecast/shared/hooks/use-forecast-query.ts)): per-key cache + dedupe, aborts stale requests, keeps previous data while a key changes, `invalidateForecast()` / `setForecastData()` for refetch after saving settings.

### Routing

[src/main.tsx](src/main.tsx) builds a `createBrowserRouter` from [src/routes/sections/](src/routes/sections/); pages are `lazy()` and wrapped in a `Suspense` keyed by pathname. All route strings are in [src/routes/paths.ts](src/routes/paths.ts) (`paths.dashboard.*` for forecast pages, `paths.core.*` for skeleton core pages) — never hardcode URLs. Use the wrappers in [src/routes/hooks/](src/routes/hooks/) and `RouterLink`. Nav items: [src/layouts/nav-config-dashboard.tsx](src/layouts/nav-config-dashboard.tsx).

### UI conventions (skeleton style)

- Page shell: `<Box sx={{ p: { xs: 2, md: 3 } }}>` → `ForecastPageHeader` (skeleton `PageHeader` + source chip) → `ForecastSimulationAlert` → `ForecastFilterBar` → `ForecastDataState` → content.
- KPI: `KpiCard`, charts: `ChartCard` + `@mui/x-charts` (both in [src/shared/ui/dashboard-card/](src/shared/ui/dashboard-card/)). Series colours follow the entity (Kiriman / Estimasi terjual / Retur) via `SERIES` + `useSeriesColors()`.
- Tables: skeleton toolkit [src/shared/ui/table/](src/shared/ui/table/) (`useTable({ defaultDense: true })`, `TableHeadCustom`), plus `sortRows`, `ForecastTablePagination`, `TableEmptyRow` from forecast shared components (client-side sort/paging — the backend returns whole lists).
- Dates: `DateRangePicker` ([src/shared/ui/date-range-picker/](src/shared/ui/date-range-picker/)) with `presets`/`minDate`/`maxDate` bound to the data period — its built-in presets count back from today and would select dates with no data.
- Forms: react-hook-form + Zod with `Form` / `Field.*` from [src/shared/ui/hook-form/](src/shared/ui/hook-form/).
- Icons: `Iconify` with an offline icon set — add new icons to [src/shared/ui/iconify/icon-sets.ts](src/shared/ui/iconify/icon-sets.ts).

### Deliberate deviations from the skeleton

- **No i18n in forecast code.** The skeleton requires `t()` for every string; AI Forecast is Indonesian-only, so forecast UI text and nav labels are written directly in Indonesian. i18next stays installed (core modules use it) with the language locked to `id`; the language switcher is hidden.
- **Auth off** (see above).
- **`manualChunks`** in [vite.config.ts](vite.config.ts) only splits leaf libraries (mui-x, firebase, lightweight-charts). The skeleton's broader split produced circular chunks that crashed the production build at load time.
- **Mock data in features** — the skeleton forbids it, but `simulasi` mode is a product requirement.

The skeleton's own pattern docs remain useful for new features: [docs/CONVENTIONS.md](docs/CONVENTIONS.md), [docs/patterns/](docs/patterns/).

## Conventions

- **Path alias:** import internal modules as `src/...` (Vite alias + TS `baseUrl`). ESLint `perfectionist/sort-imports` is error-level with custom groups — run `yarn lint:fix` rather than hand-sorting.
- `import type` for type-only imports; files kebab-case; barrel `index.ts` per directory.
- Prettier: single quotes, semicolons, `printWidth: 100`, `trailingComma: es5`.
- Env: only read in [src/shared/config/index.ts](src/shared/config/index.ts); the zod schema in `env-schema.ts` also runs in `vite.config.ts`, so a bad env fails the build; copy `.env.example` to `.env`. The dashboard is internal: `index.html` sets `robots: noindex` and `public/robots.txt` disallows everything.
