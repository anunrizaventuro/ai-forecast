import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { useTranslate } from 'src/locales';
import { Iconify } from 'src/shared/ui/iconify';
import { MotionDialog } from 'src/shared/ui/animate';

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  title?: string;
  message: string;
  onClose: () => void;
};

export function ErrorDialog({ open, title, message, onClose }: Props) {
  const { t: tCommon } = useTranslate('common');

  return (
    <MotionDialog open={open} onClose={onClose} fullWidth maxWidth="xs" motionVariant="bounceInUp">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, pr: 2.5 }}>
        <Iconify icon="solar:danger-triangle-bold" width={24} sx={{ color: 'error.main' }} />
        <Box sx={{ flex: 1 }}>{title ?? tCommon('error.title')}</Box>
        <IconButton size="small" onClick={onClose}>
          <Iconify icon="mingcute:close-line" width={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {message}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" color="inherit">
          {tCommon('actions.close')}
        </Button>
      </DialogActions>
    </MotionDialog>
  );
}
