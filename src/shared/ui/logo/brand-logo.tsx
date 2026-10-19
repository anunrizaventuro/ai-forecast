import type { LogoProps } from './logo';

import { Logo } from './logo';

// ----------------------------------------------------------------------

export type BrandLogoProps = LogoProps;

/** Logo merek di shell aplikasi: ikon AI Forecast + nama (atau ikon saja bila `isSingle`). */
export function BrandLogo({ isSingle = false, sx, ...other }: BrandLogoProps) {
  return (
    <Logo
      isSingle={isSingle}
      sx={[{ height: isSingle ? 32 : 36 }, ...(Array.isArray(sx) ? sx : [sx])]}
      {...other}
    />
  );
}
