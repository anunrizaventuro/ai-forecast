import type { Breakpoint } from '@mui/material/styles';
import type { NavSectionProps } from 'src/shared/ui/nav-section';

import { varAlpha, mergeClasses } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';

import { BrandLogo } from 'src/shared/ui/logo';
import { Scrollbar } from 'src/shared/ui/scrollbar';
import { NavSectionMini, NavSectionVertical } from 'src/shared/ui/nav-section';

import { layoutClasses } from '../core';
import { NavToggleButton } from '../components/nav-toggle-button';
import { WorkspacesPopover } from '../components/workspaces-popover';

// ----------------------------------------------------------------------

export type NavVerticalProps = React.ComponentProps<'div'> &
  NavSectionProps & {
    isNavMini: boolean;
    layoutQuery?: Breakpoint;
    onToggleNav: () => void;
    slots?: {
      topArea?: React.ReactNode;
      bottomArea?: React.ReactNode;
    };
  };

export function NavVertical({
  sx,
  data,
  slots,
  cssVars,
  className,
  isNavMini,
  onToggleNav,
  checkPermissions,
  layoutQuery = 'md',
  ...other
}: NavVerticalProps) {
  const renderNavVertical = () => (
    <>
      {slots?.topArea ?? (
        <Box sx={{ pl: 3.5, pt: 2.5, pb: 2 }}>
          <BrandLogo />
        </Box>
      )}

      <Box sx={{ px: 2.5, pb: 2 }}>
        <WorkspacesPopover
          sx={{
            px: 1.5,
            py: 1.25,
            width: '100%',
            borderRadius: 1,
            justifyContent: 'flex-start',
            border: (theme) => `1px solid ${varAlpha(theme.vars.palette.grey['500Channel'], 0.2)}`,
            '&:hover': { bgcolor: 'action.hover' },
            '&::before': { display: 'none' },
          }}
        />
      </Box>

      <Scrollbar fillContent>
        <NavSectionVertical
          data={data}
          cssVars={cssVars}
          checkPermissions={checkPermissions}
          sx={{ px: 2, flex: '1 1 auto' }}
        />

        {slots?.bottomArea}
      </Scrollbar>
    </>
  );

  const renderNavMini = () => (
    <>
      {slots?.topArea ?? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2.5 }}>
          <BrandLogo isSingle />
        </Box>
      )}

      <NavSectionMini
        data={data}
        cssVars={cssVars}
        checkPermissions={checkPermissions}
        sx={[
          (theme) => ({
            ...theme.mixins.hideScrollY,
            pb: 2,
            px: 0.5,
            flex: '1 1 auto',
            overflowY: 'auto',
          }),
        ]}
      />

      {slots?.bottomArea}
    </>
  );

  return (
    <NavRoot
      isNavMini={isNavMini}
      layoutQuery={layoutQuery}
      className={mergeClasses([layoutClasses.nav.root, layoutClasses.nav.vertical, className])}
      sx={sx}
      {...other}
    >
      <NavToggleButton
        isNavMini={isNavMini}
        onClick={onToggleNav}
        sx={[
          (theme) => ({
            display: 'none',
            [theme.breakpoints.up(layoutQuery)]: { display: 'inline-flex' },
          }),
        ]}
      />
      {isNavMini ? renderNavMini() : renderNavVertical()}
    </NavRoot>
  );
}

// ----------------------------------------------------------------------

const NavRoot = styled('div', {
  shouldForwardProp: (prop: string) => !['isNavMini', 'layoutQuery', 'sx'].includes(prop),
})<Pick<NavVerticalProps, 'isNavMini' | 'layoutQuery'>>(
  ({ isNavMini, layoutQuery = 'md', theme }) => ({
    top: 0,
    left: 0,
    height: '100%',
    display: 'none',
    position: 'fixed',
    flexDirection: 'column',
    zIndex: 'var(--layout-nav-zIndex)',
    backgroundColor: 'var(--layout-nav-bg)',
    width: isNavMini ? 'var(--layout-nav-mini-width)' : 'var(--layout-nav-vertical-width)',
    borderRight: `1px solid var(--layout-nav-border-color, ${varAlpha(theme.vars.palette.grey['500Channel'], 0.12)})`,
    transition: theme.transitions.create(['width'], {
      easing: 'var(--layout-transition-easing)',
      duration: 'var(--layout-transition-duration)',
    }),
    [theme.breakpoints.up(layoutQuery)]: { display: 'flex' },
  })
);
