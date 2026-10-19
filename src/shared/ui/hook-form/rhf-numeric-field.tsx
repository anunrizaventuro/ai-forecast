import { Controller, useFormContext } from 'react-hook-form';

import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

// ----------------------------------------------------------------------
// Numeric field with Indonesian thousand-separator display.
// Value stored as raw number; displayed as `20.000`.
// Integer-only (strips non-digits on input) — suitable for IDR amounts
// and exchange rates.
// ----------------------------------------------------------------------

type Props = {
  name: string;
  label?: string;
  disabled?: boolean;
  helperText?: string;
  prefix?: string;
  size?: 'small' | 'medium';
  placeholder?: string;
};

const formatter = new Intl.NumberFormat('id-ID');

export function RHFNumericField({
  name,
  label,
  disabled,
  helperText,
  prefix,
  size,
  placeholder,
}: Props) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        const numericValue = typeof field.value === 'number' ? field.value : 0;
        const display = numericValue ? formatter.format(numericValue) : '';

        return (
          <TextField
            fullWidth
            label={label}
            placeholder={placeholder}
            size={size}
            value={display}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, '');
              field.onChange(raw ? Number(raw) : 0);
            }}
            onBlur={field.onBlur}
            disabled={disabled}
            error={!!error}
            helperText={error?.message ?? helperText}
            slotProps={{
              inputLabel: label ? { shrink: true } : undefined,
              htmlInput: { inputMode: 'numeric', autoComplete: 'off' },
              input: prefix
                ? {
                    startAdornment: <InputAdornment position="start">{prefix}</InputAdornment>,
                  }
                : undefined,
            }}
          />
        );
      }}
    />
  );
}
