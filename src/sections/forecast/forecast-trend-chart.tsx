'use client';

import type { SeriesKey } from './forecast-chart-colors';

import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { fNumber } from 'src/utils/format-number';

import { SERIES, chartColorVars } from './forecast-chart-colors';

// ----------------------------------------------------------------------
// Grafik garis SVG ringan (proyek sengaja tanpa library chart). Satu sumbu
// Y, garis 2px, crosshair + tooltip yang membaca semua seri pada titik X,
// navigasi keyboard (← →), dan legend selalu tampil untuk ≥ 2 seri.

export type TrendSeries = {
  key: SeriesKey;
  values: number[];
};

type Props = {
  categories: string[];
  series: TrendSeries[];
  height?: number;
  ariaLabel: string;
};

const MARGIN = { top: 16, right: 16, bottom: 28, left: 48 };

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

function niceMax(value: number) {
  if (value <= 0) return 10;
  const exponent = 10 ** Math.floor(Math.log10(value));
  const fraction = value / exponent;
  const nice =
    fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10;
  return nice * exponent;
}

export function ForecastTrendChart({ categories, series, height = 320, ariaLabel }: Props) {
  const theme = useTheme();
  const { ref, width } = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const count = categories.length;
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = height - MARGIN.top - MARGIN.bottom;

  const maxValue = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * maxValue);

  const x = (index: number) =>
    MARGIN.left + (count <= 1 ? innerWidth / 2 : (index / (count - 1)) * innerWidth);
  const y = (value: number) => MARGIN.top + innerHeight - (value / maxValue) * innerHeight;

  const labelEvery = Math.max(1, Math.ceil((count * 64) / Math.max(innerWidth, 1)));

  const handlePointer = (event: React.PointerEvent<SVGRectElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - box.left) / Math.max(box.width, 1);
    setActive(Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1)))));
  };

  const handleKey = (event: React.KeyboardEvent<SVGSVGElement>) => {
    if (event.key === 'ArrowRight') setActive((prev) => Math.min(count - 1, (prev ?? -1) + 1));
    if (event.key === 'ArrowLeft') setActive((prev) => Math.max(0, (prev ?? count) - 1));
    if (event.key === 'Escape') setActive(null);
  };

  const tooltipLeft = active !== null ? x(active) : 0;
  const tooltipOnLeft = tooltipLeft > width * 0.6;

  return (
    <Box sx={{ ...chartColorVars(theme), position: 'relative' }}>
      {series.length > 1 && (
        <Box component="ul" sx={{ mb: 2, gap: 2.5, display: 'flex', flexWrap: 'wrap' }}>
          {series.map((s) => (
            <Box
              key={s.key}
              component="li"
              sx={{ gap: 1, display: 'flex', alignItems: 'center', typography: 'body2' }}
            >
              <Box sx={{ width: 16, height: 2, borderRadius: 1, bgcolor: SERIES[s.key].color }} />
              <Box component="span" sx={{ color: 'text.secondary' }}>
                {SERIES[s.key].label}
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <Box ref={ref} sx={{ width: 1, height, position: 'relative' }}>
        {width > 0 && count > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={ariaLabel}
            tabIndex={0}
            onKeyDown={handleKey}
            onBlur={() => setActive(null)}
            style={{ display: 'block', outline: 'none' }}
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={MARGIN.left}
                  x2={MARGIN.left + innerWidth}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke="currentColor"
                  strokeOpacity={tick === 0 ? 0.24 : 0.08}
                  strokeDasharray={tick === 0 ? undefined : '3 4'}
                />
                <text
                  x={MARGIN.left - 8}
                  y={y(tick)}
                  dy="0.32em"
                  textAnchor="end"
                  fontSize={11}
                  fill="currentColor"
                  fillOpacity={0.6}
                >
                  {fNumber(tick)}
                </text>
              </g>
            ))}

            {categories.map((category, index) =>
              index % labelEvery === 0 ? (
                <text
                  key={category}
                  x={x(index)}
                  y={height - 8}
                  textAnchor={index === 0 ? 'start' : index === count - 1 ? 'end' : 'middle'}
                  fontSize={11}
                  fill="currentColor"
                  fillOpacity={0.6}
                >
                  {category}
                </text>
              ) : null
            )}

            {series.map((s) => (
              <polyline
                key={s.key}
                fill="none"
                stroke={SERIES[s.key].color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                points={s.values.map((value, index) => `${x(index)},${y(value)}`).join(' ')}
              />
            ))}

            {active !== null && (
              <g pointerEvents="none">
                <line
                  x1={x(active)}
                  x2={x(active)}
                  y1={MARGIN.top}
                  y2={MARGIN.top + innerHeight}
                  stroke="currentColor"
                  strokeOpacity={0.24}
                />
                {series.map((s) => (
                  <circle
                    key={s.key}
                    cx={x(active)}
                    cy={y(s.values[active] ?? 0)}
                    r={5}
                    fill={SERIES[s.key].color}
                    stroke={theme.vars.palette.background.paper}
                    strokeWidth={2}
                  />
                ))}
              </g>
            )}

            <rect
              x={MARGIN.left - 8}
              y={MARGIN.top}
              width={innerWidth + 16}
              height={innerHeight}
              fill="transparent"
              onPointerMove={handlePointer}
              onPointerDown={handlePointer}
              onPointerLeave={() => setActive(null)}
            />
          </svg>
        )}

        {active !== null && (
          <Box
            sx={{
              top: MARGIN.top,
              position: 'absolute',
              pointerEvents: 'none',
              left: tooltipOnLeft ? 'auto' : tooltipLeft + 12,
              right: tooltipOnLeft ? width - tooltipLeft + 12 : 'auto',
              px: 1.5,
              py: 1,
              minWidth: 160,
              borderRadius: 1,
              bgcolor: 'background.paper',
              boxShadow: theme.vars.customShadows.dropdown,
            }}
          >
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {categories[active]}
            </Typography>
            {series.map((s) => (
              <Box key={s.key} sx={{ gap: 1, display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: 12, height: 2, borderRadius: 1, bgcolor: SERIES[s.key].color }} />
                <Typography variant="subtitle2">{fNumber(s.values[active])}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {SERIES[s.key].label}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
