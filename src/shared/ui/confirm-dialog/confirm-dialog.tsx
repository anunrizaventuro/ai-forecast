import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
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
  title: string;
  description?: string;
  confirmLabel: string;
  confirmColor?: 'primary' | 'success' | 'warning' | 'error' | 'inherit';
  requireComment?: boolean;
  commentLabel?: string;
  commentPlaceholder?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (comment: string) => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmColor = 'primary',
  requireComment = false,
  commentLabel,
  commentPlaceholder,
  loading = false,
  onClose,
  onConfirm,
}: Props) {
  const { t: tCommon } = useTranslate('common');
  const [comment, setComment] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) {
      setComment('');
      setTouched(false);
    }
  }, [open]);

  const commentError = requireComment && touched && !comment.trim();

  const handleConfirm = () => {
    setTouched(true);
    if (requireComment && !comment.trim()) return;
    onConfirm(comment.trim());
  };

  return (
    <MotionDialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullWidth
      maxWidth="xs"
      motionVariant="bounceInUp"
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, pr: 2.5 }}>
        <Box sx={{ flex: 1 }}>{title}</Box>
        <IconButton size="small" onClick={onClose} disabled={loading}>
          <Iconify icon="mingcute:close-line" width={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ py: 3 }}>
        {description && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: requireComment ? 2 : 0 }}>
            {description}
          </Typography>
        )}
        {(requireComment || commentLabel) && (
          <TextField
            fullWidth
            multiline
            minRows={2}
            maxRows={5}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onBlur={() => setTouched(true)}
            label={commentLabel}
            placeholder={commentPlaceholder}
            error={commentError}
            disabled={loading}
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="inherit" disabled={loading}>
          {tCommon('actions.cancel')}
        </Button>
        <Button onClick={handleConfirm} variant="contained" color={confirmColor} disabled={loading}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </MotionDialog>
  );
}
