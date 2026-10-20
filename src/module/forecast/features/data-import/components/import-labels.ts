import type { ImportOp, ImportIssue } from '../api';
import type { LabelColor } from 'src/shared/ui/label';

import dayjs from 'dayjs';

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

export const fDateTimeId = (iso: string) => dayjs(iso).locale('id').format('D MMM YYYY, HH:mm');
