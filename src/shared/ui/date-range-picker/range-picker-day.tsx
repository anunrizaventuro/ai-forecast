import type { Dayjs } from 'dayjs';
import type { PickersDayProps } from '@mui/x-date-pickers/PickersDay';

import dayjs from 'dayjs';
import { varAlpha } from 'minimal-shared/utils';
import localeData from 'dayjs/plugin/localeData';

import { styled } from '@mui/material/styles';
import { PickersDay, pickersDayClasses } from '@mui/x-date-pickers/PickersDay';

dayjs.extend(localeData);

// ----------------------------------------------------------------------

type ExtraProps = {
  isStart?: boolean;
  isEnd?: boolean;
  isInRange?: boolean;
  isPreviewInRange?: boolean;
};

type StyledProps = ExtraProps & { day: Dayjs };

const StyledPickersDay = styled(PickersDay, {
  shouldForwardProp: (prop) =>
    prop !== 'isStart' && prop !== 'isEnd' && prop !== 'isInRange' && prop !== 'isPreviewInRange',
})<StyledProps>(({ theme, day, isStart, isEnd, isInRange, isPreviewInRange }) => {
  const isEdge = isStart || isEnd;
  const showRangeBg = (isInRange && !isEdge) || (isPreviewInRange && !isEdge);
  const weekStart = day.localeData().firstDayOfWeek();
  const dayOfWeek = day.day();
  const isFirstWeekday = dayOfWeek === weekStart;
  const isLastWeekday = dayOfWeek === (weekStart + 6) % 7;

  return {
    margin: 0,
    borderRadius: showRangeBg ? 0 : '50%',
    transition: 'none',
    // Today indicator: drop the default ring border; use color + weight emphasis instead
    // (so it doesn't render as a square when overlapping the range bar).
    [`&.${pickersDayClasses.today}`]: {
      border: 'none',
      fontWeight: theme.typography.fontWeightBold,
      ...(!isEdge &&
        !isInRange &&
        !isPreviewInRange && {
          color: theme.vars.palette.primary.main,
        }),
    },
    ...(isInRange &&
      !isEdge && {
        backgroundColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.16),
        color: theme.vars.palette.primary.dark,
        '&:hover, &:focus': {
          backgroundColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.24),
        },
      }),
    ...(isPreviewInRange &&
      !isInRange &&
      !isEdge && {
        backgroundColor: varAlpha(theme.vars.palette.primary.mainChannel, 0.08),
      }),
    ...(isEdge && {
      backgroundColor: theme.vars.palette.primary.main,
      color: theme.vars.palette.primary.contrastText,
      fontWeight: theme.typography.fontWeightSemiBold,
      '&:hover, &:focus, &.Mui-selected, &.Mui-selected:hover, &.Mui-selected:focus': {
        backgroundColor: theme.vars.palette.primary.main,
        color: theme.vars.palette.primary.contrastText,
      },
    }),
    ...(isStart &&
      !isEnd && {
        borderTopLeftRadius: '50%',
        borderBottomLeftRadius: '50%',
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
      }),
    ...(isEnd &&
      !isStart && {
        borderTopRightRadius: '50%',
        borderBottomRightRadius: '50%',
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
      }),
    ...(showRangeBg &&
      isFirstWeekday && {
        borderTopLeftRadius: '50%',
        borderBottomLeftRadius: '50%',
      }),
    ...(showRangeBg &&
      isLastWeekday && {
        borderTopRightRadius: '50%',
        borderBottomRightRadius: '50%',
      }),
  };
});

// ----------------------------------------------------------------------

export type RangePickerDayProps = PickersDayProps & {
  start?: Dayjs | null;
  end?: Dayjs | null;
  hovered?: Dayjs | null;
  onDayHover?: (day: Dayjs | null) => void;
};

export function RangePickerDay({
  start = null,
  end = null,
  hovered = null,
  onDayHover,
  ...other
}: RangePickerDayProps) {
  const { day, outsideCurrentMonth } = other;

  const isStart = !!start && day.isSame(start, 'day');
  const isEnd = !!end && day.isSame(end, 'day');

  const isInRange =
    !outsideCurrentMonth &&
    !!start &&
    !!end &&
    !day.isBefore(start, 'day') &&
    !day.isAfter(end, 'day');

  const previewEnd = hovered && start && hovered.isAfter(start, 'day') ? hovered : null;
  const previewStart = hovered && start && hovered.isBefore(start, 'day') ? hovered : null;

  const isPreviewInRange =
    !outsideCurrentMonth &&
    !!start &&
    !end &&
    ((previewEnd != null && day.isAfter(start, 'day') && !day.isAfter(previewEnd, 'day')) ||
      (previewStart != null && day.isBefore(start, 'day') && !day.isBefore(previewStart, 'day')));

  return (
    <StyledPickersDay
      {...other}
      selected={false}
      isStart={isStart}
      isEnd={isEnd}
      isInRange={isInRange}
      isPreviewInRange={isPreviewInRange}
      onPointerEnter={() => onDayHover?.(day)}
    />
  );
}
