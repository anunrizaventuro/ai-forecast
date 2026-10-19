import type { BoxProps } from '@mui/material/Box';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';

import { useTranslate } from 'src/locales';

// ----------------------------------------------------------------------

export function SignUpTerms({ sx, ...other }: BoxProps) {
  const { t } = useTranslate('auth');

  return (
    <Box
      component="span"
      sx={[
        () => ({
          mt: 3,
          display: 'block',
          textAlign: 'center',
          typography: 'caption',
          color: 'text.secondary',
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      {t('terms.prefix')}
      <Link underline="always" color="text.primary">
        {t('terms.service')}
      </Link>
      {t('terms.and')}
      <Link underline="always" color="text.primary">
        {t('terms.privacy')}
      </Link>
      .
    </Box>
  );
}
