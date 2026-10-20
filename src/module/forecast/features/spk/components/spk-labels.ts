import type { LabelColor } from 'src/shared/ui/label';
import type { SpkLine, SpkStatus, ForecastSettings } from 'src/module/forecast/shared/types';

import { fDate } from 'src/module/forecast/shared/utils';

// ----------------------------------------------------------------------

export const SPK_STATUS: Record<SpkStatus, { label: string; color: LabelColor }> = {
  draft: { label: 'Draf', color: 'warning' },
  final: { label: 'Final', color: 'success' },
};

const fmt = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 1 });

const ROUND_LABEL: Record<ForecastSettings['roundMode'], string> = {
  atas: 'ke atas',
  terdekat: 'ke terdekat',
  bawah: 'ke bawah',
};

/** Langkah hitungan saran satu toko × roti dalam bahasa pengguna. */
export function explainLine(line: SpkLine, s: ForecastSettings): string[] {
  const c = line.calc;
  if (!c) return ['Ditambahkan manual — tidak ada saran sistem untuk roti ini di toko ini.'];
  const last = `kiriman terakhir ${c.lastKirim} pcs (${fDate(c.lastVisit)})`;
  if (c.status === 'perlu-diperiksa') {
    return [
      `Kiriman terakhir ${c.lastKirim} pcs (${fDate(c.lastVisit)}) jauh di atas kebiasaan — kemungkinan salah input. Sistem tidak memberi angka karena batas perubahan dan perkiraan sisa dihitung dari kiriman terakhir.`,
      'Periksa data kiriman itu, lalu isi jumlah manual.',
    ];
  }
  if (c.status === 'belum-cukup' || c.soldPerDay === null) {
    return [
      `Baru ${c.observations} kunjungan berdata lengkap; minimal ${s.minObservations}. Sistem tidak memberi angka — isi manual.`,
      `Sebagai acuan: ${last}, sisa saat itu ${c.lastStock} pcs.`,
    ];
  }
  const method = s.method === 'median' ? 'median' : 'rata-rata';
  const steps = [
    `Terjual ±${fmt(c.soldPerDay)} pcs/hari (${method} ${c.observations} kunjungan) × ${s.visitIntervalDays} hari = kebutuhan ${fmt(c.need!)} pcs.`,
    `Perkiraan sisa saat kurir datang: sisa ${c.lastStock} + ${last} − ${fmt(c.soldPerDay)} × ${c.daysSince} hari = ${fmt(c.remaining!)} pcs; ${s.stockUsablePct}% dianggap masih terjual = ${fmt(c.usable!)} pcs.`,
    `${fmt(c.need!)} − ${fmt(c.usable!)} = ${fmt(c.raw!)} pcs.`,
  ];
  if (c.bsCapped) {
    steps.push(
      `BS ${fmt((c.bsRate ?? 0) * 100)}% dari stok tersedia, di atas batas ${s.bsRiskPct}% → tidak dinaikkan dari ${c.lastKirim} pcs${c.capped ? `, menjadi ${fmt(c.limited!)} pcs` : ''}.`
    );
  } else if (c.capped) {
    steps.push(
      `Batas perubahan ±${c.step} pcs dari kiriman terakhir ${c.lastKirim} pcs → dibatasi menjadi ${fmt(c.limited!)} pcs.`
    );
  } else {
    steps.push(
      `Masih dalam batas perubahan ±${c.step} pcs dari kiriman terakhir ${c.lastKirim} pcs.`
    );
  }
  steps.push(
    `Dibulatkan ${ROUND_LABEL[s.roundMode]}${s.roundTo > 1 ? ` ke kelipatan ${s.roundTo}` : ''} → saran ${line.suggested} pcs.`
  );
  return steps;
}
