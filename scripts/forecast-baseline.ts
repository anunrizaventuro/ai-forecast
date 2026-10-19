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
  groupByProduct,
  DEFAULT_FILTERS,
  DEFAULT_REC_PARAMS,
  computeRecommendations,
  summarizeRecommendations,
} from 'src/sections/forecast/forecast-utils';

const cells = filterCells(forecastCells, DEFAULT_FILTERS);
const recs = computeRecommendations(forecastCells, PERIOD.end, DEFAULT_REC_PARAMS);

const result = {
  summary: summarize(cells),
  products: groupByProduct(cells),
  kec: groupByKec(cells),
  storesTop10: groupByStore(cells).slice(0, 10),
  series: {
    harian: timeSeries(cells, DEFAULT_FILTERS.from, DEFAULT_FILTERS.to, 'harian'),
    mingguan: timeSeries(cells, DEFAULT_FILTERS.from, DEFAULT_FILTERS.to, 'mingguan'),
  },
  recommendations: {
    total: recs.length,
    summary: summarizeRecommendations(recs),
    first20: recs.slice(0, 20),
  },
};

console.log(JSON.stringify(result, null, 2));
