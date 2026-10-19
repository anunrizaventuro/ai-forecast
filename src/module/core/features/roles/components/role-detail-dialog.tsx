import type { Role } from '../types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { useTranslate } from 'src/locales';
import { Label } from 'src/shared/ui/label';
import { Iconify } from 'src/shared/ui/iconify';
import { PERM } from 'src/shared/lib/permissions';
import { MotionDialog } from 'src/shared/ui/animate';
import { usePermission } from 'src/module/core/features/auth/hooks/use-permission';
import { useAuthContext } from 'src/module/core/features/auth/hooks/use-auth-context';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  role: Role | null;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export function RoleDetailDialog({ open, role, onClose, onEdit, onDelete }: Props) {
  const { t } = useTranslate('roles');
  const { t: tCommon } = useTranslate('common');
  const { isSuperAdmin } = useAuthContext();
  const { can } = usePermission();

  const title = role?.name ?? t('detail.title');
  // System roles editable by super admin (permission tuning); never deletable.
  // Beyond that, gate by `roles:update` / `roles:delete`.
  const canEdit = role ? can(PERM.roles.update) && (!role.is_system || isSuperAdmin) : false;
  const canDelete = role ? can(PERM.roles.delete) && !role.is_system : false;
  const permissions = role?.permissions ?? {};
  const permissionEntries = Object.entries(permissions);

  return (
    <MotionDialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, pr: 2.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap>
            {title}
          </Typography>
        </Box>
        {role?.is_system && (
          <Label variant="soft" color="warning">
            {t('system')}
          </Label>
        )}
        {role && (
          <Label variant="soft" color={role.is_active ? 'success' : 'default'}>
            {t(role.is_active ? 'statuses.active' : 'statuses.inactive')}
          </Label>
        )}
        <IconButton size="small" onClick={onClose}>
          <Iconify icon="mingcute:close-line" width={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, md: 3 } }}>
        {role && (
          <Stack spacing={2.5}>
            <Box
              sx={{
                display: 'grid',
                gap: 2.5,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
              }}
            >
              <DetailItem label={t('form.code')} value={role.code} />
              <DetailItem label={t('form.name')} value={role.name} />
              <Box sx={{ gridColumn: { md: 'span 2' } }}>
                <DetailItem label={t('form.description')} value={role.description} multiline />
              </Box>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('form.permissions')}
              </Typography>
              {permissionEntries.length === 0 ? (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  —
                </Typography>
              ) : (
                <Box
                  sx={{
                    mt: 1,
                    display: 'grid',
                    gap: 1,
                    gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                  }}
                >
                  {permissionEntries.map(([resource, level]) => (
                    <Stack
                      key={resource}
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                    >
                      <Typography variant="body2" noWrap>
                        {t(`resources.${resource}`, { defaultValue: resource })}
                      </Typography>
                      <Label variant="soft" color="default">
                        {t(`levels.${level}`, { defaultValue: level })}
                      </Label>
                    </Stack>
                  ))}
                </Box>
              )}
            </Box>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ gap: 1 }}>
        {role && canDelete && (
          <Button
            variant="outlined"
            color="error"
            startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
            onClick={() => onDelete(role.id)}
          >
            {tCommon('actions.delete')}
          </Button>
        )}
        {role && canEdit && (
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:pen-bold" />}
            onClick={() => onEdit(role.id)}
          >
            {tCommon('actions.edit')}
          </Button>
        )}
      </DialogActions>
    </MotionDialog>
  );
}

// ----------------------------------------------------------------------

function DetailItem({
  label,
  value,
  multiline,
}: {
  label: string;
  value: string | null | undefined;
  multiline?: boolean;
}) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: multiline ? 'pre-wrap' : 'normal' }}>
        {value || '—'}
      </Typography>
    </Stack>
  );
}
