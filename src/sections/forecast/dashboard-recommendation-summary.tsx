'use client';

import type { CardProps } from '@mui/material/Card';
import type { Recommendation } from 'src/types/forecast';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fNumber, fPercent } from 'src/utils/format-number';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { RecommendationMix } from './recommendation-mix';
import { ForecastSegmentBar } from './forecast-segment-bar';
import { RecommendationDelta } from './recommendation-delta';
import { IS_API, useForecastMeta } from './use-forecast-data';
import { fDate, CONFIDENCE_LABEL, summarizeRecommendations } from './forecast-utils';

// ----------------------------------------------------------------------

type Props = CardProps & {
  recommendations: Recommendation[];
  asOf: string;
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>
      {children}
    </Typography>
  );
}

export function DashboardRecommendationSummary({ recommendations, asOf, ...other }: Props) {
  const theme = useTheme();
  const { storeMap } = useForecastMeta();
  const summary = summarizeRecommendations(recommendations);

  const totalDelta = summary.totalRecommended - summary.totalLast;
  const totalRatio = summary.totalLast ? totalDelta / summary.totalLast : null;

  const biggestChanges = recommendations
    .filter((r) => !r.excluded && r.delta && !r.signals.includes('pencilan'))
    .sort((a, b) => Math.abs(b.delta ?? 0) - Math.abs(a.delta ?? 0))
    .slice(0, 6);

  const { palette } = theme.vars;

  return (
    <Card {...other}>
      <CardHeader
        title="Rekomendasi stok kunjungan berikutnya"
        subheader={`Data s.d. ${fDate(asOf)} · ${fNumber(summary.stores)} toko · ${fNumber(summary.total)} kombinasi toko × produk`}
        action={
          <Label color={IS_API ? 'info' : 'warning'} variant="soft">
            {IS_API ? 'Baseline' : 'Simulasi'}
          </Label>
        }
      />

      <Grid container spacing={{ xs: 3, md: 4 }} sx={{ p: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionTitle>Total roti yang dibawa</SectionTitle>
          <Box sx={{ gap: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Kiriman terakhir
              </Typography>
              <Typography variant="h4" component="p">
                {fNumber(summary.totalLast)}
              </Typography>
            </Box>
            <Iconify
              icon="eva:arrow-forward-fill"
              width={24}
              sx={{ color: 'text.disabled', mt: 2 }}
            />
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Rekomendasi
              </Typography>
              <Typography variant="h4" component="p" sx={{ color: 'primary.main' }}>
                {fNumber(summary.totalRecommended)}
                <Box
                  component="span"
                  sx={{ ml: 0.5, typography: 'body2', color: 'text.secondary' }}
                >
                  pcs
                </Box>
              </Typography>
            </Box>
            <Label
              variant="soft"
              color={totalDelta > 0 ? 'success' : totalDelta < 0 ? 'warning' : 'default'}
              sx={{ mt: 2 }}
            >
              {totalDelta > 0 ? '+' : totalDelta < 0 ? '−' : '±'}
              {fNumber(Math.abs(totalDelta))} pcs ({fPercent(totalRatio && Math.abs(totalRatio))})
            </Label>
          </Box>

          <Box sx={{ mt: 4 }}>
            <SectionTitle>Arah perubahan per toko × produk</SectionTitle>
            <RecommendationMix summary={summary} />
          </Box>

          <Box sx={{ mt: 4 }}>
            <SectionTitle>Tingkat kepercayaan</SectionTitle>
            <ForecastSegmentBar
              height={8}
              unit="item"
              segments={(['tinggi', 'sedang', 'rendah'] as const).map((level) => ({
                key: level,
                label: CONFIDENCE_LABEL[level],
                value: summary.confidence[level],
                color:
                  level === 'tinggi'
                    ? palette.primary.main
                    : level === 'sedang'
                      ? palette.primary.light
                      : palette.grey[400],
              }))}
            />
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionTitle>Perubahan terbesar dibanding kiriman terakhir</SectionTitle>

          <Box component="ul" sx={{ gap: 1, display: 'flex', flexDirection: 'column' }}>
            {biggestChanges.map((row) => {
              const store = storeMap.get(row.nit);
              const up = (row.delta ?? 0) > 0;

              return (
                <Box
                  component="li"
                  key={`${row.nit}-${row.product}`}
                  sx={{
                    p: 1.5,
                    gap: 1.5,
                    display: 'flex',
                    borderRadius: 1.5,
                    alignItems: 'center',
                    bgcolor: 'background.neutral',
                  }}
                >
                  <Box
                    sx={{
                      px: 1,
                      minWidth: 56,
                      height: 40,
                      flexShrink: 0,
                      display: 'flex',
                      borderRadius: 1.25,
                      alignItems: 'center',
                      justifyContent: 'center',
                      typography: 'subtitle2',
                      color: up ? 'success.dark' : 'warning.dark',
                      bgcolor: 'background.paper',
                    }}
                  >
                    {row.product}
                  </Box>

                  <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
                    <Typography variant="subtitle2" noWrap>
                      {store?.nama ?? row.nit}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
                      {row.nit}
                      {store?.kec ? ` · Kec. ${store.kec}` : ''} ·{' '}
                      {CONFIDENCE_LABEL[row.confidence]}
                    </Typography>
                  </Box>

                  <Box sx={{ gap: 0.75, flexShrink: 0, display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {fNumber(row.lastKirim)}
                    </Typography>
                    <Iconify
                      icon="eva:arrow-forward-fill"
                      width={14}
                      sx={{ color: 'text.disabled' }}
                    />
                    <RecommendationDelta value={row.recommended} delta={row.delta} />
                  </Box>
                </Box>
              );
            })}

            {!biggestChanges.length && (
              <Typography
                component="li"
                variant="body2"
                sx={{ py: 4, textAlign: 'center', color: 'text.secondary' }}
              >
                Tidak ada perubahan untuk filter ini.
              </Typography>
            )}
          </Box>

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
