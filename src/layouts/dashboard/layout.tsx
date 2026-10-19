import type { Breakpoint } from '@mui/material/styles';
import type { NavItemProps, NavSectionProps } from 'src/shared/ui/nav-section';
import type { MainSectionProps, HeaderSectionProps, LayoutSectionProps } from '../core';

import { merge } from 'es-toolkit';
import { useBoolean } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import { useTheme } from '@mui/material/styles';
import { iconButtonClasses } from '@mui/material/IconButton';

// import { allLangs } from 'src/locales';
import { BrandLogo } from 'src/shared/ui/logo';
import { useAuthContext } from 'src/module/core/features/auth/hooks';
import { useSettingsContext } from 'src/module/core/features/settings';

import { NavMobile } from './nav-mobile';
import { VerticalDivider } from './content';
import { NavVertical } from './nav-vertical';
import { NavHorizontal } from './nav-horizontal';
import { Searchbar } from '../components/searchbar';
import { useNavData } from '../nav-config-dashboard';
import { MenuButton } from '../components/menu-button';
import { AccountDrawer } from '../components/account-drawer';
// import { LanguagePopover } from '../components/language-popover';
import { HeaderBreadcrumbs } from '../components/header-breadcrumbs';
// import { WorkspacesPopover } from '../components/workspaces-popover';
import { dashboardLayoutVars, dashboardNavColorVars } from './css-vars';
import { MainSection, layoutClasses, HeaderSection, LayoutSection } from '../core';

// ----------------------------------------------------------------------

type LayoutBaseProps = Pick<LayoutSectionProps, 'sx' | 'children' | 'cssVars'>;

export type DashboardLayoutProps = LayoutBaseProps & {
  layoutQuery?: Breakpoint;
  slotProps?: {
    header?: HeaderSectionProps;
    nav?: {
      data?: NavSectionProps['data'];
    };
    main?: MainSectionProps;
  };
};

