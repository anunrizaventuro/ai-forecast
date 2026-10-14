'use client';

import type { Dayjs } from 'dayjs';
import type { ProductCode } from 'src/types/forecast';
import type { ForecastFilters } from './forecast-utils';

import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { Iconify } from 'src/components/iconify';

import { useForecastMeta } from './use-forecast-data';
import { PERIOD, addDays, DEFAULT_FILTERS } from './forecast-utils';

// ----------------------------------------------------------------------
// Satu baris filter di atas konten yang dicakupnya. Mode tanggal:
// - 'range' → rentang dari–sampai + preset
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

const PRESETS = [
  { value: 'all', label: 'Periode inti', from: PERIOD.start, to: PERIOD.end },
  { value: '14d', label: '14 hari terakhir', from: addDays(PERIOD.end, -13), to: PERIOD.end },
  { value: '7d', label: '7 hari terakhir', from: addDays(PERIOD.end, -6), to: PERIOD.end },
  { value: 'sep', label: 'September 2026', from: '2026-09-01', to: PERIOD.end },
  { value: 'aug', label: 'Agustus 2026 (19–31)', from: PERIOD.start, to: '2026-08-31' },
];

const MIN_DATE = dayjs(PERIOD.start);
const MAX_DATE = dayjs(PERIOD.end);

const toValue = (value: Dayjs | null) =>
  value && value.isValid() ? value.format('YYYY-MM-DD') : null;

const FIELD_SX = { minWidth: { xs: 1, sm: 180 }, flex: { xs: '1 1 100%', sm: '0 1 auto' } };

export function ForecastFilterBar({
  filters,
  onChange,
  dateMode = 'range',
  showStore = true,
  showProduct = true,
  children,
}: Props) {
  const { meta, storeMap } = useForecastMeta();

  const preset =
    PRESETS.find((p) => p.from === filters.from && p.to === filters.to)?.value ?? 'custom';

  const isDirty =
    filters.nit !== null ||
    filters.product !== null ||
    (dateMode !== 'none' && (filters.from !== PERIOD.start || filters.to !== PERIOD.end));

  return (
    <Card sx={{ p: 2, mb: 3 }}>
      <Box sx={{ gap: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
        {dateMode === 'range' && (
          <>
            <TextField
              select
              size="small"
              label="Rentang"
              value={preset}
              onChange={(event) => {
                const next = PRESETS.find((p) => p.value === event.target.value);
                if (next) onChange({ from: next.from, to: next.to });
              }}
              sx={FIELD_SX}
            >
              {PRESETS.map((p) => (
                <MenuItem key={p.value} value={p.value}>
                  {p.label}
                </MenuItem>
              ))}
              <MenuItem value="custom" disabled>
                Kustom
              </MenuItem>
            </TextField>

            <DatePicker
              label="Dari"
              value={dayjs(filters.from)}
              minDate={MIN_DATE}
              maxDate={dayjs(filters.to)}
              format="D MMM YYYY"
              onChange={(value) => {
                const next = toValue(value);
                if (next) onChange({ from: next });
              }}
              slotProps={{ textField: { size: 'small', fullWidth: false, sx: FIELD_SX } }}
            />

            <DatePicker
              label="Sampai"
              value={dayjs(filters.to)}
              minDate={dayjs(filters.from)}
              maxDate={MAX_DATE}
              format="D MMM YYYY"
              onChange={(value) => {
                const next = toValue(value);
                if (next) onChange({ to: next });
              }}
              slotProps={{ textField: { size: 'small', fullWidth: false, sx: FIELD_SX } }}
            />
          </>
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
              <TextField {...params} label="Toko" placeholder="Semua toko" />
            )}
            noOptionsText="Toko tidak ditemukan"
            sx={{ ...FIELD_SX, minWidth: { xs: 1, sm: 240 } }}
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
