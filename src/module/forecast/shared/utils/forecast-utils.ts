import 'dayjs/locale/id';

import type {
  SpkCalc,
  VisitRow,
  SpkDetail,
  VisitCell,
  CellReason,
  CellStatus,
  KecSummary,
  Confidence,
  AdjustUnit,
  CellSummary,
  Granularity,
  SeriesPoint,
  ProductCode,
  MasterStore,
  PairAnalysis,
  StoreSummary,
  SpkSuggestion,
  MasterProduct,
  ProductSummary,
  Recommendation,
  ForecastFilters,
  ForecastSettings,
  ProductQuantities,
  RecommendationParams,
  RecommendationSignal,
} from 'src/module/forecast/shared/types';

import dayjs from 'dayjs';

import { PRODUCT_CODES } from 'src/module/forecast/shared/types';
import {
  _forecastBs,
  _forecastStock,
  _forecastSales,
  FORECAST_PERIOD,
  _forecastStores,
  _forecastKiriman,
  _forecastProducts,
  EXCLUDED_PRODUCTS,
} from 'src/module/forecast/shared/data/simulasi';

export type {
  KecSummary,
  CellSummary,
  Granularity,
  SeriesPoint,
  StoreSummary,
  ProductSummary,
  ForecastFilters,
} from 'src/module/forecast/shared/types';

// ----------------------------------------------------------------------
// Lapisan olah data dashboard (sementara di client, di atas data simulasi).
// Definisi metrik mengikuti ai-forecast-be/docs/forecast-feasibility.md:
// - Estimasi terjual = rumus stok: sisa(t−1) + kirim(t−1) − sisa(t) − bs(t)
//   (docs/superpowers/specs/2026-10-20-analisis-stok-design.md) — selalu berlabel
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
/** Waktu ISO (simpan impor/pengaturan) → "20 Okt 2026, 15:41". */
export const fDateTime = (iso: string) => dayjs(iso).locale('id').format('D MMM YYYY, HH:mm');
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
  /** Baris tabel ada untuk (tgl, nit). Nol tercatat ≠ tidak dicatat. */
  has: { kirim: boolean; bs: boolean; stock: boolean };
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
      row = {
        nik: new Set(),
        kirim: zero(),
        bs: zero(),
        stock: zero(),
        has: { kirim: false, bs: false, stock: false },
      };
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
      day.has[field] = true;
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
        const prevStock = prev ? prev.row.stock[product] : null;
        const limit = outlierLimit.get(product)!;

        // Rumus stok + status — sama dengan buildCells di backend (dataset.go).
        let estSold: number | null = null;
        let status: CellStatus = 'belum-cukup';
        let reason: CellReason | '' = '';
        if (!prev) reason = 'kunjungan-pertama';
        else if (!prev.row.has.kirim) reason = 'kiriman-sebelumnya-tidak-tercatat';
        else if (!prev.row.has.stock) reason = 'sisa-sebelumnya-tidak-tercatat';
        else if (!row.has.stock) reason = 'sisa-tidak-tercatat';
        else if (!row.has.bs) reason = 'bs-tidak-tercatat';
        else {
          estSold = prevStock! + prevKirim! - stock - bs;
          if (prevKirim! > limit) {
            status = 'perlu-diperiksa';
            reason = 'kiriman-sebelumnya-pencilan';
          } else if (estSold < 0) {
            status = 'perlu-diperiksa';
            reason = 'hasil-negatif';
          } else status = 'lengkap';
        }

        if (!kirim && !bs && !stock && !(prevKirim ?? 0) && !(prevStock ?? 0)) return;

        cells.push({
          tgl,
          nit,
          nik: [...row.nik].join(', '),
          product,
          kirim,
          bs,
          stock,
          prevKirim,
          prevStock,
          prevTgl: prev?.tgl ?? null,
          days: prev ? dayjs(tgl).diff(dayjs(prev.tgl), 'day') : 0,
          estSold,
          status,
          reason,
          reliable: status === 'lengkap',
          outlier: kirim > limit,
        });
      });
    });
  });

  return cells.sort((a, b) => a.tgl.localeCompare(b.tgl) || a.nit.localeCompare(b.nit));
}

export const forecastCells = buildCells();

