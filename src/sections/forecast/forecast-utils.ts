import 'dayjs/locale/id';

import type {
  VisitCell,
  KecSummary,
  Confidence,
  AdjustUnit,
  CellSummary,
  Granularity,
  SeriesPoint,
  ProductCode,
  MasterStore,
  StoreSummary,
  MasterProduct,
  ProductSummary,
  Recommendation,
  ForecastFilters,
  ProductQuantities,
  RecommendationParams,
  RecommendationSignal,
} from 'src/types/forecast';

import dayjs from 'dayjs';

import {
  _forecastBs,
  _forecastStock,
  _forecastSales,
  FORECAST_PERIOD,
  _forecastStores,
  _forecastKiriman,
  _forecastProducts,
  EXCLUDED_PRODUCTS,
} from 'src/_mock/_forecast';

import { PRODUCT_CODES } from 'src/types/forecast';

export type {
  KecSummary,
  CellSummary,
  Granularity,
  SeriesPoint,
  StoreSummary,
  ProductSummary,
  ForecastFilters,
} from 'src/types/forecast';

// ----------------------------------------------------------------------
// Lapisan olah data dashboard (sementara di client, di atas data simulasi).
// Definisi metrik mengikuti ai-forecast-be/docs/forecast-feasibility.md:
// - Estimasi terjual = rumus B: kirim(t−1) − bs(t) (§3.1) — selalu berlabel
//   "estimasi".
// - Rekomendasi = aturan baseline §4.2 dengan parameter CONTOH yang belum
//   di-backtest. Saat backend siap, fungsi ini pindah ke server.

export const PERIOD = FORECAST_PERIOD;

export const products = _forecastProducts;
export const stores = _forecastStores;
export const salesCodes = _forecastSales;

export const productMap = new Map<ProductCode, MasterProduct>(products.map((p) => [p.code, p]));
export const storeMap = new Map<string, MasterStore>(stores.map((s) => [s.nit, s]));

export const isExcludedProduct = (code: ProductCode) => EXCLUDED_PRODUCTS.includes(code);

export const productGroup = (product: MasterProduct) => `Kelompok ${product.nir[0]}xx`;

/** Default aturan baseline — sama dengan DefaultParams di backend. */
export const DEFAULT_REC_PARAMS: RecommendationParams = {
  window: 4,
  minObservations: 3,
  returnSignalEnabled: true,
  returnThreshold: 0.15,
  returnWindow: 3,
  returnStreak: 1,
  returnCutUnit: 'pcs',
  returnCut: 1,
  stockoutEnabled: true,
  stockoutStreak: 2,
  stockoutBonusUnit: 'pcs',
  stockoutBonus: 1,
  maxStepRatio: 0.3,
  minStep: 2,
};

// ---------------------------------------------------------------------- Tanggal

export const fDate = (tgl: string) => dayjs(tgl).locale('id').format('D MMM YYYY');
export const fDateShort = (tgl: string) => dayjs(tgl).locale('id').format('D MMM');
export const fWeekday = (tgl: string) => dayjs(tgl).locale('id').format('dddd');

/** Label sumbu X: tanggal (harian) atau "Mg <Senin>" (mingguan). */
export const seriesLabel = (key: string, granularity: Granularity) =>
  granularity === 'harian' ? fDateShort(key) : `Mg ${fDateShort(key)}`;

export const addDays = (tgl: string, days: number) =>
  dayjs(tgl).add(days, 'day').format('YYYY-MM-DD');

/** Tambah hari lalu geser ke Senin bila jatuh di hari Minggu (tidak ada kunjungan). */
const addVisitDays = (tgl: string, days: number) => {
  const next = dayjs(tgl).add(days, 'day');
  return (next.day() === 0 ? next.add(1, 'day') : next).format('YYYY-MM-DD');
};

const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
};

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

// ---------------------------------------------------------------------- Sel kunjungan

type DayRow = {
  nik: Set<string>;
  kirim: ProductQuantities;
  bs: ProductQuantities;
  stock: ProductQuantities;
};

