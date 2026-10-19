import { Trans } from 'react-i18next';

import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { useTranslate } from 'src/locales';
import { Iconify } from 'src/shared/ui/iconify';
import { MotionDialog } from 'src/shared/ui/animate';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  value: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function TranslationOverrideDeleteDialog({
  open,
  value,
  loading,
  onClose,
  onConfirm,
}: Props) {
  const { t } = useTranslate('translation-override');
  const { t: tCommon } = useTranslate('common');

  return (
    <MotionDialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      motionVariant="bounceInUp"
    >
      <DialogTitle>{t('confirm.reset.title')}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          <Trans
            i18nKey="translation-override:confirm.reset.desc"
            values={{ value }}
            components={{ strong: <strong /> }}
          />
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" color="inherit" onClick={onClose} disabled={loading}>
          {tCommon('actions.cancel')}
        </Button>
        <Button
          variant="contained"
          color="error"
          startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
          onClick={onConfirm}
          loading={loading}
        >
          {t('confirm.reset.confirm')}
        </Button>
      </DialogActions>
    </MotionDialog>
  );
}
