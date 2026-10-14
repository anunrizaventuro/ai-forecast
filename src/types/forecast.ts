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