function buildCells(): VisitCell[] {
  // Gabung pada (tgl, nit); kunjungan dua sales di hari yang sama dijumlahkan
  // (studi kelayakan §2.2).
  const days = new Map<string, DayRow>();

  const ensure = (tgl: string, nit: string) => {
    const key = `${tgl}|${nit}`;
    let row = days.get(key);
    if (!row) {
      const zero = () => Object.fromEntries(PRODUCT_CODES.map((c) => [c, 0])) as ProductQuantities;
      row = { nik: new Set(), kirim: zero(), bs: zero(), stock: zero() };
      days.set(key, row);
    }
    return row;
  };

  const addRows = (
    rows: { tgl: string; nit: string; nik: string; qty: ProductQuantities }[],
    field: 'kirim' | 'bs' | 'stock'
  ) =>
    rows.forEach((row) => {
      const day = ensure(row.tgl, row.nit);
      day.nik.add(row.nik);
      PRODUCT_CODES.forEach((code) => {
        day[field][code] += row.qty[code];
      });
    });

  addRows(_forecastKiriman, 'kirim');
  addRows(_forecastBs, 'bs');
  addRows(_forecastStock, 'stock');

  // Ambang pencilan per produk: > max(250, 30 × median kiriman positif) — sama
  // dengan backend; hanya menangkap salah input yang jelas (analisis §5.4).
  const outlierLimit = new Map<ProductCode, number>();
  PRODUCT_CODES.forEach((code) => {
    const positives = _forecastKiriman.map((r) => r.qty[code]).filter((v) => v > 0);
    outlierLimit.set(code, Math.max(250, (median(positives) ?? 0) * 30));
  });

  const byStore = new Map<string, { tgl: string; row: DayRow }[]>();
  days.forEach((row, key) => {
    const [tgl, nit] = key.split('|') as [string, string];
    byStore.set(nit, [...(byStore.get(nit) ?? []), { tgl, row }]);
  });

  const cells: VisitCell[] = [];

  byStore.forEach((visits, nit) => {
    visits.sort((a, b) => a.tgl.localeCompare(b.tgl));

    visits.forEach(({ tgl, row }, index) => {
      const prev = index > 0 ? visits[index - 1]! : null;

      PRODUCT_CODES.forEach((product) => {
        const kirim = row.kirim[product];
        const bs = row.bs[product];
        const stock = row.stock[product];
        const prevKirim = prev ? prev.row.kirim[product] : null;

        if (!kirim && !bs && !stock && !prevKirim) return;

        const limit = outlierLimit.get(product)!;
        const prevOutlier = (prevKirim ?? 0) > limit;

        cells.push({
          tgl,
          nit,
          nik: [...row.nik].join(', '),
          product,
          kirim,
          bs,
          stock,
          prevKirim,
          prevTgl: prev?.tgl ?? null,
          estSold: prevKirim === null ? null : prevKirim - bs,
          reliable: prevKirim !== null && prevKirim > 0 && !prevOutlier,
          outlier: kirim > limit,
        });
      });
    });
  });

  return cells.sort((a, b) => a.tgl.localeCompare(b.tgl) || a.nit.localeCompare(b.nit));
}

export const forecastCells = buildCells();

// ---------------------------------------------------------------------- Filter

export const DEFAULT_FILTERS: ForecastFilters = {
  from: PERIOD.start,
  to: PERIOD.end,
  nit: null,
  product: null,
};

export function filterCells(cells: VisitCell[], filters: Partial<ForecastFilters>) {
  return cells.filter(
    (cell) =>
      (!filters.from || cell.tgl >= filters.from) &&
      (!filters.to || cell.tgl <= filters.to) &&
      (!filters.nit || cell.nit === filters.nit) &&
      (!filters.product || cell.product === filters.product)
  );
}

// ---------------------------------------------------------------------- Ringkasan

export function summarize(cells: VisitCell[]): CellSummary {
  const visits = new Set<string>();
  const storeSet = new Set<string>();
  let kirim = 0;
  let bs = 0;
  let stock = 0;
  let estSold = 0;
  let basis = 0;
  let reliableBs = 0;
  let salesValue = 0;

  cells.forEach((cell) => {
    visits.add(`${cell.tgl}|${cell.nit}`);
    storeSet.add(cell.nit);
    if (!cell.outlier) kirim += cell.kirim;
    bs += cell.bs;
    stock += cell.stock;
    if (cell.reliable && cell.estSold !== null) {
      estSold += cell.estSold;
      basis += cell.prevKirim!;
      reliableBs += cell.bs;
      salesValue += cell.estSold * (productMap.get(cell.product)?.hargaJual ?? 0);
    }
  });

  return {
    kirim,
    bs,
    stock,
    estSold,
    basis,
    returnRate: basis ? reliableBs / basis : null,
    sellThrough: basis ? estSold / basis : null,
    salesValue,
    visits: visits.size,
    stores: storeSet.size,
  };
}

