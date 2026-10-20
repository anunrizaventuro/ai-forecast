// Angka acuan perhitungan forecast (mode simulasi, filter default). Dipakai
// untuk membuktikan rumus & generator tidak berubah saat dipindah/refactor:
//   esbuild scripts/forecast-baseline.ts --bundle --platform=node --format=esm \
//     --tsconfig=tsconfig.json --outfile=/tmp/fb.mjs && node /tmp/fb.mjs | diff - scripts/forecast-baseline.json
import {
  PERIOD,
  summarize,
  groupByKec,
  timeSeries,
  filterCells,
  groupByStore,
  forecastCells,
  analyzePairs,
  groupByProduct,
  DEFAULT_FILTERS,
  DEFAULT_SETTINGS,
  DEFAULT_REC_PARAMS,
  computeRecommendations,
  summarizeRecommendations,
} from 'src/module/forecast/shared/utils';

const cells = filterCells(forecastCells, DEFAULT_FILTERS);
const recs = computeRecommendations(forecastCells, PERIOD.end, DEFAULT_REC_PARAMS);
const pairs = analyzePairs(cells, DEFAULT_FILTERS.to, DEFAULT_SETTINGS);
const countBy = (key: 'risk' | 'trend') =>
  pairs.reduce<Record<string, number>>(
    (acc, p) => ({ ...acc, [p[key]]: (acc[p[key]] ?? 0) + 1 }),
    {}
  );

const result = {
  summary: summarize(cells),
  products: groupByProduct(cells),
  kec: groupByKec(cells),
  storesTop10: groupByStore(cells).slice(0, 10),
  series: {
    harian: timeSeries(cells, DEFAULT_FILTERS.from, DEFAULT_FILTERS.to, 'harian'),
    mingguan: timeSeries(cells, DEFAULT_FILTERS.from, DEFAULT_FILTERS.to, 'mingguan'),
  },
  analysis: {
    total: pairs.length,
    risk: countBy('risk'),
    trend: countBy('trend'),
    first20: pairs.slice(0, 20),
  },
  recommendations: {
    total: recs.length,
    summary: summarizeRecommendations(recs),
    first20: recs.slice(0, 20),
  },
};

console.log(JSON.stringify(result, null, 2));
