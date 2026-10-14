import type {
  KirimanRow,
  ProductCode,
  MasterStore,
  MasterProduct,
  TransactionRow,
  ProductQuantities,
} from 'src/types/forecast';

import { PRODUCT_CODES } from 'src/types/forecast';

// ----------------------------------------------------------------------
// DATA SIMULASI AI Forecast — BUKAN data dari database klien dan BUKAN hasil
// prediksi. Strukturnya meniru tabel XDistribution (MRoti, MToko, KIRIMAN,
// BS, STOCK) dan polanya dikalibrasi kasar ke statistik deskriptif di
// ai-forecast-be/docs/forecast-feasibility.md (periode inti 19 Agt–30 Sep
// 2026, kunjungan ±mingguan Senin–Sabtu, 62% kiriman sama dengan sebelumnya,
// retur kecil). Nama toko fiktif; kode sales memakai samaran S-A … S-J.
// Generator deterministik (seed tetap) agar SSR dan client menghasilkan data
// yang sama. Ganti dengan src/lib/api saat backend tersedia.

export const FORECAST_PERIOD = { start: '2026-08-19', end: '2026-09-30' } as const;

/** MRoti — kode, nama master, dan harga sesuai database sumber. */
export const _forecastProducts: MasterProduct[] = [
  { nir: '001', code: 'mps', nama: 'mps', hargaBeli: 670, hargaJual: 840 },
  { nir: '002', code: 'mpc', nama: 'mpc', hargaBeli: 670, hargaJual: 840 },
  { nir: '003', code: 'mpkt', nama: 'mpkt', hargaBeli: 670, hargaJual: 840 },
  { nir: '004', code: 'mpkh', nama: 'mpkh', hargaBeli: 670, hargaJual: 840 },
  { nir: '005', code: 'jasuke', nama: 'jasuke', hargaBeli: 670, hargaJual: 840 },
  { nir: '101', code: 'nc', nama: 'nc', hargaBeli: 1300, hargaJual: 1700 },
  { nir: '102', code: 'np', nama: 'np', hargaBeli: 1300, hargaJual: 1700 },
  { nir: '103', code: 'ncp', nama: 'ncp', hargaBeli: 1300, hargaJual: 1700 },
  { nir: '104', code: 'ncs', nama: 'ncs', hargaBeli: 1300, hargaJual: 1700 },
  { nir: '105', code: 'ncb', nama: 'ncb', hargaBeli: 1300, hargaJual: 1700 },
  { nir: '106', code: 'nck', nama: 'nck', hargaBeli: 1300, hargaJual: 1700 },
  { nir: '107', code: 'cocang', nama: 'cocang', hargaBeli: 1300, hargaJual: 1700 },
  { nir: '108', code: 'sukemi', nama: 'sukemi', hargaBeli: 1300, hargaJual: 1700 },
  { nir: '201', code: 'sc', nama: 'sc', hargaBeli: 1300, hargaJual: 1700 },
  { nir: '202', code: 'ss', nama: 'ss', hargaBeli: 1300, hargaJual: 1700 },
  { nir: '203', code: 'sb', nama: 'sb', hargaBeli: 1300, hargaJual: 1700 },
  { nir: '204', code: 'sk', nama: 'sk', hargaBeli: 1300, hargaJual: 1700 },
  { nir: '401', code: 'sisir3', nama: 'sisir3000', hargaBeli: 2000, hargaJual: 2550 },
  { nir: '402', code: 'sisir2', nama: 'sisir2000', hargaBeli: 1300, hargaJual: 1700 },
  { nir: '601', code: 'tm', nama: 'tm', hargaBeli: 5900, hargaJual: 8000 },
  { nir: '602', code: 'tf', nama: 'tf', hargaBeli: 5900, hargaJual: 8000 },
];

/**
 * Produk yang dikeluarkan dari rekomendasi otomatis (studi kelayakan §1.2 &
 * §2.2: volume sangat kecil, hanya di 0–13 toko).
 */
export const EXCLUDED_PRODUCTS: ProductCode[] = ['mpkt', 'np', 'tf', 'jasuke', 'sisir2'];

/** Kode sales tersamar yang aktif di periode inti (analisis §4.2). */
export const _forecastSales = ['S-A', 'S-B', 'S-H', 'S-J'];

// ----------------------------------------------------------------------
// Parameter simulasi per produk: peluang toko menjual produk, jumlah tipikal
// per kunjungan, dan pengali permintaan (< 1,15 → retur lebih sering).

type ProductSim = { reach: number; qty: number; demand: number };

