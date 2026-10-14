'use client';

import { useId } from 'react';

import Box from '@mui/material/Box';

// ----------------------------------------------------------------------
// Grafik mini dekoratif untuk kartu KPI: hanya bentuk tren, tanpa sumbu.
// Angka detailnya ada di grafik tren utama, jadi elemen ini aria-hidden.

type Props = {
  values: number[];
  color: string;
  height?: number;
};

const W = 100;

export function ForecastSparkline({ values, color, height = 44 }: Props) {
  const gradientId = `spark${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

  if (values.length < 2) return <Box sx={{ height }} />;

  // Skala min–maks agar bentuk tren tetap terlihat walau titiknya sedikit.
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const x = (index: number) => (index / (values.length - 1)) * W;
  const y = (value: number) => height - 4 - ((value - min) / span) * (height * 0.7);

  const line = values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
  const area = `0,${height} ${line} ${W},${height}`;

  return (
    <Box
      component="svg"
      aria-hidden
      viewBox={`0 0 ${W} ${height}`}
      preserveAspectRatio="none"
      sx={{ width: 1, height, display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.28 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </Box>
  );
}
