import type { User } from '../types';

import dayjs from 'dayjs';

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

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export function UserDetailDialog({ open, user, onClose, onEdit, onDelete }: Props) {
  const { t } = useTranslate('users');
  const { t: tCommon } = useTranslate('common');
  const { can } = usePermission();
  const canEdit = can(PERM.userManagement.update);
  const canDelete = can(PERM.userManagement.delete);

  const title = user ? user.full_name || user.username : t('detail.title');

  const branchNames = user?.branches?.map((b) => b.branch_name).join(', ') ?? '';
  const lastLogin = user?.last_login_at
    ? dayjs(user.last_login_at).format('DD MMM YYYY HH:mm')
    : null;

  return (
    <MotionDialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, pr: 2.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap>
            {title}
          </Typography>
          {user && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              @{user.username}
            </Typography>
          )}
        </Box>
        {user?.role_name && (
          <Label variant="soft" color="info">
            {user.role_name}
          </Label>
        )}
        {user && (
          <Label variant="soft" color={user.is_active ? 'success' : 'default'}>
            {t(user.is_active ? 'statuses.active' : 'statuses.inactive')}
          </Label>
        )}
        <IconButton size="small" onClick={onClose}>
          <Iconify icon="mingcute:close-line" width={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, md: 3 } }}>
        {user && (
          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            }}
          >
            <DetailItem label={t('form.fullName')} value={user.full_name} />
            <DetailItem label={t('form.username')} value={user.username} />
            <DetailItem label={t('form.email')} value={user.email} />
            <DetailItem label={t('form.phone')} value={user.phone} />
            <DetailItem label={t('form.role')} value={user.role_name ?? null} />
            <DetailItem label={t('detail.lastLogin')} value={lastLogin} />
            <Box sx={{ gridColumn: { md: 'span 2' } }}>
              <DetailItem
                label={t('form.branchScoping')}
                value={branchNames || t('detail.allBranches')}
              />
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ gap: 1 }}>
        {user && (
          <>
            {canDelete && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                onClick={() => onDelete(user.id)}
              >
                {tCommon('actions.delete')}
              </Button>
            )}
            {canEdit && (
              <Button
                variant="outlined"
                startIcon={<Iconify icon="solar:pen-bold" />}
                onClick={() => onEdit(user.id)}
              >
                {tCommon('actions.edit')}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </MotionDialog>
  );
}

// ----------------------------------------------------------------------

function DetailItem({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
        {value || '—'}
      </Typography>
    </Stack>
  );
}
