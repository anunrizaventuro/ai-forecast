import type { CardProps } from '@mui/material/Card';
import type { ProductSummary } from 'src/module/forecast/shared/utils';

import CardContent from '@mui/material/CardContent';

import { ChartCard } from 'src/shared/ui/dashboard-card';
import { ForecastBarList } from 'src/module/forecast/shared/components';
import { fNumber, fPercent, productGroup } from 'src/module/forecast/shared/utils';

// ----------------------------------------------------------------------

type Props = Omit<CardProps, 'title'> & {
  rows: ProductSummary[];
  limit?: number;
};

export function DashboardTopProducts({ rows, limit = 7, ...other }: Props) {
  const items = rows
    .filter((row) => row.estSold > 0)
    .sort((a, b) => b.estSold - a.estSold)
    .slice(0, limit)
    .map((row) => ({
      key: row.product.code,
      label: row.product.code,
      caption: productGroup(row.product),
      value: row.estSold,
      detail: `Kiriman ${fNumber(row.kirim)} pcs · retur ${fPercent(row.returnRate)} · ${fNumber(row.stores)} toko`,
    }));

  return (
    <ChartCard
      title="Produk estimasi terjual tertinggi"
      subheader="Estimasi terjual (pcs) pada rentang terpilih"
      {...other}
    >
      <CardContent>
        <ForecastBarList ranked items={items} series="estSold" />
      </CardContent>
    </ChartCard>
  );
}