/** Ringkasan kosong — placeholder selama data API pertama kali dimuat. */
export const EMPTY_SUMMARY: CellSummary = summarize([]);

// ---------------------------------------------------------------------- Deret waktu

export function timeSeries(
  cells: VisitCell[],
  from: string,
  to: string,
  granularity: Granularity = 'harian'
): SeriesPoint[] {
  const bucketOf = (tgl: string) => {
    if (granularity === 'harian') return tgl;
    const date = dayjs(tgl);
    const offset = (date.day() + 6) % 7; // Senin = awal minggu
    return date.subtract(offset, 'day').format('YYYY-MM-DD');
  };

  const buckets = new Map<string, SeriesPoint>();
  const workdays = new Map<string, number>();

  // Hari kerja tanpa kunjungan tetap tampil sebagai 0 (Minggu dilewati).
  for (let d = dayjs(from); !d.isAfter(dayjs(to)); d = d.add(1, 'day')) {
    if (d.day() === 0) continue;
    const key = bucketOf(d.format('YYYY-MM-DD'));
    workdays.set(key, (workdays.get(key) ?? 0) + 1);
    if (!buckets.has(key)) {
      buckets.set(key, { key, label: seriesLabel(key, granularity), kirim: 0, estSold: 0, bs: 0 });
    }
  }

  // Minggu parsial (< 6 hari kerja) dikecualikan dari agregat mingguan
  // (studi kelayakan §2.2) — kecuali rentangnya memang hanya minggu parsial.
  if (granularity === 'mingguan') {
    const partial = [...workdays].filter(([, days]) => days < 6).map(([key]) => key);
    if (partial.length < buckets.size) partial.forEach((key) => buckets.delete(key));
  }

  cells.forEach((cell) => {
    const point = buckets.get(bucketOf(cell.tgl));
    if (!point) return;
    if (!cell.outlier) point.kirim += cell.kirim;
    point.bs += cell.bs;
    if (cell.reliable && cell.estSold !== null) point.estSold += cell.estSold;
  });

  return [...buckets.values()];
}

// ---------------------------------------------------------------------- Kelompok

export function groupByProduct(cells: VisitCell[]): ProductSummary[] {
  return products.map((product) => ({
    product,
    ...summarize(cells.filter((cell) => cell.product === product.code)),
  }));
}

export function groupByKec(cells: VisitCell[]): KecSummary[] {
  return [1, 2, 3, 4, 5, 6, 7].map((kec) => ({
    kec,
    ...summarize(cells.filter((cell) => storeMap.get(cell.nit)?.kec === kec)),
  }));
}

export function groupByStore(cells: VisitCell[]): StoreSummary[] {
  const byNit = new Map<string, VisitCell[]>();
  cells.forEach((cell) => byNit.set(cell.nit, [...(byNit.get(cell.nit) ?? []), cell]));

  return stores.map((store) => {
    const storeCells = byNit.get(store.nit) ?? [];
    const dates = [...new Set(storeCells.map((c) => c.tgl))].sort();
    const gaps = dates.slice(1).map((d, i) => dayjs(d).diff(dayjs(dates[i]), 'day'));
    const last = storeCells[storeCells.length - 1];

    return {
      store,
      ...summarize(storeCells),
      lastVisit: dates[dates.length - 1] ?? null,
      lastSales: last?.nik ?? null,
      avgInterval: gaps.length ? sum(gaps) / gaps.length : null,
      productCount: new Set(storeCells.filter((c) => c.kirim > 0).map((c) => c.product)).size,
    };
  });
}

// ---------------------------------------------------------------------- Rekomendasi

/** `returnStreak` observasi terakhir masing-masing di atas ambang (≤ 1 = cukup rasio agregat). */
const returnStreakOk = (retObs: VisitCell[], params: RecommendationParams) =>
  params.returnStreak <= 1 ||
  (retObs.length >= params.returnStreak &&
    retObs.slice(-params.returnStreak).every((c) => c.bs / c.prevKirim! > params.returnThreshold));

/**
 * Besar perubahan: pcs apa adanya, atau persen dari dasar dibulatkan ke ATAS
 * (minimal 1 pcs). Epsilon menahan galat float, mis. 100 × 0.07 = 7.000…01.
 */
const adjustAmount = (base: number, unit: AdjustUnit, value: number) =>
  unit === 'persen' ? Math.max(1, Math.ceil(base * value - 1e-9)) : value;

