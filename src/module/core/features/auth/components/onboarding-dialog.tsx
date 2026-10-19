import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';

import { useTranslate } from 'src/locales';

import { useAuthContext } from '../hooks';

export function OnboardingDialog() {
  const { authenticated, loading, user, company, signOut } = useAuthContext();
  const { t } = useTranslate('auth');

  const open = !loading && authenticated && !!user && !company;

  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      fullWidth
      maxWidth="sm"
      slotProps={{ backdrop: { sx: { backdropFilter: 'blur(4px)' } } }}
    >
      <DialogTitle>
        {user?.full_name
          ? t('onboarding.titleWithName', { name: user.full_name })
          : t('onboarding.title')}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 1 }}>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {t('onboarding.noCompany')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('onboarding.contactAdmin')}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={() => signOut()}>
          {t('onboarding.signOut')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
