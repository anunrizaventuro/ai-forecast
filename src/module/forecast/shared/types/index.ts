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
export type CellStatus = 'lengkap' | 'belum-cukup' | 'perlu-diperiksa';

export type CellReason =
  | 'kunjungan-pertama'
  | 'kiriman-sebelumnya-tidak-tercatat'
  | 'sisa-sebelumnya-tidak-tercatat'
  | 'sisa-tidak-tercatat'
  | 'bs-tidak-tercatat'
  | 'hasil-negatif'
  | 'kiriman-sebelumnya-pencilan';

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
  /** Sisa stok pada kunjungan sebelumnya (= stok awal periode). */
  prevStock: number | null;
  prevTgl: string | null;
  /** Hari sejak kunjungan sebelumnya (0 bila tidak ada). */
  days: number;
  /**
   * Estimasi terjual rumus stok: sisa(t−1) + kirim(t−1) − sisa(t) − bs(t).
   * Null bila data tidak cukup; bisa negatif (status perlu-diperiksa).
   */
  estSold: number | null;
  status: CellStatus;
  /** Alasan status belum-cukup / perlu-diperiksa (kosong bila lengkap). */
  reason: CellReason | '';
  /** status === 'lengkap' — satu-satunya sel yang masuk total & rasio. */
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

/** Satuan besar perubahan: pcs tetap, atau persen dari dasar (dibulatkan ke atas, min. 1 pcs). */
export type AdjustUnit = 'pcs' | 'persen';

/** Parameter aturan baseline — cermin `Params` di ai-forecast-be. */
export type RecommendationParams = {
  /** Jumlah observasi terakhir yang dipakai sebagai dasar median. */
  window: number;
  /** Minimum observasi sebelum memakai riwayat toko × produk sendiri. */
  minObservations: number;
  /**
   * Pengurangan TAMBAHAN saat retur tinggi. Penurunan sebesar BS sendiri
   * sudah otomatis lewat dasar (estimasi terjual = kiriman − BS).
   */
  returnSignalEnabled: boolean;
  /** Ambang rasio retur (0–1) yang memicu penurunan. */
  returnThreshold: number;
  /** Observasi andal terakhir untuk menghitung rasio retur. */
  returnWindow: number;
  /** Kunjungan terakhir beruntun yang masing-masing harus di atas ambang. */
  returnStreak: number;
  returnCutUnit: AdjustUnit;
  /** pcs (bulat) atau rasio dari dasar (0–1) sesuai `returnCutUnit`. */
  returnCut: number;
  /** Penambahan saat stok habis (BS = 0 dan STOCK = 0) beberapa kunjungan berturut-turut. */
  stockoutEnabled: boolean;
  /** Kunjungan terakhir berturut-turut yang harus habis. */
  stockoutStreak: number;
  stockoutBonusUnit: AdjustUnit;
  /** pcs (bulat) atau rasio dari dasar (0–1) sesuai `stockoutBonusUnit`. */
  stockoutBonus: number;
  /** Batas perubahan per kunjungan: max(minStep, rasio × kiriman terakhir). */
  maxStepRatio: number;
  minStep: number;
};

// ---------------------------------------------------------------------- Pengaturan
// Cermin forecast.Settings di ai-forecast-be (disimpan berversi).

export type CalcMethod = 'rata-rata' | 'median';
export type RoundMode = 'atas' | 'terdekat' | 'bawah';

export type ForecastSettings = {
  /** Perkiraan jarak ke kunjungan berikutnya (hari). */
  visitIntervalDays: number;
  /** Hanya kunjungan dalam N hari terakhir yang dipakai. */
  historyDays: number;
  /** Maksimum kunjungan (data lengkap) terakhir yang dipakai. */
  historyVisits: number;
  /** Kurang dari ini → "data belum cukup". */
  minObservations: number;
  method: CalcMethod;
  /** Porsi perkiraan sisa stok yang dihitung masih bisa terjual (0–100). */
  stockUsablePct: number;
  /** Batas BS ÷ stok tersedia (%) untuk indikator risiko BS. */
  bsRiskPct: number;
  /** Batas naik/turun terhadap kiriman terakhir (%). */
  maxChangePct: number;
  roundTo: number;
  roundMode: RoundMode;
  /** Masa kedaluwarsa (hari) — informasi produk saja, tidak dipakai menghitung. */
  shelfLifeDays: number;
  productShelfLife: Partial<Record<ProductCode, number>>;
};

export type SettingsVersion = {
  /** 0 = belum pernah disimpan (default). */
  version: number;
  params: ForecastSettings;
  note: string;
  /** ISO; null untuk default. */
  createdAt: string | null;
};

export type SettingsState = SettingsVersion & { defaults: ForecastSettings };

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
  /** Σ estimasi terjual pada sel berstatus lengkap. */
  estSold: number;
  /** Σ stok tersedia (sisa + kiriman kunjungan sebelumnya) pada sel yang sama — penyebut rasio. */
  basis: number;
  returnRate: number | null;
  sellThrough: number | null;
  /** Σ estimasi terjual × harga jual MRoti (asumsi harga tetap). */
  salesValue: number;
  visits: number;
  stores: number;
  /** Jumlah sel per status kecukupan data. */
  cellsComplete: number;
  cellsInsufficient: number;
  cellsCheck: number;
};

// ---------------------------------------------------------------------- Analisis toko × roti
// Cermin PairAnalysis / VisitRow di ai-forecast-be (internal/forecast/analysis.go).

export type Trend = 'naik' | 'turun' | 'stabil' | 'belum-bisa-dinilai';
export type StockRisk = 'kelebihan' | 'kekurangan' | 'wajar' | 'belum-cukup';

export type PairAnalysis = {
  nit: string;
  product: ProductCode;
  observations: number;
  checks: number;
  insufficient: number;
  dataFrom: string | null;
  dataTo: string | null;
  lastVisit: string;
  lastKirim: number;
  lastStock: number;
  lastBs: number;
  avgKirim: number;
  soldPerDay: number | null;
  soldPerVisit: number | null;
  avgStock: number | null;
  bsRate: number | null;
  trend: Trend;
  risk: StockRisk;
  riskReason: string;
};

export type VisitRow = {
  tgl: string;
  prevTgl: string | null;
  days: number;
  stockStart: number | null;
  prevKirim: number | null;
  kirim: number;
  stock: number;
  bs: number;
  estSold: number | null;
  perDay: number | null;
  status: CellStatus;
  reason: CellReason | '';
  /** Dipakai sebagai observasi analisis. */
  used: boolean;
  nik: string;
};

export type PairDetail = { analysis: PairAnalysis; history: VisitRow[] };

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