/** Stok tersedia setelah kunjungan sebelumnya: sisa(t−1) + kirim(t−1). */
export const available = (cell: VisitCell) => (cell.prevKirim ?? 0) + (cell.prevStock ?? 0);

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
  let cellsComplete = 0;
  let cellsInsufficient = 0;
  let cellsCheck = 0;

  cells.forEach((cell) => {
    visits.add(`${cell.tgl}|${cell.nit}`);
    storeSet.add(cell.nit);
    if (!cell.outlier) kirim += cell.kirim;
    bs += cell.bs;
    stock += cell.stock;
    if (cell.status === 'lengkap') cellsComplete += 1;
    else if (cell.status === 'perlu-diperiksa') cellsCheck += 1;
    else cellsInsufficient += 1;
    if (cell.reliable && cell.estSold !== null) {
      estSold += cell.estSold;
      basis += available(cell);
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
    cellsComplete,
    cellsInsufficient,
    cellsCheck,
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
  // Di-cache per tanggal: parse dayjs per sel jadi titik panas tampilan mingguan.
  const bucketCache = new Map<string, string>();
  const bucketOf = (tgl: string) => {
    if (granularity === 'harian') return tgl;
    let bucket = bucketCache.get(tgl);
    if (bucket === undefined) {
      const date = dayjs(tgl);
      const offset = (date.day() + 6) % 7; // Senin = awal minggu
      bucket = date.subtract(offset, 'day').format('YYYY-MM-DD');
      bucketCache.set(tgl, bucket);
    }
    return bucket;
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
    retObs.slice(-params.returnStreak).every((c) => c.bs / available(c) > params.returnThreshold));

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
    const list = pairs.get(key);
    if (list) list.push(cell);
    else pairs.set(key, [cell]);
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
    const kecList = kecValues.get(kecKey);
    if (kecList) kecList.push(value);
    else kecValues.set(kecKey, [value]);
    const globalList = globalValues.get(product);
    if (globalList) globalList.push(value);
    else globalValues.set(product, [value]);
  });

  // Jadwal kunjungan hanya bergantung pada toko — hitung sekali per toko, bukan per produk.
  const nextVisitByStore = new Map<string, string>();
  visitsByStore.forEach((storeVisits, nit) => {
    const gaps = storeVisits.slice(1).map((d, i) => dayjs(d).diff(dayjs(storeVisits[i]), 'day'));
    const interval = Math.round(median(gaps.slice(-4)) ?? 7);
    nextVisitByStore.set(nit, addVisitDays(storeVisits[storeVisits.length - 1]!, interval));
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
    const kec = storeMap.get(nit)?.kec;

    const allObs = reliableObs(pairCells);
    const obs = allObs.slice(-params.window);
    const retObs = allObs.slice(-params.returnWindow);
    const obsBasis = sum(retObs.map(available));
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
      nextVisit: nextVisitByStore.get(nit)!,
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

// ---------------------------------------------------------------------- Analisis toko × roti
// Sama dengan internal/forecast/analysis.go di backend — ubah keduanya bersamaan.

const mean = (values: number[]) => (values.length ? sum(values) / values.length : null);

const perDay = (cell: VisitCell) => cell.estSold! / Math.max(1, cell.days);

/** 1 desimal, koma desimal, tanpa desimal bila bulat — sama dengan num() backend. */
const fNum = (value: number) => {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',');
};

const soldOut = (cell: VisitCell) => cell.stock === 0 && cell.bs === 0;

/** Awal jendela data historis: `historyDays` hari sampai `asOf` (inklusif). */
export const historyFrom = (asOf: string, s: ForecastSettings) =>
  addDays(asOf, -(s.historyDays - 1));

function analyzePair(
  nit: string,
  product: ProductCode,
  pc: VisitCell[],
  asOf: string,
  s: ForecastSettings
): { analysis: PairAnalysis; used: Set<string> } {
  const used = new Set<string>();
  const last = pc[pc.length - 1];
  const a: PairAnalysis = {
    nit,
    product,
    observations: 0,
    checks: 0,
    insufficient: 0,
    dataFrom: null,
    dataTo: null,
    lastVisit: last?.tgl ?? '',
    lastKirim: last?.kirim ?? 0,
    lastStock: last?.stock ?? 0,
    lastBs: last?.bs ?? 0,
    avgKirim: 0,
    soldPerDay: null,
    soldPerVisit: null,
    avgStock: null,
    bsRate: null,
    trend: 'belum-bisa-dinilai',
    risk: 'belum-cukup',
    riskReason: '',
  };
  if (!last) return { analysis: a, used };

  const from = historyFrom(asOf, s);
  const window = pc.filter((c) => c.tgl >= from && c.tgl <= asOf);
  let obs = window.filter((c) => c.status === 'lengkap');
  a.checks = window.filter((c) => c.status === 'perlu-diperiksa').length;
  a.insufficient = window.filter((c) => c.status === 'belum-cukup').length;
  if (obs.length > s.historyVisits) obs = obs.slice(-s.historyVisits);
  if (window.length) a.avgKirim = sum(window.map((c) => c.kirim)) / window.length;

  a.observations = obs.length;
  if (obs.length) {
    a.dataFrom = obs[0]!.tgl;
    a.dataTo = obs[obs.length - 1]!.tgl;
  }
  obs.forEach((c) => used.add(c.tgl));
  if (obs.length < s.minObservations || !obs.length) {
    a.riskReason = `Baru ${obs.length} kunjungan berdata lengkap; minimal ${s.minObservations}.`;
    return { analysis: a, used };
  }

  const rates = obs.map(perDay);
  // Rata-rata = total terjual ÷ total hari (tahan terhadap jarak kunjungan pendek);
  // median = nilai tengah terjual/hari per kunjungan.
  const totalDays = sum(obs.map((c) => Math.max(1, c.days)));
  const rate = s.method === 'median' ? median(rates)! : sum(obs.map((c) => c.estSold!)) / totalDays;
  const avail = sum(obs.map(available));
  const avgStock = sum(obs.map((c) => c.stock)) / obs.length;
  a.soldPerDay = rate;
  a.soldPerVisit = sum(obs.map((c) => c.estSold!)) / obs.length;
  a.avgStock = avgStock;
  if (avail > 0) a.bsRate = sum(obs.map((c) => c.bs)) / avail;

  const n = rates.length;
  if (n >= 4) {
    const older = mean(rates.slice(0, Math.floor(n / 2)))!;
    const recent = mean(rates.slice(n - Math.floor(n / 2)))!;
    if (older === 0) a.trend = recent > 0 ? 'naik' : 'stabil';
    else if (recent > older * 1.2) a.trend = 'naik';
    else if (recent < older * 0.8) a.trend = 'turun';
    else a.trend = 'stabil';
  }

  const need = rate * s.visitIntervalDays;
  if (a.bsRate !== null && a.bsRate * 100 > s.bsRiskPct) {
    a.risk = 'kelebihan';
    a.riskReason = `BS ${fNum(a.bsRate * 100)}% dari stok tersedia, di atas batas ${s.bsRiskPct}%.`;
  } else if (avgStock > need && avgStock >= 1) {
    a.risk = 'kelebihan';
    a.riskReason = `Sisa stok rata-rata ${fNum(avgStock)} pcs, lebih dari perkiraan penjualan ${s.visitIntervalDays} hari (${fNum(need)} pcs).`;
  } else if (obs.length >= 2 && soldOut(obs[obs.length - 1]!) && soldOut(obs[obs.length - 2]!)) {
    a.risk = 'kekurangan';
    a.riskReason =
      'Stok habis (sisa 0 dan BS 0) di 2 kunjungan terakhir — permintaan mungkin lebih besar dari kiriman.';
  } else {
    a.risk = 'wajar';
  }
  return { analysis: a, used };
}

/** Analisis tiap pasangan toko × roti di `cells` (sudah difilter rentang); asOf = akhir rentang. */
export function analyzePairs(
  cells: VisitCell[],
  asOf: string,
  s: ForecastSettings
): PairAnalysis[] {
  const pairs = new Map<string, VisitCell[]>();
  cells.forEach((cell) => {
    const key = `${cell.nit}|${cell.product}`;
    pairs.set(key, [...(pairs.get(key) ?? []), cell]);
  });
  return [...pairs.entries()]
    .map(([key, pc]) => {
      const [nit, product] = key.split('|') as [string, ProductCode];
      return analyzePair(nit, product, pc, asOf, s).analysis;
    })
    .sort((x, y) => x.nit.localeCompare(y.nit) || x.product.localeCompare(y.product));
}

/** Analisis + riwayat kunjungan satu pasangan. */
export function analyzePairDetail(
  cells: VisitCell[],
  nit: string,
  product: ProductCode,
  asOf: string,
  s: ForecastSettings
): { analysis: PairAnalysis; history: VisitRow[] } {
  const pc = cells.filter((c) => c.nit === nit && c.product === product);
  const { analysis, used } = analyzePair(nit, product, pc, asOf, s);
  return {
    analysis,
    history: pc.map((c) => ({
      tgl: c.tgl,
      prevTgl: c.prevTgl,
      days: c.days,
      stockStart: c.prevStock,
      prevKirim: c.prevKirim,
      kirim: c.kirim,
      stock: c.stock,
      bs: c.bs,
      estSold: c.estSold,
      perDay: c.estSold === null ? null : perDay(c),
      status: c.status,
      reason: c.reason,
      used: used.has(c.tgl),
      nik: c.nik,
    })),
  };
}

export const CELL_REASON_LABEL: Record<CellReason, string> = {
  'kunjungan-pertama': 'Kunjungan pertama — belum ada stok awal',
  'kiriman-sebelumnya-tidak-tercatat': 'Kiriman kunjungan sebelumnya tidak tercatat',
  'sisa-sebelumnya-tidak-tercatat': 'Sisa stok kunjungan sebelumnya tidak tercatat',
  'sisa-tidak-tercatat': 'Sisa stok kunjungan ini tidak tercatat',
  'bs-tidak-tercatat': 'BS kunjungan ini tidak tercatat',
  'hasil-negatif': 'Hasil negatif — sisa + BS melebihi stok tersedia',
  'kiriman-sebelumnya-pencilan': 'Kiriman sebelumnya tidak wajar (kemungkinan salah input)',
};

// ---------------------------------------------------------------------- Saran SPK
// Sama dengan internal/forecast/spk.go di backend — ubah keduanya bersamaan.
// Spec: docs/superpowers/specs/2026-10-20-spk-draft-final-design.md.

/** Urutan kolom roti di file Spk_*.csv aplikasi klien. */
export const SPK_FILE_ORDER: ProductCode[] = [
  'mps',
  'mpc',
  'mpkt',
  'mpkh',
  'jasuke',
  'nc',
  'np',
  'ncp',
  'nck',
  'ncs',
  'cocang',
  'ncb',
  'sukemi',
  'sc',
  'ss',
  'sk',
  'sb',
  'sisir3',
  'sisir2',
  'tm',
  'tf',
];

/** Singkatan header di file Spk_*.csv. */
export const SPK_FILE_ALIAS: Partial<Record<ProductCode, string>> = {
  jasuke: 'jske',
  cocang: 'cang',
  sukemi: 'skmi',
  sisir3: 'ssr3',
  sisir2: 'ssr2',
};

/** Tanggal data acuan SPK = min(akhir data, tgl − 1). */
export const spkAsOf = (tgl: string, dataEnd: string) => {
  const prev = addDays(tgl, -1);
  return prev < dataEnd ? prev : dataEnd;
};

/** Bulatkan ke kelipatan `unit` dengan arah `mode` (sama dengan exampleCalculation). */
export function roundQty(value: number, unit: number, mode: ForecastSettings['roundMode']) {
  const u = Math.max(1, unit);
  const r =
    mode === 'atas'
      ? Math.ceil(value / u - 1e-9) * u
      : mode === 'bawah'
        ? Math.floor(value / u + 1e-9) * u
        : Math.floor(value / u + 0.5) * u;
  return Math.max(0, r);
}

function suggestPair(a: PairAnalysis, tgl: string, s: ForecastSettings): SpkSuggestion {
  const calc: SpkCalc = {
    status: 'belum-cukup',
    observations: a.observations,
    lastVisit: a.lastVisit,
    lastKirim: a.lastKirim,
    lastStock: a.lastStock,
    daysSince: Math.max(0, a.lastVisit ? dayjs(tgl).diff(dayjs(a.lastVisit), 'day') : 0),
    soldPerDay: a.soldPerDay,
    need: null,
    remaining: null,
    usable: null,
    raw: null,
    step: Math.max(2, Math.ceil((a.lastKirim * s.maxChangePct) / 100)),
    bsCapped: false,
    bsRate: a.bsRate,
    limited: null,
    capped: false,
    risk: a.risk,
  };
  if (a.soldPerDay === null) return { nit: a.nit, product: a.product, suggested: null, calc };

  const r = a.soldPerDay;
  const need = r * s.visitIntervalDays;
  const remaining = Math.max(0, a.lastStock + a.lastKirim - r * calc.daysSince);
  const usable = (remaining * s.stockUsablePct) / 100;
  const raw = Math.max(0, need - usable);
  let hi = a.lastKirim + calc.step;
  if (a.bsRate !== null && a.bsRate * 100 > s.bsRiskPct) {
    calc.bsCapped = true;
    hi = a.lastKirim;
  }
  const lo = Math.max(0, a.lastKirim - calc.step);
  const limited = Math.min(hi, Math.max(lo, raw));

  Object.assign(calc, { status: 'otomatis', need, remaining, usable, raw, limited });
  calc.capped = limited !== raw;
  return {
    nit: a.nit,
    product: a.product,
    suggested: roundQty(limited, s.roundTo, s.roundMode),
    calc,
  };
}

/**
 * Saran SPK untuk toko `nits` (urutan dipertahankan) pada tanggal `tgl` dengan
 * sel s.d. `asOf`. Roti per toko = yang pernah dikirim (> 0) dalam jendela
 * `historyDays`, urut SPK_FILE_ORDER.
 */
export function suggestSpk(
  cells: VisitCell[],
  nits: string[],
  tgl: string,
  asOf: string,
  s: ForecastSettings
): SpkSuggestion[] {
  const wanted = new Set(nits);
  const pairs = new Map<string, VisitCell[]>();
  cells.forEach((cell) => {
    if (cell.tgl > asOf || !wanted.has(cell.nit)) return;
    const key = `${cell.nit}|${cell.product}`;
    pairs.set(key, [...(pairs.get(key) ?? []), cell]);
  });
  const from = historyFrom(asOf, s);
  return nits.flatMap((nit) =>
    SPK_FILE_ORDER.flatMap((product) => {
      const pc = pairs.get(`${nit}|${product}`) ?? [];
      if (!pc.some((c) => c.tgl >= from && c.kirim > 0)) return [];
      return [suggestPair(analyzePair(nit, product, pc, asOf, s).analysis, tgl, s)];
    })
  );
}

/** Nama file SPK: Spk_<kurir>_<dd-mm-yyyy>.csv (sama dengan SPKFileName backend). */
export function spkFileName(kurir: string, tgl: string) {
  const k = kurir.replace(/[^A-Za-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'kurir';
  return `Spk_${k}_${dayjs(tgl).format('DD-MM-YYYY')}.csv`;
}

/** Isi CSV format file Spk klien (dipakai mode simulasi; mode api memakai /export). */
export function spkCsv(
  spk: SpkDetail,
  storeName: (nit: string) => string,
  price: (code: ProductCode) => number | undefined
) {
  const header = SPK_FILE_ORDER.map((code) => SPK_FILE_ALIAS[code] ?? code);
  const pad = ['', '', '', '', ''];
  const qty = new Map(spk.lines.map((l) => [`${l.nit}|${l.product}`, l.qty ?? 0]));
  const tgl = dayjs(spk.tgl).format('DD/MM/YYYY');
  const cellText = (v: string) => (/[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = [
    [...pad, ...header],
    [...pad, ...SPK_FILE_ORDER.map((code) => String(price(code) ?? ''))],
    [...pad, ...header.map(() => '')],
    ['urut', 'nit', 'nama', 'kurir', 'tanggal', ...header],
    ...spk.stores.map((nit, i) => [
      String(i + 1),
      nit,
      storeName(nit),
      spk.kurir,
      tgl,
      ...SPK_FILE_ORDER.map((code) => String(qty.get(`${nit}|${code}`) ?? 0)),
    ]),
  ];
  return rows.map((row) => row.map(cellText).join(';')).join('\r\n') + '\r\n';
}
