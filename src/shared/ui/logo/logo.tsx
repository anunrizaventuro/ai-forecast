import type { LinkProps } from '@mui/material/Link';

import { mergeClasses } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import { styled } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/shared/config';

import { logoClasses } from './classes';

// ----------------------------------------------------------------------

// Ikon merek AI Forecast (public/assets/brand). Versi penuh = ikon + nama
// aplikasi sebagai teks, supaya ikut font & warna tema.
export const logoIconSrc = `${CONFIG.assetsDir}/assets/brand/ai-forecast-icon.svg`;

export type LogoProps = LinkProps & {
  isSingle?: boolean;
  disabled?: boolean;
};

export function Logo({
  sx,
  disabled,
  className,
  href = paths.dashboard.root,
  isSingle = true,
  ...other
}: LogoProps) {
  return (
    <LogoRoot
      component={RouterLink}
      href={href}
      aria-label={CONFIG.appName}
      underline="none"
      className={mergeClasses([logoClasses.root, className])}
      sx={[
        {
          width: 'auto',
          height: 24,
          ...(isSingle && { width: 40, height: 40 }),
          ...(disabled && { pointerEvents: 'none' }),
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box
        component="img"
        alt=""
        src={logoIconSrc}
        sx={{ height: '100%', width: 'auto', aspectRatio: '1 / 1', objectFit: 'contain' }}
      />
      {!isSingle && (
        <Box
          component="span"
          sx={{
            ml: 1,
            typography: 'h6',
            lineHeight: 1,
            whiteSpace: 'nowrap',
            color: 'inherit',
          }}
        >
          {CONFIG.appName}
        </Box>
      )}
    </LogoRoot>
  );
}

// ----------------------------------------------------------------------

const LogoRoot = styled(Link)(({ theme }) => ({
  flexShrink: 0,
  color: theme.vars.palette.text.primary,
  display: 'inline-flex',
  alignItems: 'center',
  verticalAlign: 'middle',
}));
