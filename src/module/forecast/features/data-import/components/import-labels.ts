import type { ImportOp, ImportIssue } from '../api';
import type { LabelColor } from 'src/shared/ui/label';
import type { IconifyName } from 'src/shared/ui/iconify';

// ----------------------------------------------------------------------
// Label tampilan untuk istilah backend (nama tabel klien, status, tingkat).

export const TABLE_LABEL: Record<string, string> = {
  MToko: 'Toko',
  MRoti: 'Produk',
  KIRIMAN: 'Kiriman',
  STOCK: 'Sisa stok',
  BS: 'BS',
  SPK: 'SPK',
};

export const tableLabel = (table: string) => TABLE_LABEL[table] ?? table;

export const STATUS_LABEL: Record<ImportOp['status'], { text: string; color: LabelColor }> = {
  baru: { text: 'Baru', color: 'success' },
  diperbarui: { text: 'Diperbarui', color: 'info' },
  sama: { text: 'Tidak berubah', color: 'default' },
};

export const LEVEL_LABEL: Record<ImportIssue['level'], { text: string; color: LabelColor }> = {
  error: { text: 'Error', color: 'error' },
  peringatan: { text: 'Peringatan', color: 'warning' },
};

/** Posisi baris di file; file ekspor database menyertakan nama sheet. */
export function rowLabel({ sheet, row }: { sheet: string; row: number }) {
  if (!row) return sheet ? `Sheet ${sheet}` : 'File';
  return sheet ? `${sheet} · ${row}` : String(row);
}

// File dari klien yang dikenali backend tanpa memilih jenis data
// (ai-forecast-be internal/importer/detect.go).
export const AUTO_FORMATS: { icon: IconifyName; label: string; hint: string }[] = [
  {
    icon: 'carbon:delivery',
    label: 'Laporan kunjungan kurir (LPK)',
    hint: 'LapK_<kurir>_<tanggal>.csv → kiriman, sisa stok, BS',
  },
  {
    icon: 'custom:invoice-duotone',
    label: 'SPK',
    hint: 'Spk_<kurir>_<tanggal>.csv → rencana kiriman',
  },
  {
    icon: 'carbon:list-boxes',
    label: 'Ekspor database (Excel)',
    hint: '.xlsx dengan sheet MToko, MRoti, KIRIMAN, STOCK, BS — dibaca sekaligus',
  },
  {
    icon: 'solar:notes-bold-duotone',
    label: 'Data toko / produk',
    hint: 'CSV atau Excel dengan kolom nit + nama, atau nir + nama',
  },
];
