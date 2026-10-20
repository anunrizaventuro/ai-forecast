import type { Dayjs } from 'dayjs';
import type { ProductCode, ForecastFilters } from 'src/module/forecast/shared/types';

import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { Iconify } from 'src/shared/ui/iconify';
import { addDays } from 'src/module/forecast/shared/utils';
import { DateRangePicker } from 'src/shared/ui/date-range-picker';
import { useDataPeriod, useForecastMeta } from 'src/module/forecast/shared/hooks';

import { SECTION_GAP } from './forecast-layout';

// ----------------------------------------------------------------------
// Satu baris filter di atas konten yang dicakupnya. Mode tanggal:
// - 'range' → DateRangePicker skeleton dengan preset terikat periode data
// - 'asOf'  → satu tanggal acuan (data s.d. tanggal; dipakai rekomendasi)

type DateMode = 'range' | 'asOf' | 'none';

type Props = {
  filters: ForecastFilters;
  onChange: (patch: Partial<ForecastFilters>) => void;
  dateMode?: DateMode;
  showStore?: boolean;
  showProduct?: boolean;
  children?: React.ReactNode;
};

// Preset terikat periode data (bukan dihitung dari hari ini).
function presetsFor(period: { start: string; end: string }) {
  const clamp = (tgl: string) => (tgl < period.start ? period.start : tgl);
  const monthStart = dayjs(period.end).startOf('month').format('YYYY-MM-DD');
  return [
    { label: 'Seluruh data', start: period.start, end: period.end },
    { label: '30 hari terakhir', start: clamp(addDays(period.end, -29)), end: period.end },
    { label: '14 hari terakhir', start: clamp(addDays(period.end, -13)), end: period.end },
    { label: '7 hari terakhir', start: clamp(addDays(period.end, -6)), end: period.end },
    {
      label: dayjs(period.end).locale('id').format('MMMM YYYY'),
      start: clamp(monthStart),
      end: period.end,
    },
  ];
}

const toValue = (value: Dayjs | null) =>
  value && value.isValid() ? value.format('YYYY-MM-DD') : null;

const FIELD_SX = { minWidth: { xs: 1, sm: 150 }, flex: { xs: '1 1 100%', sm: '1 1 150px' } };

export function ForecastFilterBar({
  filters,
  onChange,
  dateMode = 'range',
  showStore = true,
  showProduct = true,
  children,
}: Props) {
  const { meta, storeMap } = useForecastMeta();
  const period = useDataPeriod();

  const isDirty =
    filters.nit !== null ||
    filters.product !== null ||
    (dateMode !== 'none' && (filters.from !== period.start || filters.to !== period.end));

  return (
    <Card sx={{ p: 2, mb: SECTION_GAP }}>
      <Box sx={{ gap: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
        {dateMode === 'range' && (
          <Box sx={{ ...FIELD_SX, flex: { xs: '1 1 100%', sm: '2 1 260px' } }}>
            <DateRangePicker
              fullWidth
              startDate={filters.from}
              endDate={filters.to}
              presets={presetsFor(period)}
              minDate={period.start}
              maxDate={period.end}
              onApply={({ start, end }) => onChange({ from: start, to: end })}
            />
          </Box>
        )}

        {dateMode === 'asOf' && (
          <DatePicker
            label="Data s.d. tanggal"
            value={dayjs(filters.to)}
            minDate={dayjs(period.start)}
            maxDate={dayjs(period.end)}
            format="D MMM YYYY"
            onChange={(value) => {
              const next = toValue(value);
              if (next) onChange({ to: next });
            }}
            slotProps={{ textField: { size: 'small', fullWidth: false, sx: FIELD_SX } }}
          />
        )}

        {showStore && (
          <Autocomplete
            size="small"
            options={meta.stores.map((s) => s.nit)}
            value={filters.nit}
            onChange={(_, value) => onChange({ nit: value })}
            getOptionLabel={(nit) => `${nit} · ${storeMap.get(nit)?.nama ?? ''}`}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Toko"
                placeholder="Semua toko"
                slotProps={{ inputLabel: { ...params.InputLabelProps, shrink: true } }}
              />
            )}
            noOptionsText="Toko tidak ditemukan"
            sx={{ ...FIELD_SX, flex: { xs: '1 1 100%', sm: '2 1 220px' } }}
          />
        )}

        {showProduct && (
          <TextField
            select
            size="small"
            label="Produk"
            value={filters.product ?? ''}
            onChange={(event) =>
              onChange({ product: (event.target.value || null) as ProductCode | null })
            }
            slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
            sx={FIELD_SX}
          >
            <MenuItem value="">Semua produk</MenuItem>
            {meta.products.map((p) => (
              <MenuItem key={p.code} value={p.code}>
                {p.code}
                {p.nama !== p.code && (
                  <Box component="span" sx={{ ml: 1, color: 'text.disabled' }}>
                    ({p.nama})
                  </Box>
                )}
              </MenuItem>
            ))}
          </TextField>
        )}

        {children}

        {isDirty && (
          <Button
            color="inherit"
            onClick={() =>
              onChange({
                nit: null,
                product: null,
                ...(dateMode !== 'none' && { from: period.start, to: period.end }),
              })
            }
            startIcon={<Iconify icon="solar:restart-bold" width={18} />}
          >
            Reset
          </Button>
        )}
      </Box>
    </Card>
  );
}