const PRODUCT_SIM: Record<ProductCode, ProductSim> = {
  mps: { reach: 0.03, qty: 3, demand: 1.15 },
  mpc: { reach: 0.03, qty: 3, demand: 1.3 },
  mpkt: { reach: 0.01, qty: 5, demand: 1.1 },
  mpkh: { reach: 0.03, qty: 4, demand: 1.1 },
  jasuke: { reach: 0, qty: 0, demand: 1 },
  nc: { reach: 0.62, qty: 3, demand: 1.18 },
  np: { reach: 0.03, qty: 3, demand: 1.05 },
  ncp: { reach: 0.84, qty: 3, demand: 1.16 },
  ncs: { reach: 0.64, qty: 2, demand: 1.12 },
  ncb: { reach: 0.61, qty: 2, demand: 1.14 },
  nck: { reach: 0.71, qty: 2, demand: 1.13 },
  cocang: { reach: 0.34, qty: 2, demand: 1.14 },
  sukemi: { reach: 0.5, qty: 1, demand: 1.25 },
  sc: { reach: 0.79, qty: 3, demand: 1.06 },
  ss: { reach: 0.58, qty: 2, demand: 1.1 },
  sb: { reach: 0.49, qty: 2, demand: 1.0 },
  sk: { reach: 0.67, qty: 2, demand: 1.04 },
  sisir3: { reach: 0.61, qty: 5, demand: 1.2 },
  sisir2: { reach: 0, qty: 0, demand: 1 },
  tm: { reach: 0.09, qty: 2, demand: 1.05 },
  tf: { reach: 0.04, qty: 1, demand: 1.05 },
};

const STORE_COUNT = 72;

const STORE_PREFIX = ['Toko', 'Warung', 'Kios', 'Toko', 'Minimarket', 'Toko Kelontong'];

const STORE_NAMES = [
  'Berkah',
  'Makmur',
  'Sumber Rejeki',
  'Barokah',
  'Sentosa',
  'Lancar Jaya',
  'Rukun',
  'Mandiri',
  'Sejahtera',
  'Abadi',
  'Amanah',
  'Murah Meriah',
  'Tiga Saudara',
  'Sinar Pagi',
  'Harapan',
  'Mekar Sari',
  'Cahaya',
  'Sido Mulyo',
  'Maju Jaya',
  'Bintang',
  'Segar',
  'Pojok',
  'Sumber Makmur',
  'Langgeng',
];

// ---------------------------------------------------------------------- PRNG

/** Park–Miller minimal standard (tanpa operator bitwise). */
function createRandom(seed: number) {
  let state = seed % 2147483647 || 1;

  return () => {
    state = (state * 48271) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

const random = createRandom(20260819);

const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)]!;

function poisson(lambda: number) {
  const limit = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= random();
  } while (p > limit);
  return k - 1;
}

// ---------------------------------------------------------------------- Tanggal

const DAY_MS = 86_400_000;
const START_MS = Date.UTC(2026, 7, 19);
const PERIOD_DAYS = 43; // indeks 0–42 = 19 Agt … 30 Sep 2026

const dateAt = (dayIndex: number) =>
  new Date(START_MS + dayIndex * DAY_MS).toISOString().slice(0, 10);

const isSunday = (dayIndex: number) => new Date(START_MS + dayIndex * DAY_MS).getUTCDay() === 0;

const emptyQty = (): ProductQuantities =>
  Object.fromEntries(PRODUCT_CODES.map((code) => [code, 0])) as ProductQuantities;

// ---------------------------------------------------------------------- Toko

function generateStores(): MasterStore[] {
  const seqByKec = [0, 0, 0, 0, 0, 0, 0];

  return Array.from({ length: STORE_COUNT }, (_, index) => {
    const kec = (index % 7) + 1;
    seqByKec[kec - 1]! += 1 + Math.floor(random() * 6);
    const nit = `${kec}${String(seqByKec[kec - 1]).padStart(3, '0')}`;

    return { nit, kec, nama: `${pick(STORE_PREFIX)} ${pick(STORE_NAMES)}` };
  }).sort((a, b) => a.nit.localeCompare(b.nit));
}

/** Sales pemilik rute (kec 1–3 → S-A, 4–7 → S-B) dengan pergantian singkat. */
function salesFor(store: MasterStore, dayIndex: number) {
  const date = dateAt(dayIndex);
  if (store.kec === 6 && date >= '2026-08-31' && date <= '2026-09-07') return 'S-H';
  if (store.kec === 7 && date === '2026-09-15') return 'S-J';
  return store.kec <= 3 ? 'S-A' : 'S-B';
}

// ---------------------------------------------------------------------- Transaksi

