'use client';

import type { Recommendation } from 'src/types/forecast';

import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';

import { fNumber } from 'src/utils/format-number';

import { useForecastMeta } from './use-forecast-data';
import { summarizeRecommendations } from './forecast-utils';
import { RecommendationGroup } from './recommendation-group';
import { RecommendationEmpty } from './recommendation-empty';

// ----------------------------------------------------------------------
// POV sales: pilih sales → daftar produk yang dibawa (total pcs semua tokonya,
// semacam daftar muat) → accordion produk berisi rincian per toko.

const NO_SALES = 'Tanpa sales';

type Props = {
  rows: Recommendation[];
  salesMap: Map<string, string>;
};

export function RecommendationSalesList({ rows, salesMap }: Props) {
  const { storeMap, productMap } = useForecastMeta();
  const [selected, setSelected] = useState<string | null>(null);

  const bySales = useMemo(() => {
    const map = new Map<string, Recommendation[]>();
    rows.forEach((row) => {
      const sales = salesMap.get(row.nit) ?? NO_SALES;
      map.set(sales, [...(map.get(sales) ?? []), row]);
    });
    return map;
  }, [rows, salesMap]);

  const options = useMemo(
    () =>
      [...bySales.entries()]
        .map(([sales, items]) => ({ sales, stores: new Set(items.map((r) => r.nit)).size }))
        .sort(
          (a, b) =>
            (a.sales === NO_SALES ? 1 : 0) - (b.sales === NO_SALES ? 1 : 0) ||
            a.sales.localeCompare(b.sales)
        ),
    [bySales]
  );

  // Pilihan lama hilang karena filter → kembali ke sales pertama.
  const active = selected && bySales.has(selected) ? selected : (options[0]?.sales ?? null);
  const salesRows = useMemo(() => (active ? (bySales.get(active) ?? []) : []), [active, bySales]);
  const summary = summarizeRecommendations(salesRows);

  const groups = useMemo(() => {
    const byProduct = new Map<string, Recommendation[]>();
    salesRows.forEach((row) =>
      byProduct.set(row.product, [...(byProduct.get(row.product) ?? []), row])
    );

    const storeKey = (row: Recommendation) => storeMap.get(row.nit);

    return [...byProduct.entries()]
      .map(([product, items]) => ({
        product,
        total: summarizeRecommendations(items).totalRecommended,
        rows: items.sort(
          (a, b) =>
            (storeKey(a)?.kec ?? 99) - (storeKey(b)?.kec ?? 99) ||
            (storeKey(a)?.nama ?? a.nit).localeCompare(storeKey(b)?.nama ?? b.nit)
        ),
      }))
      .sort((a, b) => b.total - a.total || a.product.localeCompare(b.product));
  }, [salesRows, storeMap]);

  return (
    <Card>
      <Box sx={{ p: { xs: 2, md: 3 }, pb: 2 }}>
        <Box sx={{ gap: 1, display: 'flex', flexWrap: 'wrap' }}>
          {options.map((option) => (
            <Chip
              key={option.sales}
              clickable
              label={`${option.sales} · ${fNumber(option.stores)} toko`}
              color={option.sales === active ? 'primary' : 'default'}
              variant={option.sales === active ? 'filled' : 'outlined'}
              onClick={() => setSelected(option.sales)}
            />
          ))}
        </Box>

        {active && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">
              {active}: {fNumber(summary.totalRecommended)} pcs untuk {fNumber(summary.stores)} toko
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Kiriman terakhir {fNumber(summary.totalLast)} pcs · {fNumber(groups.length)} produk ·
              sales toko = sales pada kunjungan terakhir
            </Typography>
          </Box>
        )}
      </Box>

      {groups.map(({ product, rows: items }) => (
        <RecommendationGroup
          key={product}
          rowLabel="store"
          rows={items}
          title={product}
          subtitle={productMap.get(product)?.nama}
        />
      ))}

      {!groups.length && <RecommendationEmpty />}
    </Card>
  );
}
