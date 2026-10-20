import type { LabelColor } from 'src/shared/ui/label';
import type { Trend, StockRisk, CellStatus } from 'src/module/forecast/shared/types';

// ----------------------------------------------------------------------

export const RISK_LABEL: Record<StockRisk, { text: string; color: LabelColor }> = {
  kelebihan: { text: 'Risiko stok berlebih', color: 'warning' },
  kekurangan: { text: 'Risiko kekurangan stok', color: 'error' },
  wajar: { text: 'Wajar', color: 'success' },
  'belum-cukup': { text: 'Data belum cukup', color: 'default' },
};

export const TREND_LABEL: Record<Trend, string> = {
  naik: 'Naik',
  turun: 'Turun',
  stabil: 'Stabil',
  'belum-bisa-dinilai': '—',
};

export const STATUS_LABEL: Record<CellStatus, { text: string; color: LabelColor }> = {
  lengkap: { text: 'Lengkap', color: 'success' },
  'belum-cukup': { text: 'Belum cukup', color: 'default' },
  'perlu-diperiksa': { text: 'Perlu diperiksa', color: 'warning' },
};

/** Urutan tampil: yang perlu perhatian dulu. */
export const RISK_ORDER: StockRisk[] = ['kekurangan', 'kelebihan', 'wajar', 'belum-cukup'];
