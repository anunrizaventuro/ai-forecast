'use client';

import 'dayjs/locale/id';

import type { Breakpoint } from '@mui/material/styles';

import { useBoolean } from 'minimal-shared/hooks';
import { isActiveLink } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

import { usePathname } from 'src/routes/hooks';

import { CONFIG } from 'src/global-config';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

import { MainSection } from '../core/main-section';
import { MenuButton } from '../components/menu-button';
import { LayoutSection } from '../core/layout-section';
import { HeaderSection } from '../core/header-section';
import { navDashboardData } from '../nav-config-dashboard';
import { NavDashboardMobile, NavDashboardDesktop } from './nav-dashboard';

// ----------------------------------------------------------------------

const IS_SIMULATION = CONFIG.forecastSource === 'simulasi';

export type DashboardLayoutProps = {
  children: React.ReactNode;
  layoutQuery?: Breakpoint;
};

export function DashboardLayout({ children, layoutQuery = 'lg' }: DashboardLayoutProps) {
  const pathname = usePathname();

  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();

  const navItems = navDashboardData.flatMap((group) => group.items);
  const currentTitle =
    navItems.find((item) => isActiveLink(pathname, item.path, false))?.title ?? 'AI Forecast';

  const renderHeader = () => (
    <HeaderSection
      layoutQuery={layoutQuery}
      disableElevation
      slotProps={{ container: { maxWidth: false } }}
      slots={{
        leftArea: (
          <>
            <MenuButton
              onClick={onOpen}
              sx={(theme) => ({
                mr: 1,
                ml: -1,
                [theme.breakpoints.up(layoutQuery)]: { display: 'none' },
              })}
            />
            <NavDashboardMobile data={navDashboardData} open={open} onClose={onClose} />
            <Typography variant="h6" component="p" noWrap sx={{ color: 'text.primary' }}>
              {currentTitle}
            </Typography>
          </>
        ),
        rightArea: (
          <Box sx={{ gap: 1, display: 'flex', alignItems: 'center' }}>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}
            >
              Periode inti 19 Agt – 30 Sep 2026
            </Typography>
            <Label
              color={IS_SIMULATION ? 'warning' : 'info'}
              variant="soft"
              startIcon={<Iconify icon="solar:info-circle-bold" />}
            >
              {IS_SIMULATION ? 'Simulasi' : 'Data asli · baseline'}
            </Label>
          </Box>
        ),
      }}
    />
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="id">
      <LayoutSection
        headerSection={renderHeader()}
        cssVars={{ '--layout-dashboard-nav-width': '280px' }}
        sx={(theme) => ({
          bgcolor: 'background.default',
          [theme.breakpoints.up(layoutQuery)]: { pl: 'var(--layout-dashboard-nav-width)' },
        })}
      >
        <NavDashboardDesktop
          data={navDashboardData}
          sx={(theme) => ({
            display: 'none',
            [theme.breakpoints.up(layoutQuery)]: { display: 'flex' },
          })}
        />

        <MainSection>
          <Container maxWidth="xl" sx={{ pt: { xs: 1, md: 2 }, pb: { xs: 6, md: 8 } }}>
            {children}
          </Container>
        </MainSection>
      </LayoutSection>
    </LocalizationProvider>
  );
}
