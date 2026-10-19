import type { IconButtonProps } from '@mui/material/IconButton';

import { useBoolean } from 'minimal-shared/hooks';
import { useRef, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import Menu from '@mui/material/Menu';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Popover from '@mui/material/Popover';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import ButtonBase from '@mui/material/ButtonBase';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { useTranslate } from 'src/locales';
import { Iconify } from 'src/shared/ui/iconify';
import { PERM } from 'src/shared/lib/permissions';
import { Scrollbar } from 'src/shared/ui/scrollbar';
import { AnimateBorder } from 'src/shared/ui/animate';
import { ConfirmDialog } from 'src/shared/ui/confirm-dialog';
import { useAuthContext } from 'src/module/core/features/auth/hooks';
import { useSettingsContext } from 'src/module/core/features/settings';
import { usePermission } from 'src/module/core/features/auth/hooks/use-permission';

// ----------------------------------------------------------------------

const SETTINGS_ICONS = {
  branches: 'mingcute:location-fill',
  roles: 'solar:shield-keyhole-bold-duotone',
  users: 'solar:users-group-rounded-bold-duotone',
  translationOverride: 'solar:chat-round-dots-bold',
} as const;

type SettingsKey = keyof typeof SETTINGS_ICONS;

export type AccountDrawerProps = IconButtonProps & {
  compact?: boolean;
};

export function AccountDrawer({ compact, sx, ...other }: AccountDrawerProps) {
  const router = useRouter();
  const settings = useSettingsContext();
  const { user, signOut } = useAuthContext();
  const { can } = usePermission();
  const { t } = useTranslate('navigation');

  const settingsItems = (
    [
      { key: 'branches', path: paths.dashboard.settings.branches, perm: PERM.branches.read },
      { key: 'roles', path: paths.dashboard.settings.roles, perm: PERM.roles.read },
      { key: 'users', path: paths.dashboard.settings.users, perm: PERM.userManagement.read },
      {
        key: 'translationOverride',
        path: paths.dashboard.settings.translationOverride,
        perm: PERM.translationOverrides.read,
      },
    ] satisfies { key: SettingsKey; path: string; perm: string }[]
  ).filter((it) => can(it.perm));

  const displayName = user?.full_name || user?.username || '';
  const email = user?.email ?? '';

  const { value: drawerOpen, onFalse: onCloseDrawer, onTrue: onOpenDrawer } = useBoolean();
  const {
    value: logoutConfirmOpen,
    onFalse: onCloseLogoutConfirm,
    onTrue: onOpenLogoutConfirm,
  } = useBoolean();
  const { value: loggingOut, onFalse: stopLoggingOut, onTrue: startLoggingOut } = useBoolean();

  const rowRef = useRef<HTMLDivElement>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const openMenu = () => {
    setMenuAnchor(rowRef.current);
    setMenuOpen(true);
  };
  const closeMenu = () => setMenuOpen(false);

  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const openNotif = (e: React.MouseEvent<HTMLElement>) => {
    setNotifAnchor(e.currentTarget);
    setNotifOpen(true);
  };
  const closeNotif = () => setNotifOpen(false);

  const [profileHovered, setProfileHovered] = useState(false);
  const showCaret = profileHovered || menuOpen;
  const caretIcon = menuOpen ? 'eva:chevron-down-fill' : 'eva:arrow-ios-upward-fill';
  const rightIcon = showCaret ? caretIcon : 'solar:bell-bing-bold-duotone';

  const handleProfile = () => {
    closeMenu();
    onOpenDrawer();
  };

  const handleTheme = () => {
    closeMenu();
    settings.onToggleDrawer();
  };

  const handleNavigate = (path: string) => {
    closeMenu();
    router.push(path);
  };

  const handleLogout = () => {
    closeMenu();
    onOpenLogoutConfirm();
  };

  const handleConfirmLogout = useCallback(async () => {
    startLoggingOut();
    try {
      await signOut();
      onCloseLogoutConfirm();
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      stopLoggingOut();
    }
  }, [signOut, router, startLoggingOut, stopLoggingOut, onCloseLogoutConfirm]);

  return (
    <>
      <Box
        ref={rowRef}
        sx={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
        }}
      >
        <ButtonBase
          aria-label="Account menu"
          onClick={openMenu}
          onMouseEnter={() => setProfileHovered(true)}
          onMouseLeave={() => setProfileHovered(false)}
          sx={[
            {
              flexGrow: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              px: compact ? 0 : 1,
              py: compact ? 0 : 0.75,
              borderRadius: 1,
              justifyContent: compact ? 'center' : 'flex-start',
              minWidth: 0,
              '&:hover': { bgcolor: 'action.hover' },
              transition: (theme) => theme.transitions.create('background-color'),
            },
            ...(Array.isArray(sx) ? sx : [sx]),
          ]}
          {...(other as React.ComponentProps<typeof ButtonBase>)}
        >
          <Avatar
            alt={displayName}
            sx={{
              width: 40,
              height: 40,
              fontSize: 16,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              flexShrink: 0,
            }}
          >
            {displayName?.charAt(0).toUpperCase()}
          </Avatar>

          {!compact && (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                lineHeight: 1.2,
                minWidth: 0,
                flexGrow: 1,
              }}
            >
              <Typography variant="subtitle2" noWrap sx={{ maxWidth: '100%' }}>
                {displayName}
              </Typography>
              <Typography
                variant="caption"
                noWrap
                sx={{ color: 'text.secondary', maxWidth: '100%' }}
              >
                {email}
              </Typography>
            </Box>
          )}
        </ButtonBase>

        {!compact && (
          <IconButton
            aria-label="Notifications"
            onClick={openNotif}
            sx={{
              width: 36,
              height: 36,
              flexShrink: 0,
              color: 'text.secondary',
              transition: (theme) =>
                theme.transitions.create(['color', 'background-color'], {
                  duration: theme.transitions.duration.shortest,
                }),
              '&:hover': { color: 'text.primary' },
            }}
          >
            <Iconify icon={rightIcon} width={20} />
          </IconButton>
        )}
      </Box>

      <Menu
        anchorEl={menuAnchor}
        open={menuOpen && Boolean(menuAnchor)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: -22, horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          transition: { onExited: () => setMenuAnchor(null) },
          paper: {
            sx: {
              width: menuAnchor ? menuAnchor.getBoundingClientRect().width : undefined,
              minWidth: 220,
            },
          },
        }}
      >
        <MenuItem onClick={handleProfile} sx={{ gap: 1 }}>
          <Iconify icon="solar:user-rounded-bold" />
          {t('account.profile')}
        </MenuItem>
        <MenuItem onClick={handleTheme} sx={{ gap: 1 }}>
          <Iconify icon="solar:palette-bold-duotone" />
          {t('account.theme')}
        </MenuItem>

        {settingsItems.length > 0 && <Divider sx={{ my: 0.5 }} />}
        {settingsItems.map((item) => (
          <MenuItem key={item.key} onClick={() => handleNavigate(item.path)} sx={{ gap: 1 }}>
            <Iconify icon={SETTINGS_ICONS[item.key]} />
            {t(`settings.${item.key}`)}
          </MenuItem>
        ))}

        <Divider sx={{ my: 0.5 }} />
        <MenuItem onClick={handleLogout} sx={{ gap: 1, color: 'error.main' }}>
          <Iconify icon="ic:round-power-settings-new" />
          {t('account.logout')}
        </MenuItem>
      </Menu>

      <Popover
        anchorEl={notifAnchor}
        open={notifOpen && Boolean(notifAnchor)}
        onClose={closeNotif}
        anchorOrigin={{ vertical: 'top', horizontal: 44 }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{
          transition: { onExited: () => setNotifAnchor(null) },
          paper: {
            sx: {
              width: 320,
              display: 'flex',
              flexDirection: 'column',
            },
          },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1">{t('account.notifications.title')}</Typography>
        </Box>
        <Divider />
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            py: 5,
            px: 3,
            gap: 1.5,
          }}
        >
          <Box
            component="img"
            src="/assets/illustrations/characters/character-notification.webp"
            alt=""
            loading="eager"
            sx={{
              width: 120,
              height: 120,
              objectFit: 'contain',
              opacity: 0.9,
            }}
          />
          <Typography variant="body2" color="text.secondary">
            {t('account.notifications.empty')}
          </Typography>
        </Box>
        <Divider />
        <Box sx={{ display: 'flex' }}>
          <Button fullWidth color="inherit" sx={{ borderRadius: 0, py: 1.5 }}>
            {t('account.notifications.markAllRead')}
          </Button>
          <Divider orientation="vertical" flexItem />
          <Button fullWidth color="inherit" sx={{ borderRadius: 0, py: 1.5 }}>
            {t('account.notifications.seeAll')}
          </Button>
        </Box>
      </Popover>

      <Drawer
        open={drawerOpen}
        onClose={onCloseDrawer}
        anchor="right"
        slotProps={{
          backdrop: { invisible: true },
          paper: { sx: { width: 320 } },
        }}
      >
        <IconButton
          onClick={onCloseDrawer}
          sx={{
            top: 12,
            left: 12,
            zIndex: 9,
            position: 'absolute',
          }}
        >
          <Iconify icon="mingcute:close-line" />
        </IconButton>

        <Scrollbar>
          <Box
            sx={{
              pt: 8,
              display: 'flex',
              alignItems: 'center',
              flexDirection: 'column',
            }}
          >
            <AnimateBorder
              sx={{ mb: 2, p: '6px', width: 96, height: 96, borderRadius: '50%' }}
              slotProps={{
                primaryBorder: { size: 120, sx: { color: 'primary.main' } },
              }}
            >
              <Avatar alt={displayName} sx={{ width: 1, height: 1 }}>
                {displayName.charAt(0).toUpperCase()}
              </Avatar>
            </AnimateBorder>

            <Typography variant="subtitle1" noWrap sx={{ mt: 2 }}>
              {displayName}
            </Typography>

            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }} noWrap>
              {email}
            </Typography>
          </Box>
        </Scrollbar>

        <Box sx={{ p: 2.5 }}>
          <Button
            fullWidth
            variant="soft"
            size="large"
            color="error"
            onClick={() => {
              onCloseDrawer();
              onOpenLogoutConfirm();
            }}
          >
            {t('account.logout')}
          </Button>
        </Box>
      </Drawer>

      <ConfirmDialog
        open={logoutConfirmOpen}
        title={t('account.logoutConfirm.title')}
        description={t('account.logoutConfirm.description')}
        confirmLabel={t('account.logoutConfirm.confirm')}
        confirmColor="error"
        loading={loggingOut}
        onClose={onCloseLogoutConfirm}
        onConfirm={handleConfirmLogout}
      />
    </>
  );
}
