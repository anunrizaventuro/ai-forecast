import type { Theme, SxProps } from '@mui/material/styles';
import type { ButtonBaseProps } from '@mui/material/ButtonBase';
import type { Company } from 'src/module/core/features/companies/types';
import type { CompanyMembership } from 'src/module/core/features/auth/types';

import { useState } from 'react';
import { usePopover } from 'minimal-shared/hooks';

import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import MenuList from '@mui/material/MenuList';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';

import { useTranslate } from 'src/locales';
import { toast } from 'src/shared/ui/snackbar';
import { Iconify } from 'src/shared/ui/iconify';
import { PERM } from 'src/shared/lib/permissions';
import { Scrollbar } from 'src/shared/ui/scrollbar';
import { CustomPopover } from 'src/shared/ui/custom-popover';
import { usePermission } from 'src/module/core/features/auth/hooks/use-permission';
import { useCompanies, useAuthContext } from 'src/module/core/features/auth/hooks';
import { CompanyFormDialog } from 'src/module/core/features/companies/components/company-form-dialog';

type WorkspacesPopoverProps = ButtonBaseProps;

export function WorkspacesPopover({ sx, ...other }: WorkspacesPopoverProps) {
  const mediaQuery = 'sm';

  const { t } = useTranslate('companies');
  const { can } = usePermission();
  const canCreate = can(PERM.companies.create);
  const canUpdate = can(PERM.companies.update);

  const { open, anchorEl, onClose, onOpen } = usePopover();
  const { company, switchCompany } = useAuthContext();
  const { companies, loading, refetch } = useCompanies();

  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<{ mode: 'new' | 'edit'; seed: CompanyMembership | null } | null>(
    null
  );

  const openForm = (mode: 'new' | 'edit', seed: CompanyMembership | null) => {
    onClose();
    setForm({ mode, seed });
  };

  const handleSaved = (saved: Company) => {
    setForm(null);
    refetch();
    toast.success(t('feedback.saved', { name: saved.name }));
  };

  const handleSwitch = async (id: string) => {
    if (id === company?.id) {
      onClose();
      return;
    }
    setSwitchingId(id);
    setError(null);
    try {
      await switchCompany(id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch company');
    } finally {
      setSwitchingId(null);
    }
  };

  const buttonBg: SxProps<Theme> = {
    height: 1,
    zIndex: -1,
    opacity: 0,
    content: "''",
    borderRadius: 1,
    position: 'absolute',
    visibility: 'hidden',
    bgcolor: 'action.hover',
    width: 'calc(100% + 8px)',
    transition: (theme) =>
      theme.transitions.create(['opacity', 'visibility'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.shorter,
      }),
    ...(open && { opacity: 1, visibility: 'visible' }),
  };

  const currentName = company?.name ?? 'No company';
  const currentInitial = currentName.charAt(0).toUpperCase();
  const currentMembership = companies.find((c) => c.id === company?.id);

  const renderButton = () => (
    <ButtonBase
      disableRipple
      onClick={onOpen}
      disabled={!company}
      sx={[
        { py: 0.5, gap: { xs: 0.5, [mediaQuery]: 1 }, '&::before': buttonBg },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Avatar
        src={currentMembership?.logo_url ?? undefined}
        alt={currentName}
        sx={{ width: 24, height: 24, fontSize: 12 }}
      >
        {currentInitial}
      </Avatar>

      <Box
        component="span"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          overflow: 'hidden',
          textAlign: 'left',
          whiteSpace: 'nowrap',
          typography: 'subtitle2',
          textOverflow: 'ellipsis',
          display: { xs: 'none', [mediaQuery]: 'block' },
        }}
      >
        {currentName}
      </Box>

      <Iconify
        width={16}
        icon="carbon:chevron-sort"
        sx={{ flexShrink: 0, color: 'text.disabled' }}
      />
    </ButtonBase>
  );

  const renderMenuList = () => (
    <CustomPopover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      slotProps={{
        arrow: { placement: 'left-top' },
        paper: { sx: { width: 280 } },
      }}
    >
      <Scrollbar sx={{ maxHeight: 320 }}>
        {loading && companies.length === 0 ? (
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={20} />
          </Box>
        ) : (
          <MenuList>
            {companies.map((option, idx) => {
              const isSelected = option.id === company?.id;
              const isSwitching = switchingId === option.id;
              const isSub = option.type !== 'holding';
              const nextItem = companies[idx + 1];
              const isLastSubInGroup = isSub && (!nextItem || nextItem.type === 'holding');
              return (
                <MenuItem
                  key={option.id}
                  selected={isSelected}
                  onClick={() => handleSwitch(option.id)}
                  disabled={!!switchingId}
                  sx={{ height: 40, gap: 1 }}
                >
                  {option.type === 'holding' ? (
                    <Avatar
                      src={option.logo_url ?? undefined}
                      alt={option.name}
                      sx={{ width: 24, height: 24, fontSize: 12 }}
                    >
                      {option.name.charAt(0).toUpperCase()}
                    </Avatar>
                  ) : (
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        flexShrink: 0,
                        position: 'relative',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          left: 11,
                          top: -12,
                          bottom: isLastSubInGroup ? '50%' : -12,
                          width: 2,
                          bgcolor: 'grey.300',
                        },
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          left: 11,
                          top: '50%',
                          width: 9,
                          height: 2,
                          bgcolor: 'grey.300',
                        },
                      }}
                    />
                  )}

                  <Typography
                    noWrap
                    component="div"
                    variant="body2"
                    sx={{
                      flexGrow: 1,
                      minWidth: 0,
                      fontWeight:
                        option.type === 'holding' ? 'fontWeightSemiBold' : 'fontWeightMedium',
                      color: option.type === 'holding' ? 'text.primary' : 'text.secondary',
                    }}
                  >
                    {option.name}
                  </Typography>

                  {isSwitching ? (
                    <CircularProgress size={14} />
                  ) : (
                    canUpdate &&
                    isSelected && (
                      <Box
                        component="span"
                        onClick={(e) => {
                          e.stopPropagation();
                          openForm('edit', option);
                        }}
                        sx={{
                          p: 0.5,
                          display: 'inline-flex',
                          borderRadius: 1,
                          color: 'text.disabled',
                          '&:hover': { bgcolor: 'action.hover', color: 'text.primary' },
                        }}
                      >
                        <Iconify icon="solar:pen-bold" width={16} />
                      </Box>
                    )
                  )}
                </MenuItem>
              );
            })}

            {canCreate && (
              <>
                <Divider sx={{ my: 0.5, borderStyle: 'dashed' }} />
                <MenuItem
                  onClick={() => openForm('new', null)}
                  sx={{ height: 40, gap: 1, color: 'primary.main' }}
                >
                  <Iconify icon="mingcute:add-line" width={18} />
                  <Typography variant="body2">{t('form.newTitle')}</Typography>
                </MenuItem>
              </>
            )}
          </MenuList>
        )}
      </Scrollbar>

      {error && (
        <Typography variant="caption" sx={{ color: 'error.main', px: 2, py: 1, display: 'block' }}>
          {error}
        </Typography>
      )}
    </CustomPopover>
  );

  return (
    <>
      {renderButton()}
      {renderMenuList()}

      <CompanyFormDialog
        open={!!form}
        mode={form?.mode ?? 'new'}
        seed={form?.mode === 'edit' ? form.seed : null}
        parentOptions={companies.map((c) => ({ id: c.id, name: c.name }))}
        onClose={() => setForm(null)}
        onSaved={handleSaved}
      />
    </>
  );
}
