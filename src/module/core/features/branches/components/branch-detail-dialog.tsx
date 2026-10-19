import type { Branch } from '../types';

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
  branch: Branch | null;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
};

export function BranchDetailDialog({ open, branch, onClose, onEdit, onDelete }: Props) {
  const { t } = useTranslate('branches');
  const { t: tCommon } = useTranslate('common');
  const { can } = usePermission();
  const canEdit = can(PERM.branches.update);
  const canDelete = can(PERM.branches.delete);

  const title = branch?.name ?? t('detail.title');

  return (
    <MotionDialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, pr: 2.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="h6" noWrap>
            {title}
          </Typography>
        </Box>
        {branch?.is_default && (
          <Label variant="soft" color="info">
            {t('default')}
          </Label>
        )}
        {branch && (
          <Label variant="soft" color={branch.is_active ? 'success' : 'default'}>
            {t(branch.is_active ? 'statuses.active' : 'statuses.inactive')}
          </Label>
        )}
        <IconButton size="small" onClick={onClose}>
          <Iconify icon="mingcute:close-line" width={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: { xs: 2, md: 3 } }}>
        {branch && (
          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            }}
          >
            <DetailItem label={t('form.code')} value={branch.code} />
            <DetailItem label={t('form.name')} value={branch.name} />
            <DetailItem label={t('form.sort')} value={String(branch.sort)} />
            <DetailItem label={t('form.logoUrl')} value={branch.logo_url} />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ gap: 1 }}>
        {branch && (
          <>
            {canDelete && !branch.is_default && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                onClick={() => onDelete(branch.id)}
              >
                {tCommon('actions.delete')}
              </Button>
            )}
            {canEdit && (
              <Button
                variant="outlined"
                startIcon={<Iconify icon="solar:pen-bold" />}
                onClick={() => onEdit(branch.id)}
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
