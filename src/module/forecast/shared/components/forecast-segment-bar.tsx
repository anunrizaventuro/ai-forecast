import type { IconifyName } from 'src/shared/ui/iconify';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import ButtonBase from '@mui/material/ButtonBase';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/shared/ui/iconify';
import { fNumber, fPercent } from 'src/module/forecast/shared/utils';

import { tint } from './forecast-chart-colors';

// ----------------------------------------------------------------------
// Bar 100% bertumpuk + legend berangka. Identitas tiap segmen tidak hanya
// lewat warna: legend memuat ikon, label, jumlah, dan persentase. Bila
// `onSelect` diisi, item legend menjadi tombol filter.

export type Segment<K extends string> = {
  key: K;
  label: string;
  value: number;
  color: string;
  icon?: IconifyName;
};

type Props<K extends string> = {
  segments: Segment<K>[];
  height?: number;
  showLegend?: boolean;
  selected?: K | null;
  onSelect?: (key: K) => void;
  unit?: string;
};

export function ForecastSegmentBar<K extends string>({
  segments,
  height = 12,
  showLegend = true,
  selected,
  onSelect,
  unit,
}: Props<K>) {
  const total = segments.reduce((acc, s) => acc + s.value, 0);
  const visible = segments.filter((s) => s.value > 0);

  return (
    <Box sx={{ containerType: 'inline-size' }}>
      <Box
        role="img"
        aria-label={segments.map((s) => `${s.label} ${fNumber(s.value)}`).join(', ')}
        sx={{ gap: '2px', height, display: 'flex', borderRadius: height / 2, overflow: 'hidden' }}
      >
        {total === 0 && <Box sx={{ flex: 1, bgcolor: 'action.hover' }} />}
        {visible.map((s) => (
          <Tooltip
            key={s.key}
            title={`${s.label}: ${fNumber(s.value)}${unit ? ` ${unit}` : ''} (${fPercent(s.value / total)})`}
            disableInteractive
          >
            <Box
              sx={{
                minWidth: 4,
                bgcolor: s.color,
                flexGrow: s.value,
                flexBasis: 0,
                transition: 'flex-grow 0.4s ease, opacity 0.2s',
                opacity: selected && selected !== s.key ? 0.32 : 1,
              }}
            />
          </Tooltip>
        ))}
      </Box>

      {showLegend && (
        <Box
          sx={{
            mt: 2,
            gap: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            // Jumlah genap (mis. 4 status): 2×2 bila sempit, satu baris bila lebar —
            // jangan sampai satu item tersisa sendirian di baris kedua.
            ...(segments.length % 2 === 0 && {
              gridTemplateColumns: 'repeat(2, 1fr)',
              '@container (min-width: 640px)': {
                gridTemplateColumns: `repeat(${segments.length}, 1fr)`,
              },
            }),
          }}
        >
          {segments.map((s) => {
            const active = selected === s.key;

            return (
              <ButtonBase
                key={s.key}
                disabled={!onSelect}
                onClick={() => onSelect?.(s.key)}
                aria-pressed={onSelect ? active : undefined}
                sx={{
                  p: 1.25,
                  gap: 1.25,
                  borderRadius: 1.5,
                  textAlign: 'left',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  border: '1px solid',
                  borderColor: active ? s.color : 'transparent',
                  bgcolor: active ? tint(s.color, 10) : 'transparent',
                  transition: 'background-color 0.2s, border-color 0.2s',
                  ...(onSelect && { '&:hover': { bgcolor: tint(s.color, 8) } }),
                }}
              >
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    flexShrink: 0,
                    display: 'flex',
                    borderRadius: 1.25,
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: s.color,
                    bgcolor: tint(s.color, 14),
                  }}
                >
                  {s.icon ? (
                    <Iconify icon={s.icon} width={18} />
                  ) : (
                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: s.color }} />
                  )}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h6" component="p" sx={{ lineHeight: 1.2 }}>
                    {fNumber(s.value)}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', display: 'block' }}
                    noWrap
                  >
                    {s.label} · {total ? fPercent(s.value / total, 0) : '–'}
                  </Typography>
                </Box>
              </ButtonBase>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
