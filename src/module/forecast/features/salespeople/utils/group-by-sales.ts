import type { StoreSummary } from 'src/module/forecast/shared/types';

// ----------------------------------------------------------------------
// Data Sales disusun dari ringkasan toko: toko dihitung untuk sales pada
// kunjungan terakhirnya di rentang (konvensi yang sama dengan tab "Per sales"
// di Rekomendasi Stok). Kolom `nik` transaksi berisi teks bebas — belum ada
// master sales yang dipakai (MKurir kosong di transaksi) — jadi label yang
// ejaannya beda tampil sebagai baris terpisah.

export const NO_SALES = 'Tanpa sales';

export type SalesSummary = {
  sales: string;
  stores: StoreSummary[];
  visits: number;
  kirim: number;
  estSold: number;
  bs: number;
  /** Σ BS andal ÷ Σ stok tersedia, sama dengan rasio retur per toko bila digabung. */
  returnRate: number | null;
  lastVisit: string | null;
  avgInterval: number | null;
};

/** Toko dengan beberapa sales di kunjungan terakhir ("S-A, S-B") masuk ke setiap sales. */
export const splitSales = (label: string | null) => (label ? label.split(', ') : [NO_SALES]);

export function groupBySales(rows: StoreSummary[]): SalesSummary[] {
  const map = new Map<string, StoreSummary[]>();
  rows.forEach((row) =>
    splitSales(row.lastSales).forEach((sales) => map.set(sales, [...(map.get(sales) ?? []), row]))
  );

  return [...map.entries()].map(([sales, stores]) => {
    // returnRate toko = BS andal ÷ basis, jadi returnRate × basis mengembalikan BS andal.
    const basis = stores.reduce((acc, s) => acc + s.basis, 0);
    const reliableBs = stores.reduce((acc, s) => acc + (s.returnRate ?? 0) * s.basis, 0);
    const intervals = stores.flatMap((s) => (s.avgInterval === null ? [] : [s.avgInterval]));
    const lastVisits = stores.flatMap((s) => (s.lastVisit ? [s.lastVisit] : []));

    return {
      sales,
      stores,
      visits: stores.reduce((acc, s) => acc + s.visits, 0),
      kirim: stores.reduce((acc, s) => acc + s.kirim, 0),
      estSold: stores.reduce((acc, s) => acc + s.estSold, 0),
      bs: stores.reduce((acc, s) => acc + s.bs, 0),
      returnRate: basis ? reliableBs / basis : null,
      lastVisit: lastVisits.length ? lastVisits.sort()[lastVisits.length - 1] : null,
      avgInterval: intervals.length
        ? intervals.reduce((acc, v) => acc + v, 0) / intervals.length
        : null,
    };
  });
}
