import dayjs from 'dayjs';

const SHORT_DATE = 'DD MMM YYYY';
const SHORT_DAY_MONTH = 'DD MMM';

export function formatDateRangeLabel(start: string, end: string): string | null {
  if (!start || !end) return null;
  const s = dayjs(start);
  const e = dayjs(end);
  if (!s.isValid() || !e.isValid()) return null;
  if (s.isSame(e, 'day')) return s.format(SHORT_DATE);
  if (s.isSame(e, 'year')) return `${s.format(SHORT_DAY_MONTH)} — ${e.format(SHORT_DATE)}`;
  return `${s.format(SHORT_DATE)} — ${e.format(SHORT_DATE)}`;
}
