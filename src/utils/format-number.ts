// ----------------------------------------------------------------------
// Format angka konsisten untuk locale Indonesia (titik ribuan, koma desimal).

const LOCALE = 'id-ID';

export type NumberInput = number | null | undefined;

const isValid = (value: NumberInput): value is number =>
  value !== null && value !== undefined && Number.isFinite(value);

export function fNumber(value: NumberInput, maximumFractionDigits = 0) {
  if (!isValid(value)) return '–';
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits }).format(value);
}

/** Rupiah tanpa desimal, mis. "Rp 1.250.000". */
export function fCurrency(value: NumberInput) {
  if (!isValid(value)) return '–';
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

/** Rupiah ringkas, mis. "Rp 12,4 jt". */
export function fShortCurrency(value: NumberInput) {
  if (!isValid(value)) return '–';
  if (Math.abs(value) >= 1_000_000) return `Rp ${fNumber(value / 1_000_000, 1)} jt`;
  if (Math.abs(value) >= 1_000) return `Rp ${fNumber(value / 1_000, 1)} rb`;
  return `Rp ${fNumber(value)}`;
}

/** Rasio 0–1 → persen, mis. 0.034 → "3,4%". */
export function fPercent(value: NumberInput, maximumFractionDigits = 1) {
  if (!isValid(value)) return '–';
  return new Intl.NumberFormat(LOCALE, {
    style: 'percent',
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}
