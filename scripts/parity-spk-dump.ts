// Dump data simulasi + saran SPK frontend untuk dibandingkan dengan backend
// (ai-forecast-be/cmd/parity-spk — lihat cara pakai di sana).
import {
  _forecastBs,
  _forecastStock,
  _forecastKiriman,
  _forecastStores,
  _forecastProducts,
} from 'src/module/forecast/shared/data/simulasi';
import {
  suggestSpk,
  spkAsOf,
  addDays,
  forecastCells,
  DEFAULT_SETTINGS,
  PERIOD,
} from 'src/module/forecast/shared/utils';

const variants = [
  DEFAULT_SETTINGS,
  {
    ...DEFAULT_SETTINGS,
    method: 'median' as const,
    roundTo: 5,
    roundMode: 'terdekat' as const,
    historyVisits: 6,
  },
  {
    ...DEFAULT_SETTINGS,
    maxChangePct: 10,
    bsRiskPct: 5,
    stockUsablePct: 100,
    visitIntervalDays: 7,
    roundMode: 'bawah' as const,
    roundTo: 2,
  },
];
const nits = _forecastStores.map((s) => s.nit);
const cases = [] as unknown[];
for (const s of variants) {
  for (const tgl of [addDays(PERIOD.end, 1), addDays(PERIOD.end, -10)]) {
    const asOf = spkAsOf(tgl, PERIOD.end);
    cases.push({ settings: s, tgl, asOf, out: suggestSpk(forecastCells, nits, tgl, asOf, s) });
  }
}
console.log(
  JSON.stringify({
    products: _forecastProducts,
    stores: _forecastStores.map((x) => ({ nit: x.nit, nama: x.nama, kec: x.kec })),
    kiriman: _forecastKiriman,
    bs: _forecastBs,
    stock: _forecastStock,
    nits,
    cases,
  })
);
