import type { Theme, SxProps } from '@mui/material/styles';

import { Controller, useFormContext } from 'react-hook-form';

import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

// ----------------------------------------------------------------------
// Input bilangan bulat untuk parameter rekomendasi (form RHF). Kosong →
// `undefined` sehingga zod melaporkan "Wajib diisi"; satuan tampil di ujung.

type Props = {
  name: string;
  min: number;
  max: number;
  unit?: string;
  disabled?: boolean;
  helperText?: React.ReactNode;
  sx?: SxProps<Theme>;
};

export function ParamNumberField({ name, min, max, unit, disabled, helperText, sx }: Props) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <TextField
          size="small"
          type="number"
          name={field.name}
          inputRef={field.ref}
          value={typeof field.value === 'number' && !Number.isNaN(field.value) ? field.value : ''}
          onChange={(event) => {
            const raw = event.target.value;
            field.onChange(raw === '' ? undefined : Number(raw));
          }}
          onBlur={field.onBlur}
          disabled={disabled}
          error={!!error}
          helperText={error?.message ?? helperText}
          sx={sx}
          slotProps={{
            htmlInput: { min, max, step: 1, inputMode: 'numeric' },
            input: unit
              ? { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> }
              : undefined,
          }}
        />
      )}
    />
  );
}
