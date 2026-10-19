import type { DateRangeValue } from './use-date-range-picker';

import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Popover from '@mui/material/Popover';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import useMediaQuery from '@mui/material/useMediaQuery';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import InputAdornment from '@mui/material/InputAdornment';
import FormHelperText from '@mui/material/FormHelperText';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { DateCalendar, dateCalendarClasses } from '@mui/x-date-pickers/DateCalendar';

import { useTranslate } from 'src/locales';
import { Iconify } from 'src/shared/ui/iconify';

import { RangePickerDay } from './range-picker-day';
import { formatDateRangeLabel } from './format-range-label';
import { DATE_RANGE_PRESETS, useDateRangePicker } from './use-date-range-picker';

// ----------------------------------------------------------------------

type Variant = 'auto' | 'calendar' | 'input';

type Props = {
  startDate: string;
  endDate: string;
  onApply: (value: DateRangeValue) => void;
  triggerLabel?: string;
  fullWidth?: boolean;
  /**
   * - `'auto'` (default): popover with two `DateCalendar` + presets left at md+, fall back to dialog with two `DatePicker` stacked on mobile
   * - `'calendar'`: force popover layout
   * - `'input'`: force dialog with stacked DatePicker
   */
  variant?: Variant;
};

export function DateRangePicker({
  startDate,
  endDate,
  onApply,
  triggerLabel,
  fullWidth,
  variant = 'auto',
}: Props) {
  const theme = useTheme();
  const { t } = useTranslate('common');
  const mdUp = useMediaQuery(theme.breakpoints.up('md'));

  const isCalendarView = variant === 'calendar' || (variant === 'auto' && mdUp);

  const triggerRef = useRef<HTMLDivElement>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [navKey, setNavKey] = useState(0);

  const picker = useDateRangePicker({ startDate, endDate, onApply });

  const handlePresetClick = (preset: Parameters<typeof picker.onApplyPreset>[0]) => {
    picker.onApplyPreset(preset);
    setNavKey((k) => k + 1);
  };

  const formatted = formatDateRangeLabel(startDate, endDate);
  const label = formatted ?? triggerLabel ?? t('dateRange.placeholder');

  const handleOpen = () => {
    if (triggerRef.current) setAnchorEl(triggerRef.current);
    setNavKey((k) => k + 1);
    picker.onOpen();
  };

  const handleClose = () => {
    picker.onClose();
    setAnchorEl(null);
  };

  // Auto-commit when range complete (popover variant only — dialog has explicit Apply button).
  useEffect(() => {
    if (!isCalendarView || !picker.open) return;
    const { pendingStart, pendingEnd, error } = picker;
    if (!pendingStart || !pendingEnd || error) return;

    const nextStart = pendingStart.format('YYYY-MM-DD');
    const nextEnd = pendingEnd.format('YYYY-MM-DD');
    if (nextStart === startDate && nextEnd === endDate) return;

    onApply({ start: nextStart, end: nextEnd });
    setAnchorEl(null);
    picker.onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picker.pendingStart, picker.pendingEnd, isCalendarView]);

  return (
    <>
      <TextField
        ref={triggerRef}
        value={label}
        onClick={handleOpen}
        placeholder={t('dateRange.placeholder')}
        slotProps={{
          inputLabel: { shrink: true },
          input: {
            readOnly: true,
            endAdornment: (
              <InputAdornment position="end">
                <Iconify icon="solar:calendar-date-bold" />
              </InputAdornment>
            ),
            sx: { cursor: 'pointer' },
          },
          htmlInput: { sx: { cursor: 'pointer' } },
        }}
        sx={{
          ...(fullWidth ? { width: '100%' } : { minWidth: 260 }),
          '& .MuiInputBase-root': { cursor: 'pointer' },
        }}
      />

      {isCalendarView ? (
        <Popover
          open={picker.open}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          transitionDuration={{
            enter: theme.transitions.duration.shortest,
            exit: theme.transitions.duration.shortest - 80,
          }}
          slotProps={{
            paper: {
              sx: {
                mt: 0.75,
                borderRadius: 1.5,
                boxShadow: theme.vars.customShadows.dropdown,
                overflow: 'hidden',
              },
            },
          }}
        >
          <Box sx={{ display: 'flex' }}>
            <Stack
              spacing={0.5}
              sx={{
                p: 1.5,
                minWidth: 140,
                flexShrink: 0,
                borderRight: `1px dashed ${theme.vars.palette.divider}`,
              }}
            >
              {DATE_RANGE_PRESETS.map((preset) => {
                const active = picker.activePreset === preset;
                return (
                  <Button
                    key={preset}
                    size="small"
                    variant="soft"
                    color={active ? 'primary' : 'inherit'}
                    onClick={() => handlePresetClick(preset)}
                    sx={{
                      justifyContent: 'flex-start',
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    {t(`dateRange.presets.${preset}`)}
                  </Button>
                );
              })}
            </Stack>

            <Box sx={{ p: 1, flex: 1 }}>
              <Box
                onPointerLeave={() => picker.onDayHover(null)}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  [`& .${dateCalendarClasses.root}`]: { flex: 1 },
                }}
              >
                <DateCalendar
                  key={`left-${navKey}`}
                  defaultValue={picker.pendingStart}
                  onChange={picker.onDayClick}
                  slots={{ day: RangePickerDay }}
                  slotProps={{
                    day: {
                      start: picker.pendingStart,
                      end: picker.pendingEnd,
                      hovered: picker.hoveredDay,
                      onDayHover: picker.onDayHover,
                    } as Record<string, unknown>,
                  }}
                />
                <DateCalendar
                  key={`right-${navKey}`}
                  defaultValue={picker.pendingEnd ?? picker.pendingStart?.add(1, 'month') ?? null}
                  onChange={picker.onDayClick}
                  slots={{ day: RangePickerDay }}
                  slotProps={{
                    day: {
                      start: picker.pendingStart,
                      end: picker.pendingEnd,
                      hovered: picker.hoveredDay,
                      onDayHover: picker.onDayHover,
                    } as Record<string, unknown>,
                  }}
                />
              </Box>
              {picker.error && (
                <FormHelperText error sx={{ px: 1, pt: 0.5 }}>
                  {t('dateRange.errors.endBeforeStart')}
                </FormHelperText>
              )}
            </Box>
          </Box>
        </Popover>
      ) : (
        <Dialog
          open={picker.open}
          onClose={handleClose}
          fullWidth
          maxWidth="xs"
          transitionDuration={{
            enter: theme.transitions.duration.shortest,
            exit: theme.transitions.duration.shortest - 80,
          }}
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, pr: 2.5 }}>
            <Box sx={{ flex: 1 }}>{t('dateRange.title')}</Box>
            <IconButton size="small" onClick={handleClose}>
              <Iconify icon="mingcute:close-line" width={18} />
            </IconButton>
          </DialogTitle>

          <DialogContent dividers sx={{ p: 2 }}>
            <Stack spacing={2.5}>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {DATE_RANGE_PRESETS.map((preset) => {
                  const active = picker.activePreset === preset;
                  return (
                    <Chip
                      key={preset}
                      label={t(`dateRange.presets.${preset}`)}
                      size="small"
                      color={active ? 'primary' : 'default'}
                      variant={active ? 'filled' : 'outlined'}
                      onClick={() => picker.onApplyPreset(preset)}
                    />
                  );
                })}
              </Box>

              <Stack spacing={2}>
                <DatePicker
                  label={t('dateRange.startDate')}
                  value={picker.pendingStart}
                  onChange={picker.onChangeStart}
                  maxDate={picker.pendingEnd ?? undefined}
                  format="DD MMM YYYY"
                  slotProps={{ field: { clearable: true } }}
                />
                <DatePicker
                  label={t('dateRange.endDate')}
                  value={picker.pendingEnd}
                  onChange={picker.onChangeEnd}
                  minDate={picker.pendingStart ?? undefined}
                  format="DD MMM YYYY"
                  slotProps={{ field: { clearable: true } }}
                />
              </Stack>

              {picker.error && (
                <FormHelperText error>{t('dateRange.errors.endBeforeStart')}</FormHelperText>
              )}
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button color="inherit" onClick={picker.onReset}>
              {t('dateRange.actions.reset')}
            </Button>
            <Box sx={{ flex: 1 }} />
            <Button color="inherit" onClick={handleClose}>
              {t('actions.cancel')}
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                picker.onApply();
                setAnchorEl(null);
              }}
              disabled={picker.error || !picker.pendingStart || !picker.pendingEnd}
            >
              {t('dateRange.actions.apply')}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
