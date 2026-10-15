'use client';

import type { Theme, SxProps, CSSObject } from '@mui/material/styles';
import type { NavSectionProps } from 'src/components/nav-section';

import { useEffect } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';

import { paths } from 'src/routes/paths';
import { usePathname } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';
import { logoIconSrc } from 'src/components/logo';
import { Scrollbar } from 'src/components/scrollbar';
import { NavSectionVertical } from 'src/components/nav-section';

// ----------------------------------------------------------------------

const IS_SIMULATION = CONFIG.forecastSource === 'simulasi';

/** Colored sidebar: deep primary gradient with light text, shared by desktop + mobile. */
const navSurfaceSx = (theme: Theme): CSSObject => ({
  color: theme.vars.palette.common.white,
  backgroundColor: theme.vars.palette.primary.darker,
  backgroundImage: `linear-gradient(180deg, ${theme.vars.palette.primary.dark} 0%, ${theme.vars.palette.primary.darker} 100%)`,
});

const navItemCssVars = (theme: Theme) => {
  const white = theme.vars.palette.common.whiteChannel;

  return {
    '--nav-item-color': varAlpha(white, 0.72),
    '--nav-item-hover-bg': varAlpha(white, 0.08),
    '--nav-item-caption-color': varAlpha(white, 0.48),
    '--nav-item-root-active-color': theme.vars.palette.common.white,
    '--nav-item-root-active-bg': varAlpha(white, 0.16),
    '--nav-item-root-active-hover-bg': varAlpha(white, 0.24),
    '--nav-item-root-open-color': theme.vars.palette.common.white,
    '--nav-item-root-open-bg': varAlpha(white, 0.08),
    '--nav-item-sub-active-color': theme.vars.palette.common.white,
    '--nav-item-sub-active-bg': varAlpha(white, 0.08),
    '--nav-item-sub-open-color': theme.vars.palette.common.white,
    '--nav-item-sub-open-bg': varAlpha(white, 0.08),
    '--nav-subheader-color': varAlpha(white, 0.48),
    '--nav-subheader-hover-color': theme.vars.palette.common.white,
  };
};

type NavContentProps = {
  data: NavSectionProps['data'];
};

function NavContent({ data }: NavContentProps) {
  const theme = useTheme();

  return (
    <>
      <Box
        component={RouterLink}
        href={paths.dashboard.root}
        sx={{
          px: 2.5,
          pt: 3,
          pb: 2,
          gap: 1.5,
          display: 'flex',
          alignItems: 'center',
          color: 'common.white',
          textDecoration: 'none',
        }}
      >
        <Box
          component="img"
          alt=""
          src={logoIconSrc}
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: 1.25,
            boxShadow: `0 8px 16px ${varAlpha(theme.vars.palette.common.blackChannel, 0.24)}`,
          }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap>
            {CONFIG.appName}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: varAlpha(theme.vars.palette.common.whiteChannel, 0.64), display: 'block' }}
            noWrap
          >
            Distribusi Roti
          </Typography>
        </Box>
      </Box>

      <Scrollbar fillContent sx={{ flex: '1 1 auto' }}>
        <NavSectionVertical
          data={data}
          cssVars={navItemCssVars(theme)}
          sx={{ px: 2, flex: '1 1 auto' }}
        />
      </Scrollbar>

      <Box
        sx={{
          m: 2,
          p: 2,
          borderRadius: 1.5,
          bgcolor: varAlpha(theme.vars.palette.common.whiteChannel, 0.08),
          border: `dashed 1px ${varAlpha(theme.vars.palette.warning.mainChannel, 0.48)}`,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ mb: 0.5, gap: 0.75, display: 'flex', alignItems: 'center' }}
        >
          <Iconify icon="solar:info-circle-outline" width={18} sx={{ color: 'warning.light' }} />
          {IS_SIMULATION ? 'Mode simulasi' : 'Data asli (read-only)'}
        </Typography>
        <Typography
          variant="caption"
          sx={{ color: varAlpha(theme.vars.palette.common.whiteChannel, 0.72), display: 'block' }}
        >
          {IS_SIMULATION
            ? 'Data dan rekomendasi adalah simulasi. Backend belum terhubung.'
            : 'Rekomendasi masih aturan baseline — belum divalidasi lapangan.'}
        </Typography>
      </Box>
    </>
  );
}

// ----------------------------------------------------------------------

type NavDashboardDesktopProps = NavContentProps & {
  sx?: SxProps<Theme>;
};

export function NavDashboardDesktop({ data, sx }: NavDashboardDesktopProps) {
  return (
    <Box
      component="aside"
      sx={[
        (theme) => ({
          top: 0,
          left: 0,
          height: 1,
          position: 'fixed',
          flexDirection: 'column',
          width: 'var(--layout-dashboard-nav-width)',
          zIndex: 'var(--layout-nav-zIndex)',
          ...navSurfaceSx(theme),
          borderRight: 'none',
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <NavContent data={data} />
    </Box>
  );
}

// ----------------------------------------------------------------------

type NavDashboardMobileProps = NavContentProps & {
  open: boolean;
  onClose: () => void;
};

export function NavDashboardMobile({ data, open, onClose }: NavDashboardMobileProps) {
  const pathname = usePathname();

  useEffect(() => {
    if (open) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: (theme) => ({
            ...navSurfaceSx(theme),
            display: 'flex',
            flexDirection: 'column',
            width: 'var(--layout-dashboard-nav-width)',
          }),
        },
      }}
    >
      <NavContent data={data} />
    </Drawer>
  );
}
