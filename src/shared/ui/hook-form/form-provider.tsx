import type { UseFormReturn } from 'react-hook-form';
import type { Theme, SxProps } from '@mui/material/styles';

import { FormProvider as RHFForm } from 'react-hook-form';

import Box from '@mui/material/Box';

// ----------------------------------------------------------------------

export type FormProps = {
  onSubmit?: () => void;
  children: React.ReactNode;
  methods: UseFormReturn<any>;
  sx?: SxProps<Theme>;
};

export function Form({ children, onSubmit, methods, sx }: FormProps) {
  return (
    <RHFForm {...methods}>
      <Box component="form" onSubmit={onSubmit} noValidate autoComplete="off" sx={sx}>
        {children}
      </Box>
    </RHFForm>
  );
}
