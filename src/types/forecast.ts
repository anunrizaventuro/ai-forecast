// ----------------------------------------------------------------------
// Bentuk data AI Forecast. Tipe "sumber" mengikuti tabel database klien
// (XDistribution: MRoti, MToko, KIRIMAN, BS, STOCK — lihat
// ai-forecast-be/docs/database-analysis.md); tipe "turunan" adalah hasil
// olahan dashboard. Saat backend tersedia, tipe sumber diganti skema zod di
// src/lib/api dengan bentuk yang sama.

/** Kode kolom produk di tabel transaksi (urut sesuai MRoti.nir). */
export const PRODUCT_CODES = [
  'mps',
  'mpc',
  'mpkt',
  'mpkh',
  'jasuke',
  'nc',
  'np',
  'ncp',
  'ncs',
  'ncb',
  'nck',
  'cocang',
  'sukemi',
  'sc',
  'ss',
  'sb',
  'sk',
  'sisir3',
  'sisir2',
  'tm',
  'tf',
] as const;

export type ProductCode = (typeof PRODUCT_CODES)[number];

export type ProductQuantities = Record<ProductCode, number>;

// ---------------------------------------------------------------------- Sumber

/** MRoti — master produk + harga (Rupiah per pcs, asumsi belum dikonfirmasi). */
export type MasterProduct = {
  nir: string;
  code: ProductCode;
  nama: string;
  hargaBeli: number;
  hargaJual: number;
};

/** MToko — master toko. Digit pertama `nit` selalu sama dengan `kec`. */
export type MasterStore = {
  nit: string;
  nama: string;
  kec: number;
  /** false = kode toko muncul di transaksi tetapi tidak ada di MToko. */
  inMaster?: boolean;
};

/** Baris BS / STOCK: satu per (tgl, nit, nik) dengan 21 kolom produk. */
export type TransactionRow = {
  id: number;
  tgl: string;
  nit: string;
  nik: string;
  qty: ProductQuantities;
};

/** Baris KIRIMAN: seperti BS/STOCK + flag `terkirim`. */
export type KirimanRow = TransactionRow & {
  terkirim: 0 | 1;
};

// ---------------------------------------------------------------------- Turunan

/**
 * Satu sel (toko × produk × kunjungan) hasil gabungan KIRIMAN/BS/STOCK pada
 * kunci (tgl, nit) — `nik` hanya atribut (dokumen analisis §6.1).
 */
export type VisitCell = {
  tgl: string;
  nit: string;
  nik: string;
  product: ProductCode;
  kirim: number;
  bs: number;
  stock: number;
  /** Kiriman produk ini pada kunjungan sebelumnya ke toko yang sama. */
  prevKirim: number | null;
  prevTgl: string | null;
  /** Estimasi terjual rumus B: kirim(t−1) − bs(t). Null bila tak ada t−1. */
  estSold: number | null;
  /** true bila estSold layak dipakai (kiriman sebelumnya > 0 dan bukan pencilan). */
  reliable: boolean;
  /** Kiriman sel ini terdeteksi pencilan (kemungkinan salah input). */
  outlier: boolean;
};

export type Confidence = 'tinggi' | 'sedang' | 'rendah';

export type RecommendationSignal = 'habis' | 'retur-tinggi' | 'dibatasi' | 'fallback' | 'pencilan';

export type Recommendation = {
  nit: string;
  product: ProductCode;
  lastTgl: string;
  lastKirim: number;
  lastBs: number;
  /** Median estimasi terjual dari observasi yang dipakai (null bila fallback). */
  estSold: number | null;
  /** BS ÷ kiriman sebelumnya pada observasi yang dipakai. */
  returnRate: number | null;
  /** Null = produk dikecualikan dari rekomendasi otomatis. */
  recommended: number | null;
  delta: number | null;
  confidence: Confidence;
  basis: string;
  signals: RecommendationSignal[];
  observations: number;
  nextVisit: string;
  excluded: boolean;
};

export type ReturnCutUnit = 'pcs' | 'persen';

/** Parameter aturan baseline — cermin `Params` di ai-forecast-be. */
export type RecommendationParams = {
  /** Jumlah observasi terakhir yang dipakai sebagai dasar median. */
  window: number;
  /** Minimum observasi sebelum memakai riwayat toko × produk sendiri. */
  minObservations: number;
  /** Ambang rasio retur (0–1) yang memicu penurunan. */
  returnThreshold: number;
  /** Observasi andal terakhir untuk menghitung rasio retur. */
  returnWindow: number;
  /** Kunjungan terakhir beruntun yang masing-masing harus di atas ambang. */
  returnStreak: number;
  returnCutUnit: ReturnCutUnit;
  /** pcs (bulat) atau rasio dari dasar (0–1) sesuai `returnCutUnit`. */
  returnCut: number;
  /** Tambahan pcs saat sinyal habis. */
  stockoutBonus: number;
  /** Batas perubahan per kunjungan: max(minStep, rasio × kiriman terakhir). */
  maxStepRatio: number;
  minStep: number;
};

export type RecommendationSettings = {
  params: RecommendationParams;
  defaults: RecommendationParams;
  /** ISO; null = belum pernah disimpan (memakai default). */
  updatedAt: string | null;
};

// ---------------------------------------------------------------------- Dashboard
// Bentuk data yang dikonsumsi UI — sama untuk sumber simulasi maupun API
// (lihat src/lib/api/forecast.ts untuk pemetaan dari JSON backend).

export type ForecastFilters = {
  from: string;
  to: string;
  nit: string | null;
  product: ProductCode | null;
};

export type CellSummary = {
  kirim: number;
  bs: number;
  stock: number;
  /** Σ estimasi terjual pada sel yang layak (reliable). */
  estSold: number;
  /** Σ kiriman sebelumnya pada sel yang sama — penyebut rasio. */
  basis: number;
  returnRate: number | null;
  sellThrough: number | null;
  /** Σ estimasi terjual × harga jual MRoti (asumsi harga tetap). */
  salesValue: number;
  visits: number;
  stores: number;
};

export type SeriesPoint = {
  key: string;
  label: string;
  kirim: number;
  estSold: number;
  bs: number;
};

export type Granularity = 'harian' | 'mingguan';

export type ProductSummary = CellSummary & { product: MasterProduct };

export type KecSummary = CellSummary & { kec: number };

export type StoreSummary = CellSummary & {
  store: MasterStore;
  lastVisit: string | null;
  lastSales: string | null;
  avgInterval: number | null;
  productCount: number;
};

export type ForecastSource = 'simulasi' | 'api';

/** Master & konteks data yang dipakai seluruh halaman dashboard. */
export type ForecastMeta = {
  source: ForecastSource;
  period: { start: string; end: string };
  products: MasterProduct[];
  stores: MasterStore[];
  sales: string[];
};
