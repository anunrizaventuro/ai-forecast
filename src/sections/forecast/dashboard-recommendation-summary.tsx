'use client';

import type { CardProps } from '@mui/material/Card';
import type { Recommendation } from 'src/types/forecast';
import type { IconifyName } from 'src/components/iconify';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fNumber } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { RecommendationDelta } from './recommendation-delta';
import { IS_API, useForecastMeta } from './use-forecast-data';
import { fDate, CONFIDENCE_LABEL, summarizeRecommendations } from './forecast-utils';

// ----------------------------------------------------------------------

type Props = CardProps & {
  recommendations: Recommendation[];
  asOf: string;
};

type StatProps = {
  label: string;
  value: number;
  icon: IconifyName;
  color: 'success' | 'warning' | 'info' | 'default';
};

function Stat({ label, value, icon, color }: StatProps) {
  return (
    <Box sx={{ gap: 1.5, display: 'flex', alignItems: 'center' }}>
      <Label color={color} variant="soft" sx={{ width: 36, height: 36, p: 0 }}>
        <Iconify icon={icon} width={18} />
      </Label>
      <Box>
        <Typography variant="h5" component="p">
          {fNumber(value)}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {label}
        </Typography>
      </Box>
    </Box>
  );
}

export function DashboardRecommendationSummary({ recommendations, asOf, ...other }: Props) {
  const { storeMap } = useForecastMeta();
  const summary = summarizeRecommendations(recommendations);

  const biggestChanges = recommendations
    .filter((r) => !r.excluded && r.delta && !r.signals.includes('pencilan'))
    .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0))
    .slice(0, 6);

  return (
    <Card {...other}>
      <CardHeader
        title="Ringkasan rekomendasi stok"
        subheader={`Untuk kunjungan berikutnya · data s.d. ${fDate(asOf)} · ${fNumber(summary.stores)} toko`}
        action={
          <Label color={IS_API ? 'info' : 'warning'} variant="soft">
            {IS_API ? 'Baseline' : 'Simulasi'}
          </Label>
        }
      />

      <Grid container spacing={3} sx={{ p: 3 }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Box sx={{ gap: 2.5, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <Stat
              label="Naik"
              value={summary.increase}
              icon="carbon:increase-level"
              color="success"
            />
            <Stat label="Turun" value={summary.decrease} icon="carbon:arrow-down" color="warning" />
            <Stat label="Tetap" value={summary.same} icon="eva:checkmark-fill" color="info" />
            <Stat
              label="Dikecualikan"
              value={summary.excluded}
              icon="solar:info-circle-outline"
              color="default"
            />
          </Box>

          <Divider sx={{ my: 3, borderStyle: 'dashed' }} />

          <Box sx={{ gap: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Total kiriman terakhir
              </Typography>
              <Typography variant="subtitle2">{fNumber(summary.totalLast)} pcs</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Total rekomendasi berikutnya
              </Typography>
              <Typography variant="subtitle2">{fNumber(summary.totalRecommended)} pcs</Typography>
            </Box>
            <Box sx={{ mt: 1, gap: 1, display: 'flex', flexWrap: 'wrap' }}>
              {(['tinggi', 'sedang', 'rendah'] as const).map((level) => (
                <Label
                  key={level}
                  variant="soft"
                  color={level === 'tinggi' ? 'success' : level === 'sedang' ? 'info' : 'default'}
                >
                  Kepercayaan {CONFIDENCE_LABEL[level].toLowerCase()}: {summary.confidence[level]}
                </Label>
              ))}
            </Box>
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Perubahan terbesar dibanding kiriman terakhir
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Toko</TableCell>
                  <TableCell>Produk</TableCell>
                  <TableCell align="right">Terakhir</TableCell>
                  <TableCell align="right">Rekomendasi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {biggestChanges.map((row) => (
                  <TableRow key={`${row.nit}-${row.product}`}>
                    <TableCell sx={{ maxWidth: 200 }}>
                      <Typography variant="body2" noWrap>
                        {storeMap.get(row.nit)?.nama}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        {row.nit}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.product}</TableCell>
                    <TableCell align="right">{fNumber(row.lastKirim)}</TableCell>
                    <TableCell align="right">
                      <RecommendationDelta value={row.recommended} delta={row.delta} />
                    </TableCell>
                  </TableRow>
                ))}
                {!biggestChanges.length && (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}
                    >
                      Tidak ada perubahan untuk filter ini.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              component={RouterLink}
              href={paths.dashboard.recommendation}
              color="inherit"
              endIcon={<Iconify icon="eva:arrow-ios-forward-fill" width={18} />}
            >
              Lihat semua rekomendasi
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Card>
  );
}