function generateTransactions(stores: MasterStore[]) {
  const kiriman: KirimanRow[] = [];
  const bs: TransactionRow[] = [];
  const stock: TransactionRow[] = [];

  stores.forEach((store, storeIndex) => {
    // ±10% toko baru masuk di akhir periode → riwayat pendek (uji fallback).
    const isNew = storeIndex % 10 === 9;
    let day = isNew ? 30 + Math.floor(random() * 6) : Math.floor(random() * 6);
    const size = 0.6 + random() ** 1.4 * 1.8;

    const carried = PRODUCT_CODES.filter((code) => random() < PRODUCT_SIM[code].reach);
    if (carried.length < 3) carried.push('ncp', 'sc', 'nc');
    if (storeIndex === 5 && !carried.includes('mpc')) carried.push('mpc');
    const products = Array.from(new Set(carried));

    const lambda = Object.fromEntries(
      products.map((code) => [code, PRODUCT_SIM[code].qty * size * (0.75 + random() * 0.5)])
    ) as Record<ProductCode, number>;

    let prevKirim: ProductQuantities | null = null;
    let prevDay = 0;

    while (day < PERIOD_DAYS) {
      // Minggu libur: geser ke Sabtu atau Senin secara acak agar beban harian merata.
      if (isSunday(day)) day += random() < 0.5 ? -1 : 1;
      if (day >= PERIOD_DAYS) break;

      const tgl = dateAt(day);
      const nik = salesFor(store, day);
      const rowKirim = emptyQty();
      const rowBs = emptyQty();
      const rowStock = emptyQty();
      // ±3% kunjungan tanpa kiriman (terkirim = 0, semua produk nol).
      const noDelivery = prevKirim !== null && random() < 0.03;
      const gapFactor = Math.min(1.3, Math.max(0.7, (day - prevDay) / 6.5));

      products.forEach((code) => {
        const sim = PRODUCT_SIM[code];
        const before = prevKirim?.[code] ?? 0;
        let soldOut = true;

        if (prevKirim) {
          const demand = poisson(lambda[code] * (sim.demand + 0.12) * gapFactor);
          const leftover = Math.max(0, before - demand);
          soldOut = leftover === 0;
          if (leftover > 0) {
            rowBs[code] = Math.round(leftover * (0.15 + random() * 0.3));
            rowStock[code] = leftover - rowBs[code];
          }
        }

        if (noDelivery) return;

        if (!prevKirim || before === 0) {
          rowKirim[code] = Math.max(1, Math.round(lambda[code] * (1 + random() * 0.3)));
        } else if (random() < 0.62) {
          rowKirim[code] = before; // kebiasaan: sama dengan kunjungan lalu
        } else if (rowBs[code] > 0 || rowStock[code] > 1) {
          rowKirim[code] = Math.max(1, before - 1);
        } else if (soldOut && random() < 0.7) {
          rowKirim[code] = before + (before >= 8 ? 2 : 1);
        } else {
          rowKirim[code] = Math.max(1, before + (random() < 0.5 ? -1 : 1));
        }

        // Sesekali produk tidak dibawa pada kunjungan ini.
        if (random() < 0.05) rowKirim[code] = 0;
      });

      const base = { tgl, nit: store.nit, nik };
      kiriman.push({ ...base, id: 0, qty: rowKirim, terkirim: noDelivery ? 0 : 1 });
      bs.push({ ...base, id: 0, qty: rowBs });
      stock.push({ ...base, id: 0, qty: rowStock });

      prevKirim = rowKirim;
      prevDay = day;
      day += pick([4, 5, 6, 6, 7, 7, 7, 7, 8, 9, 12]);
    }
  });

  // Satu pencilan input meniru kasus nyata (analisis §5.4: mpc = 750).
  const outlier = kiriman.find(
    (row) => row.nit === stores[5]?.nit && row.tgl >= '2026-09-21' && row.qty.mpc > 0
  );
  if (outlier) outlier.qty.mpc = 750;

  const byDate = (a: TransactionRow, b: TransactionRow) =>
    a.tgl.localeCompare(b.tgl) || a.nit.localeCompare(b.nit);

  const withIds = <T extends TransactionRow>(rows: T[], firstId: number) =>
    rows.sort(byDate).map((row, index) => ({ ...row, id: firstId + index }));

  return {
    kiriman: withIds(kiriman, 19_820),
    bs: withIds(bs, 6_510),
    stock: withIds(stock, 7_204),
  };
}

// ----------------------------------------------------------------------

export const _forecastStores = generateStores();

const transactions = generateTransactions(_forecastStores);

export const _forecastKiriman: KirimanRow[] = transactions.kiriman;
export const _forecastBs: TransactionRow[] = transactions.bs;
export const _forecastStock: TransactionRow[] = transactions.stock;