/** `stockoutStreak` observasi terakhir semuanya habis (BS = 0 dan STOCK = 0). */
const stockoutStreakOk = (allObs: VisitCell[], params: RecommendationParams) =>
  allObs.length >= params.stockoutStreak &&
  allObs.slice(-params.stockoutStreak).every((c) => c.bs === 0 && c.stock === 0);

/**
 * Aturan baseline (studi kelayakan §4.2) untuk kunjungan berikutnya, memakai
 * data s.d. `asOf` saja (walk-forward). Parameter dari halaman Pengaturan;
 * harus identik dengan recommend.go di backend.
 */
export function computeRecommendations(
  cells: VisitCell[],
  asOf: string,
  params: RecommendationParams = DEFAULT_REC_PARAMS
): Recommendation[] {
  const scoped = cells.filter((cell) => cell.tgl <= asOf);

  const visitsByStore = new Map<string, string[]>();
  const pairs = new Map<string, VisitCell[]>();

  scoped.forEach((cell) => {
    const dates = visitsByStore.get(cell.nit) ?? [];
    if (dates[dates.length - 1] !== cell.tgl) dates.push(cell.tgl);
    visitsByStore.set(cell.nit, dates);

    const key = `${cell.nit}|${cell.product}`;
    pairs.set(key, [...(pairs.get(key) ?? []), cell]);
  });

  const reliableObs = (pairCells: VisitCell[]) =>
    pairCells.filter((c) => c.reliable && c.estSold !== null);
  const observationsOf = (pairCells: VisitCell[]) => reliableObs(pairCells).slice(-params.window);

  // Fallback hierarki: median produk per kec → median produk global.
  const kecValues = new Map<string, number[]>();
  const globalValues = new Map<ProductCode, number[]>();

  pairs.forEach((pairCells) => {
    const obs = observationsOf(pairCells);
    if (obs.length < params.minObservations) return;
    const value = median(obs.map((c) => c.estSold!))!;
    const { nit, product } = pairCells[0]!;
    const kecKey = `${storeMap.get(nit)?.kec}|${product}`;
    kecValues.set(kecKey, [...(kecValues.get(kecKey) ?? []), value]);
    globalValues.set(product, [...(globalValues.get(product) ?? []), value]);
  });

  const results: Recommendation[] = [];

  pairs.forEach((pairCells) => {
    const { nit, product } = pairCells[0]!;
    const storeVisits = visitsByStore.get(nit) ?? [];
    const recentVisits = storeVisits.slice(-3);
    const delivered = pairCells.filter((c) => c.kirim > 0);
    const lastDelivered = delivered[delivered.length - 1];

    // Hanya produk yang masih dibawa dalam 3 kunjungan terakhir toko.
    if (!lastDelivered || !recentVisits.includes(lastDelivered.tgl)) return;

    const lastStoreVisit = storeVisits[storeVisits.length - 1]!;
    const lastCell = pairCells[pairCells.length - 1]!;
    const gaps = storeVisits.slice(1).map((d, i) => dayjs(d).diff(dayjs(storeVisits[i]), 'day'));
    const interval = Math.round(median(gaps.slice(-4)) ?? 7);
    const kec = storeMap.get(nit)?.kec;

    const allObs = reliableObs(pairCells);
    const obs = allObs.slice(-params.window);
    const retObs = allObs.slice(-params.returnWindow);
    const obsBasis = sum(retObs.map((c) => c.prevKirim!));
    const returnRate = obsBasis ? sum(retObs.map((c) => c.bs)) / obsBasis : null;
    const refKirim = [...delivered].reverse().find((c) => !c.outlier)?.kirim ?? lastDelivered.kirim;

    const signals: RecommendationSignal[] = [];
    if (lastDelivered.outlier) signals.push('pencilan');

    const common = {
      nit,
      product,
      lastTgl: lastDelivered.tgl,
      lastKirim: lastDelivered.kirim,
      lastBs: lastCell.tgl === lastStoreVisit ? lastCell.bs : 0,
      returnRate,
      observations: obs.length,
      nextVisit: addVisitDays(lastStoreVisit, interval),
    };

    if (isExcludedProduct(product)) {
      results.push({
        ...common,
        estSold: obs.length ? median(obs.map((c) => c.estSold!)) : null,
        recommended: null,
        delta: null,
        confidence: 'rendah',
        basis: 'Dikecualikan — volume sangat kecil',
        signals,
        excluded: true,
      });
      return;
    }

    let base: number;
    let basis: string;
    let confidence: Confidence;
    const ownMedian = median(obs.map((c) => c.estSold!));

    if (obs.length >= params.minObservations && ownMedian !== null) {
      base = ownMedian;
      basis = `Median ${obs.length} kunjungan terakhir`;
      confidence = obs.length >= params.window ? 'tinggi' : 'sedang';
    } else {
      const kecMedian = median(kecValues.get(`${kec}|${product}`) ?? []);
      const globalMedian = median(globalValues.get(product) ?? []);
      signals.push('fallback');
      confidence = 'rendah';
      if (kecMedian !== null) {
        base = kecMedian;
        basis = `Median produk di Kec. ${kec}`;
      } else if (globalMedian !== null) {
        base = globalMedian;
        basis = 'Median produk semua wilayah';
      } else {
        base = refKirim;
        basis = 'Kiriman terakhir (tanpa riwayat)';
      }
    }

    let adjustment = 0;
    if (params.stockoutEnabled && stockoutStreakOk(allObs, params)) {
      adjustment += adjustAmount(base, params.stockoutBonusUnit, params.stockoutBonus);
      signals.push('habis');
    }
    if (
      params.returnSignalEnabled &&
      returnRate !== null &&
      returnRate > params.returnThreshold &&
      returnStreakOk(retObs, params)
    ) {
      adjustment -= adjustAmount(base, params.returnCutUnit, params.returnCut);
      signals.push('retur-tinggi');
    }

    const raw = Math.round(base) + adjustment;
    const step = Math.max(params.minStep, Math.ceil(refKirim * params.maxStepRatio));
    let recommended = Math.min(refKirim + step, Math.max(refKirim - step, raw));
    if (recommended !== raw) signals.push('dibatasi');
    recommended = Math.max(base > 0 ? 1 : 0, recommended);

    results.push({
      ...common,
      estSold: ownMedian,
      recommended,
      delta: recommended - lastDelivered.kirim,
      confidence,
      basis,
      signals,
      excluded: false,
    });
  });

  return results.sort((a, b) => a.nit.localeCompare(b.nit) || a.product.localeCompare(b.product));
}

