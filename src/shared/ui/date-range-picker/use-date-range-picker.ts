import type { Dayjs } from 'dayjs';

import dayjs from 'dayjs';
import { useMemo, useState, useEffect, useCallback } from 'react';

export type DateRangePreset =
  | 'today'
  | 'thisWeek'
  | 'thisMonth'
  | 'lastMonth'
  | 'thisYear'
  | 'lastYear'
  | 'custom';

export const DATE_RANGE_PRESETS: Exclude<DateRangePreset, 'custom'>[] = [
  'today',
  'thisWeek',
  'thisMonth',
  'lastMonth',
  'thisYear',
  'lastYear',
];

export type DateRangeValue = { start: string; end: string };

function presetToRange(preset: Exclude<DateRangePreset, 'custom'>): { start: Dayjs; end: Dayjs } {
  const now = dayjs();
  switch (preset) {
    case 'today':
      return { start: now.startOf('day'), end: now.endOf('day') };
    case 'thisWeek':
      return { start: now.startOf('week'), end: now.endOf('week') };
    case 'thisMonth':
      return { start: now.startOf('month'), end: now.endOf('month') };
    case 'lastMonth': {
      const lm = now.subtract(1, 'month');
      return { start: lm.startOf('month'), end: lm.endOf('month') };
    }
    case 'thisYear':
      return { start: now.startOf('year'), end: now.endOf('year') };
    case 'lastYear': {
      const ly = now.subtract(1, 'year');
      return { start: ly.startOf('year'), end: ly.endOf('year') };
    }
    default:
      return { start: now, end: now };
  }
}

function detectPreset(start: Dayjs, end: Dayjs): DateRangePreset {
  for (const preset of DATE_RANGE_PRESETS) {
    const r = presetToRange(preset);
    if (start.isSame(r.start, 'day') && end.isSame(r.end, 'day')) return preset;
  }
  return 'custom';
}

export type UseDateRangePickerProps = {
  startDate: string;
  endDate: string;
  onApply: (value: DateRangeValue) => void;
};

export function useDateRangePicker({ startDate, endDate, onApply }: UseDateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [pendingStart, setPendingStart] = useState<Dayjs | null>(
    startDate ? dayjs(startDate) : null
  );
  const [pendingEnd, setPendingEnd] = useState<Dayjs | null>(endDate ? dayjs(endDate) : null);
  const [hoveredDay, setHoveredDay] = useState<Dayjs | null>(null);

  useEffect(() => {
    if (open) {
      setPendingStart(startDate ? dayjs(startDate) : null);
      setPendingEnd(endDate ? dayjs(endDate) : null);
      setHoveredDay(null);
    }
  }, [open, startDate, endDate]);

  const error = useMemo(() => {
    if (!pendingStart || !pendingEnd) return false;
    return pendingStart.isAfter(pendingEnd, 'day');
  }, [pendingStart, pendingEnd]);

  const activePreset = useMemo<DateRangePreset>(() => {
    if (!pendingStart || !pendingEnd) return 'custom';
    return detectPreset(pendingStart, pendingEnd);
  }, [pendingStart, pendingEnd]);

  const onOpen = useCallback(() => setOpen(true), []);
  const onClose = useCallback(() => setOpen(false), []);

  const onApplyPreset = useCallback((preset: Exclude<DateRangePreset, 'custom'>) => {
    const range = presetToRange(preset);
    setPendingStart(range.start);
    setPendingEnd(range.end);
    setHoveredDay(null);
  }, []);

  const onDayClick = useCallback(
    (day: Dayjs | null) => {
      if (!day) return;
      // Cycle: [no selection] → start, [start only] → end, [both] → reset & start
      if (!pendingStart || (pendingStart && pendingEnd)) {
        setPendingStart(day);
        setPendingEnd(null);
      } else if (day.isBefore(pendingStart, 'day')) {
        // Click earlier than start → swap
        setPendingEnd(pendingStart);
        setPendingStart(day);
      } else if (day.isSame(pendingStart, 'day')) {
        // Same day click → single-day range
        setPendingEnd(day);
      } else {
        setPendingEnd(day);
      }
    },
    [pendingStart, pendingEnd]
  );

  const onDayHover = useCallback((day: Dayjs | null) => {
    setHoveredDay(day);
  }, []);

  const onApplyClick = useCallback(() => {
    if (error || !pendingStart || !pendingEnd) return;
    onApply({
      start: pendingStart.format('YYYY-MM-DD'),
      end: pendingEnd.format('YYYY-MM-DD'),
    });
    setOpen(false);
  }, [error, pendingStart, pendingEnd, onApply]);

  const onReset = useCallback(() => {
    setPendingStart(null);
    setPendingEnd(null);
    setHoveredDay(null);
  }, []);

  return {
    open,
    pendingStart,
    pendingEnd,
    hoveredDay,
    error,
    activePreset,
    onOpen,
    onClose,
    onChangeStart: setPendingStart,
    onChangeEnd: setPendingEnd,
    onDayClick,
    onDayHover,
    onApplyPreset,
    onApply: onApplyClick,
    onReset,
  };
}
