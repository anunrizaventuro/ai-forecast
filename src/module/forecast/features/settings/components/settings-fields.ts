import type { ForecastSettings } from 'src/module/forecast/shared/types';

// ----------------------------------------------------------------------
// Label, satuan, dan penjelasan setiap parameter — dipakai form, dialog
// konfirmasi, dan riwayat versi supaya istilahnya sama di semua tempat.

export type ScalarKey = Exclude<keyof ForecastSettings, 'productShelfLife'>;

type FieldMeta = { label: string; unit?: string; help: string };

export const FIELD_META: Record<ScalarKey, FieldMeta> = {
  visitIntervalDays: {
    label: 'Interval kunjungan',
    unit: 'hari',
    help: 'Jarak perkiraan sampai kurir datang lagi ke toko yang sama. Kebutuhan roti dihitung untuk jangka ini.',
  },
  historyDays: {
    label: 'Periode data historis',
    unit: 'hari',
    help: 'Hanya kunjungan dalam sekian hari terakhir yang dipakai. Data yang lebih lama dianggap sudah tidak mewakili.',
  },
  historyVisits: {
    label: 'Jumlah kunjungan yang dipakai',
    unit: 'kunjungan',
    help: 'Maksimal sekian kunjungan terakhir (yang datanya lengkap) yang dirata-rata per toko dan jenis roti.',
  },
  minObservations: {
    label: 'Minimal data lengkap',
    unit: 'kunjungan',
    help: 'Bila kunjungan dengan data lengkap (kiriman, sisa, BS) kurang dari ini, sistem tidak memberi angka dan meminta pemeriksaan manual.',
  },
  method: {
    label: 'Metode perkiraan penjualan',
    help: 'Rata-rata: total roti terjual dibagi total hari. Median: nilai tengah penjualan per hari tiap kunjungan, tidak terpengaruh satu kunjungan yang sangat tinggi/rendah.',
  },
  stockUsablePct: {
    label: 'Sisa stok yang dianggap masih terjual',
    unit: '%',
    help: 'Umur roti di toko tidak dicatat, jadi tidak semua sisa stok pasti laku. 50% berarti separuh perkiraan sisa stok mengurangi kiriman.',
  },
  bsRiskPct: {
    label: 'Batas risiko BS',
    unit: '%',
    help: 'Bila BS melebihi persentase ini dari stok yang tersedia, toko × roti ditandai risiko BS tinggi dan saran kiriman tidak dinaikkan.',
  },
  maxChangePct: {
    label: 'Batas perubahan kiriman',
    unit: '%',
    help: 'Saran tidak boleh naik atau turun lebih dari persentase ini dibanding kiriman terakhir (minimal ±2 pcs), agar perubahan bertahap.',
  },
  roundTo: {
    label: 'Kelipatan pembulatan',
    unit: 'pcs',
    help: 'Saran dibulatkan ke kelipatan ini, mis. 5 → 5, 10, 15 pcs. Isi 1 untuk tanpa kelipatan.',
  },
  roundMode: {
    label: 'Arah pembulatan',
    help: 'Ke atas mengurangi risiko kehabisan; ke bawah mengurangi risiko BS.',
  },
  shelfLifeDays: {
    label: 'Masa kedaluwarsa umum',
    unit: 'hari',
    help: 'Informasi produk. Tidak dipakai menghitung umur stok karena tanggal masuk tiap roti tidak dicatat.',
  },
};

const OPTION_LABEL: Record<string, string> = {
  'rata-rata': 'Rata-rata',
  median: 'Median',
  atas: 'Ke atas',
  terdekat: 'Terdekat',
  bawah: 'Ke bawah',
};

export const METHOD_OPTIONS = [
  { value: 'rata-rata', label: 'Rata-rata' },
  { value: 'median', label: 'Median (nilai tengah)' },
];

export const ROUND_OPTIONS = [
  { value: 'atas', label: 'Ke atas' },
  { value: 'terdekat', label: 'Terdekat' },
  { value: 'bawah', label: 'Ke bawah' },
];

export function formatValue(key: ScalarKey, value: ForecastSettings[ScalarKey]) {
  if (typeof value === 'string') return OPTION_LABEL[value] ?? value;
  const unit = FIELD_META[key].unit;
  return unit === '%' ? `${value}%` : `${value}${unit ? ` ${unit}` : ''}`;
}

export type SettingChange = { label: string; from: string; to: string };

/** Daftar perubahan a → b dalam bahasa pengguna. */
export function diffSettings(a: ForecastSettings, b: ForecastSettings): SettingChange[] {
  const changes: SettingChange[] = [];
  (Object.keys(FIELD_META) as ScalarKey[]).forEach((key) => {
    if (a[key] !== b[key]) {
      changes.push({
        label: FIELD_META[key].label,
        from: formatValue(key, a[key]),
        to: formatValue(key, b[key]),
      });
    }
  });
  const codes = new Set([...Object.keys(a.productShelfLife), ...Object.keys(b.productShelfLife)]);
  [...codes].sort().forEach((code) => {
    const from = a.productShelfLife[code as keyof typeof a.productShelfLife];
    const to = b.productShelfLife[code as keyof typeof b.productShelfLife];
    if (from !== to) {
      changes.push({
        label: `Kedaluwarsa ${code}`,
        from: from ? `${from} hari` : 'ikut umum',
        to: to ? `${to} hari` : 'ikut umum',
      });
    }
  });
  return changes;
}

// ----------------------------------------------------------------------
// Contoh hitungan untuk menjelaskan pengaruh parameter (angka contoh tetap,
// bukan data toko). Rumus sama dengan yang akan dipakai rekomendasi SPK.

export function exampleCalculation(s: ForecastSettings) {
  const perDay = 2;
  const lastKirim = 6;
  const remaining = 4;
  const need = perDay * s.visitIntervalDays;
  const usable = (remaining * s.stockUsablePct) / 100;
  const raw = Math.max(0, need - usable);
  const step = Math.max(2, Math.ceil((lastKirim * s.maxChangePct) / 100));
  const limited = Math.min(lastKirim + step, Math.max(lastKirim - step, raw));
  const unit = s.roundTo;
  const rounded =
    s.roundMode === 'atas'
      ? Math.ceil(limited / unit - 1e-9) * unit
      : s.roundMode === 'bawah'
        ? Math.floor(limited / unit + 1e-9) * unit
        : Math.round(limited / unit) * unit;
  const fmt = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 1 });

  return [
    `Kebutuhan: ${fmt(perDay)} pcs/hari × ${s.visitIntervalDays} hari = ${fmt(need)} pcs.`,
    `Perkiraan sisa stok ${remaining} pcs × ${s.stockUsablePct}% = ${fmt(usable)} pcs dianggap masih terjual → ${fmt(need)} − ${fmt(usable)} = ${fmt(raw)} pcs.`,
    limited !== raw
      ? `Kiriman terakhir ${lastKirim} pcs, batas perubahan ±${step} pcs → dibatasi menjadi ${fmt(limited)} pcs.`
      : `Kiriman terakhir ${lastKirim} pcs, masih dalam batas perubahan ±${step} pcs.`,
    `Dibulatkan ${OPTION_LABEL[s.roundMode].toLowerCase()}${unit > 1 ? ` ke kelipatan ${unit}` : ''} → saran ${fmt(rounded)} pcs.`,
  ];
}
