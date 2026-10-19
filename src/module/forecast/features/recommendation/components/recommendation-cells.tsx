import type { Recommendation } from 'src/module/forecast/shared/types';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { Label } from 'src/shared/ui/label';
import { useRecommendationParams } from 'src/module/forecast/shared/hooks';
import { RecommendationDelta } from 'src/module/forecast/shared/components';
import {
  fDate,
  fNumber,
  fPercent,
  signalLabel,
  CONFIDENCE_LABEL,
} from 'src/module/forecast/shared/utils';

// ----------------------------------------------------------------------
// Isi sel baris rekomendasi — dipakai tampilan per toko dan per sales.

const CONFIDENCE_COLOR = { tinggi: 'success', sedang: 'info', rendah: 'default' } as const;

type RowProps = { row: Recommendation };

export function LastKirimCell({ row }: RowProps) {
  return (
    <>
      <Typography variant="body2">{fNumber(row.lastKirim)} pcs</Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {fDate(row.lastTgl)}
      </Typography>
    </>
  );
}

export function EstSoldCell({ row }: RowProps) {
  return (
    <>
      <Typography variant="body2">
        {row.estSold === null ? '–' : `${fNumber(row.estSold, 1)} pcs`}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {row.observations} observasi
      </Typography>
    </>
  );
}

export function ReturnCell({ row }: RowProps) {
  return (
    <>
      <Typography variant="body2">{fNumber(row.lastBs)} pcs</Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        rasio {fPercent(row.returnRate)}
      </Typography>
    </>
  );
}

export function RecommendedCell({ row }: RowProps) {
  const { params } = useRecommendationParams();
  const signals = row.signals.filter((signal) => signal !== 'fallback');

  return (
    <>
      {row.excluded ? (
        <Label variant="soft" color="default">
          Dikecualikan
        </Label>
      ) : (
        <RecommendationDelta value={row.recommended} delta={row.delta} />
      )}
      {!!signals.length && (
        <Box
          sx={{ mt: 0.5, gap: 0.5, display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end' }}
        >
          {signals.map((signal) => (
            <Label
              key={signal}
              variant="soft"
              color={signal === 'pencilan' ? 'error' : 'default'}
              sx={{ height: 20, fontSize: 11 }}
            >
              {signalLabel(signal, params)}
            </Label>
          ))}
        </Box>
      )}
    </>
  );
}

export function ConfidenceCell({ row }: RowProps) {
  return (
    <Tooltip title={row.basis} placement="top-start">
      <Box>
        <Label variant="soft" color={CONFIDENCE_COLOR[row.confidence]}>
          {CONFIDENCE_LABEL[row.confidence]}
        </Label>
        <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: 'text.secondary' }}>
          {row.basis}
        </Typography>
      </Box>
    </Tooltip>
  );
}

export function NextVisitCell({ row }: RowProps) {
  return (
    <>
      <Typography variant="body2">{fDate(row.nextVisit)}</Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        perkiraan
      </Typography>
    </>
  );
}
