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
import { DateRangePicker } from 'src/shared/ui/date-range-picker';
import { useForecastMeta } from 'src/module/forecast/shared/hooks';
import { PERIOD, addDays, DEFAULT_FILTERS } from 'src/module/forecast/shared/utils';

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
const PRESETS = [
  { label: 'Periode inti', start: PERIOD.start, end: PERIOD.end },
  { label: '14 hari terakhir', start: addDays(PERIOD.end, -13), end: PERIOD.end },
  { label: '7 hari terakhir', start: addDays(PERIOD.end, -6), end: PERIOD.end },
  { label: 'September 2026', start: '2026-09-01', end: PERIOD.end },
  { label: 'Agustus 2026 (19–31)', start: PERIOD.start, end: '2026-08-31' },
];

const MIN_DATE = dayjs(PERIOD.start);
const MAX_DATE = dayjs(PERIOD.end);

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

  const isDirty =
    filters.nit !== null ||
    filters.product !== null ||
    (dateMode !== 'none' && (filters.from !== PERIOD.start || filters.to !== PERIOD.end));

  return (
    <Card sx={{ p: 2, mb: SECTION_GAP }}>
      <Box sx={{ gap: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
        {dateMode === 'range' && (
          <Box sx={{ ...FIELD_SX, flex: { xs: '1 1 100%', sm: '2 1 260px' } }}>
            <DateRangePicker
              fullWidth
              startDate={filters.from}
              endDate={filters.to}
              presets={PRESETS}
              minDate={PERIOD.start}
              maxDate={PERIOD.end}
              onApply={({ start, end }) => onChange({ from: start, to: end })}
            />
          </Box>
        )}

        {dateMode === 'asOf' && (
          <DatePicker
            label="Data s.d. tanggal"
            value={dayjs(filters.to)}
            minDate={MIN_DATE}
            maxDate={MAX_DATE}
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
                ...(dateMode !== 'none' && { from: DEFAULT_FILTERS.from, to: DEFAULT_FILTERS.to }),
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
