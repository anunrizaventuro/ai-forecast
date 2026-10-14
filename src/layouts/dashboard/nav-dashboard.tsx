'use client';

import type { Theme, SxProps } from '@mui/material/styles';
import type { NavSectionProps } from 'src/components/nav-section';

import { useEffect } from 'react';
import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
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

type NavContentProps = {
  data: NavSectionProps['data'];
};

function NavContent({ data }: NavContentProps) {
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
          color: 'text.primary',
          textDecoration: 'none',
        }}
      >
        <Box
          component="img"
          alt=""
          src={logoIconSrc}
          sx={(theme) => ({
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: 1.25,
            boxShadow: `0 8px 16px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.24)}`,
          })}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" noWrap>
            {CONFIG.appName}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }} noWrap>
            Distribusi Roti
          </Typography>
        </Box>
      </Box>

      <Scrollbar fillContent sx={{ flex: '1 1 auto' }}>
        <NavSectionVertical data={data} sx={{ px: 2, flex: '1 1 auto' }} />
      </Scrollbar>

      <Box
        sx={(theme) => ({
          m: 2,
          p: 2,
          borderRadius: 1.5,
          bgcolor: varAlpha(theme.vars.palette.warning.mainChannel, 0.08),
          border: `dashed 1px ${varAlpha(theme.vars.palette.warning.mainChannel, 0.32)}`,
        })}
      >
        <Typography
          variant="subtitle2"
          sx={{ mb: 0.5, gap: 0.75, display: 'flex', alignItems: 'center' }}
        >
          <Iconify icon="solar:info-circle-outline" width={18} sx={{ color: 'warning.main' }} />
          Mode simulasi
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
          Data dan rekomendasi adalah simulasi. Backend belum terhubung.
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
          bgcolor: 'background.default',
          borderRight: `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.12)}`,
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
          sx: {
            display: 'flex',
            flexDirection: 'column',
            width: 'var(--layout-dashboard-nav-width)',
          },
        },
      }}
    >
      <NavContent data={data} />
    </Drawer>
  );
}
