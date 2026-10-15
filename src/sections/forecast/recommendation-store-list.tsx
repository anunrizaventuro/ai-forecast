'use client';

import type { Recommendation } from 'src/types/forecast';

import { useMemo, useState, useEffect } from 'react';

import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { PRODUCT_CODES } from 'src/types/forecast';

import { fDate } from './forecast-utils';
import { useForecastMeta } from './use-forecast-data';
import { ForecastTablePagination } from './forecast-table';
import { RecommendationGroup } from './recommendation-group';
import { RecommendationEmpty } from './recommendation-empty';

// ----------------------------------------------------------------------
// POV toko: satu accordion per toko (urut kec → nama, mengikuti rute), isinya
// rekomendasi per produk untuk kunjungan berikutnya.

const productOrder = (code: string) => PRODUCT_CODES.indexOf(code as never);

type Props = {
  rows: Recommendation[];
  salesMap: Map<string, string>;
  /** Berubah saat filter berubah → kembali ke halaman 1. */
  resetKey: string;
};

export function RecommendationStoreList({ rows, salesMap, resetKey }: Props) {
  const { storeMap } = useForecastMeta();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    setPage(0);
  }, [resetKey]);

  const groups = useMemo(() => {
    const byStore = new Map<string, Recommendation[]>();
    rows.forEach((row) => byStore.set(row.nit, [...(byStore.get(row.nit) ?? []), row]));

    return [...byStore.entries()]
      .map(([nit, items]) => ({
        nit,
        store: storeMap.get(nit),
        rows: items.sort((a, b) => productOrder(a.product) - productOrder(b.product)),
      }))
      .sort(
        (a, b) =>
          (a.store?.kec ?? 99) - (b.store?.kec ?? 99) ||
          (a.store?.nama ?? a.nit).localeCompare(b.store?.nama ?? b.nit)
      );
  }, [rows, storeMap]);

  const pageGroups = groups.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Card>
      {pageGroups.map(({ nit, store, rows: items }) => (
        <RecommendationGroup
          key={nit}
          rowLabel="product"
          rows={items}
          title={store?.nama ?? 'Di luar master'}
          subtitle={[
            nit,
            store?.kec ? `Kec. ${store.kec}` : 'kec tidak diketahui',
            `Sales ${salesMap.get(nit) ?? '–'}`,
          ].join(' · ')}
          meta={
            <>
              <Typography variant="body2">{fDate(items[0]!.nextVisit)}</Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                kunjungan berikutnya
              </Typography>
            </>
          }
        />
      ))}

      {!pageGroups.length && <RecommendationEmpty />}

      <ForecastTablePagination
        count={groups.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
      />
    </Card>
  );
}