export type RecommendationSummary = {
  total: number;
  increase: number;
  decrease: number;
  same: number;
  excluded: number;
  totalRecommended: number;
  totalLast: number;
  confidence: Record<Confidence, number>;
  stores: number;
};

export function summarizeRecommendations(recs: Recommendation[]): RecommendationSummary {
  const active = recs.filter((r) => !r.excluded && !r.signals.includes('pencilan'));

  return {
    total: recs.length,
    increase: active.filter((r) => (r.delta ?? 0) > 0).length,
    decrease: active.filter((r) => (r.delta ?? 0) < 0).length,
    same: active.filter((r) => r.delta === 0).length,
    excluded: recs.length - recs.filter((r) => !r.excluded).length,
    totalRecommended: sum(active.map((r) => r.recommended ?? 0)),
    totalLast: sum(active.map((r) => r.lastKirim)),
    confidence: {
      tinggi: active.filter((r) => r.confidence === 'tinggi').length,
      sedang: active.filter((r) => r.confidence === 'sedang').length,
      rendah: active.filter((r) => r.confidence === 'rendah').length,
    },
    stores: new Set(recs.map((r) => r.nit)).size,
  };
}

// ---------------------------------------------------------------------- Label

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  tinggi: 'Tinggi',
  sedang: 'Sedang',
  rendah: 'Rendah',
};

export const SIGNAL_LABEL: Record<RecommendationSignal, string> = {
  habis: 'Stok habis (+)',
  'retur-tinggi': 'Retur tinggi (−1)',
  dibatasi: 'Perubahan dibatasi',
  fallback: 'Riwayat pendek',
  pencilan: 'Kiriman terakhir pencilan',
};

/** "1 pcs" / "10%" */
export const fAdjust = (unit: AdjustUnit, value: number) =>
  unit === 'persen' ? `${Math.round(value * 100)}%` : `${value} pcs`;

/** Label sinyal dengan besaran dari params aktif. */
export function signalLabel(signal: RecommendationSignal, params: RecommendationParams) {
  if (signal === 'habis')
    return `Stok habis (+${fAdjust(params.stockoutBonusUnit, params.stockoutBonus)})`;
  if (signal === 'retur-tinggi')
    return `Retur tinggi (−${fAdjust(params.returnCutUnit, params.returnCut)})`;
  return SIGNAL_LABEL[signal];
}
