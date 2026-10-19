// Lightweight number formatters used across the demo dashboards.
// These are intentionally dependency-free (Intl only) so the dashboard module
// stays self-contained.

export function fNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);
}

export function fCompact(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

/** Compact IDR-style currency, e.g. `Rp 1,2 jt`. */
export function fCurrency(value: number): string {
  return `Rp ${new Intl.NumberFormat('id-ID', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)}`;
}

export function fPercent(value: number, fractionDigits = 1): string {
  return `${value.toFixed(fractionDigits)}%`;
}

/** Signed percent for deltas, e.g. `+4.2%` / `-1.8%`. */
export function fDelta(value: number, fractionDigits = 1): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(fractionDigits)}%`;
}
