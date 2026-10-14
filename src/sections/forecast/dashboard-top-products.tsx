import type { CardProps } from '@mui/material/Card';
import type { ProductSummary } from './forecast-utils';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';

import { fNumber, fPercent } from 'src/utils/format-number';

import { productGroup } from './forecast-utils';
import { ForecastBarList } from './forecast-bar-list';

// ----------------------------------------------------------------------

type Props = CardProps & {
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
    <Card {...other}>
      <CardHeader
        title="Produk estimasi terjual tertinggi"
        subheader="Estimasi terjual (pcs) pada rentang terpilih"
      />
      <CardContent>
        <ForecastBarList items={items} series="estSold" />
      </CardContent>
    </Card>
  );
}