export function DashboardLayout({
  sx,
  cssVars,
  children,
  slotProps,
  layoutQuery = 'lg',
}: DashboardLayoutProps) {
  const theme = useTheme();

  const { roles, company, authenticated } = useAuthContext();

  const settings = useSettingsContext();

  const navVars = dashboardNavColorVars(theme, settings.state.navColor, settings.state.navLayout);

  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();

  const dashboardNavData = useNavData();
  const navData = slotProps?.nav?.data ?? dashboardNavData;

  const isNavMini = settings.state.navLayout === 'mini';
  const isNavHorizontal = settings.state.navLayout === 'horizontal';
  const isNavVertical = isNavMini || settings.state.navLayout === 'vertical';

  const canDisplayItemByRole = (allowedRoles: NavItemProps['allowedRoles']): boolean =>
    !allowedRoles || allowedRoles.length === 0 || roles.some((r) => allowedRoles.includes(r));

  const renderHeader = () => {
    const headerSlotProps: HeaderSectionProps['slotProps'] = {
      container: {
        maxWidth: false,
        sx: {
          ...(isNavVertical && {
            px: { [layoutQuery]: 5 },
            borderBottomStyle: 'dashed',
            borderBottomWidth: 1,
            borderBottomColor: 'divider',
          }),
          ...(isNavHorizontal && {
            bgcolor: 'var(--layout-nav-bg)',
            height: { [layoutQuery]: 'var(--layout-nav-horizontal-height)' },
            [`& .${iconButtonClasses.root}`]: { color: 'var(--layout-nav-text-secondary-color)' },
          }),
        },
      },
    };

    const headerSlots: HeaderSectionProps['slots'] = {
      topArea: (
        <Alert severity="info" sx={{ display: 'none', borderRadius: 0 }}>
          This is an info Alert.
        </Alert>
      ),
      bottomArea: isNavHorizontal ? (
        <NavHorizontal
          data={navData}
          layoutQuery={layoutQuery}
          cssVars={navVars.section}
          checkPermissions={canDisplayItemByRole}
        />
      ) : null,
      leftArea: (
        <>
          {/** @slot Nav mobile */}
          <MenuButton
            onClick={onOpen}
            sx={{ mr: 1, ml: -1, [theme.breakpoints.up(layoutQuery)]: { display: 'none' } }}
          />
          <NavMobile
            data={navData}
            open={open}
            onClose={onClose}
            cssVars={navVars.section}
            checkPermissions={canDisplayItemByRole}
            slots={{ bottomArea: renderNavAccountFooter(false) }}
          />

          {/** @slot Logo */}
          {isNavHorizontal && (
            <BrandLogo
              sx={{
                display: 'none',
                [theme.breakpoints.up(layoutQuery)]: { display: 'inline-flex' },
              }}
            />
          )}

          {/** @slot Logo (mobile only — desktop uses sidebar logo) */}
          {!isNavHorizontal && (
            <BrandLogo
              sx={{
                [theme.breakpoints.up(layoutQuery)]: { display: 'none' },
              }}
            />
          )}

          {/** @slot Divider */}
          {isNavHorizontal && (
            <VerticalDivider sx={{ [theme.breakpoints.up(layoutQuery)]: { display: 'flex' } }} />
          )}

          {/** @slot Workspace popover */}
          {/* <WorkspacesPopover
            sx={{ ...(isNavHorizontal && { color: 'var(--layout-nav-text-primary-color)' }) }}
          /> */}

          {/** @slot Breadcrumbs (derived from nav data) */}
          <VerticalDivider sx={{ display: 'none' }} />
          <HeaderBreadcrumbs data={navData} sx={{ display: 'none' }} />
        </>
      ),
      rightArea: (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0, sm: 0.75 } }}>
          {/** @slot Searchbar — hidden but mounted (keeps Cmd+K binding wired) */}
          <Box sx={{ display: 'none' }}>
            <Searchbar data={navData} />
          </Box>

          {/** @slot Language popover */}
          {/* <LanguagePopover data={allLangs} /> */}

          {/** @slot Notifications popover */}
          {/* <NotificationsDrawer data={_notifications} /> */}

          {/** @slot Contacts popover */}
          {/* <ContactsPopover data={_contacts} /> */}
        </Box>
      ),
    };

    return (
      <HeaderSection
        layoutQuery={layoutQuery}
        disableElevation={isNavVertical}
        {...slotProps?.header}
        slots={{ ...headerSlots, ...slotProps?.header?.slots }}
        slotProps={merge(headerSlotProps, slotProps?.header?.slotProps ?? {})}
        sx={[
          { [theme.breakpoints.up(layoutQuery)]: { display: 'none' } },
          ...(Array.isArray(slotProps?.header?.sx)
            ? slotProps.header.sx
            : slotProps?.header?.sx
              ? [slotProps.header.sx]
              : []),
        ]}
      />
    );
  };

  const renderNavAccountFooter = (compact: boolean) => (
    <Box
      sx={(t) => ({
        mt: 'auto',
        px: compact ? 1 : 2,
        py: 2,
        display: 'flex',
        alignItems: 'center',
        flexDirection: compact ? 'column' : 'row',
        justifyContent: compact ? 'center' : 'space-between',
        gap: 1,
        borderTop: `dashed 1px ${t.vars.palette.divider}`,
      })}
    >
      <AccountDrawer compact={compact} />
    </Box>
  );

  const renderSidebar = () => (
    <NavVertical
      data={navData}
      isNavMini={isNavMini}
      layoutQuery={layoutQuery}
      cssVars={navVars.section}
      checkPermissions={canDisplayItemByRole}
      slots={{ bottomArea: renderNavAccountFooter(isNavMini) }}
      onToggleNav={() =>
        settings.setField(
          'navLayout',
          settings.state.navLayout === 'vertical' ? 'mini' : 'vertical'
        )
      }
    />
  );

  const renderFooter = () => null;

  const shouldBlankOutContent = authenticated && !company;

  const renderMain = () => (
    <MainSection {...slotProps?.main}>{shouldBlankOutContent ? null : children}</MainSection>
  );

  return (
    <LayoutSection
      /** **************************************
       * @Header
       *************************************** */
      headerSection={renderHeader()}
      /** **************************************
       * @Sidebar
       *************************************** */
      sidebarSection={isNavHorizontal ? null : renderSidebar()}
      /** **************************************
       * @Footer
       *************************************** */
      footerSection={renderFooter()}
      /** **************************************
       * @Styles
       *************************************** */
      cssVars={{ ...dashboardLayoutVars(theme), ...navVars.layout, ...cssVars }}
      sx={[
        {
          [`& .${layoutClasses.sidebarContainer}`]: {
            [theme.breakpoints.up(layoutQuery)]: {
              pl: isNavMini ? 'var(--layout-nav-mini-width)' : 'var(--layout-nav-vertical-width)',
              transition: theme.transitions.create(['padding-left'], {
                easing: 'var(--layout-transition-easing)',
                duration: 'var(--layout-transition-duration)',
              }),
            },
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {renderMain()}
    </LayoutSection>
  );
}
