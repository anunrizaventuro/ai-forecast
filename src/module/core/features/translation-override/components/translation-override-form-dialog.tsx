import type { TFunction } from 'i18next';
import type { TranslationKeyInfo, TranslationOverride } from '../types';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useBoolean } from 'minimal-shared/hooks';
import { useMemo, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { useTranslate } from 'src/locales';
import { Iconify } from 'src/shared/ui/iconify';
import { MotionDialog } from 'src/shared/ui/animate';
import { Form, Field } from 'src/shared/ui/hook-form';
import { ErrorDialog } from 'src/shared/ui/error-dialog';

import { createTranslationOverride, updateTranslationOverride } from '../api';

// ----------------------------------------------------------------------

function makeSchema(t: TFunction) {
  return z.object({
    translation_key: z.string().min(1, { message: t('validation.keyRequired') }),
    value: z
      .string()
      .trim()
      .min(1, { message: t('validation.valueRequired') })
      .max(500, { message: t('validation.valueMax') }),
    notes: z
      .string()
      .max(500, { message: t('validation.notesMax') })
      .optional()
      .or(z.literal('')),
  });
}

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  mode: 'new' | 'edit';
  clientId: string | null;
  translationKey: string | null;
  override: TranslationOverride | null;
  keyInfo: TranslationKeyInfo | null;
  onClose: () => void;
  onSaved: (override: TranslationOverride) => void;
};

export function TranslationOverrideFormDialog({
  open,
  mode,
  clientId,
  translationKey,
  override,
  keyInfo,
  onClose,
  onSaved,
}: Props) {
  const { t } = useTranslate('translation-override');
  const { t: tCommon } = useTranslate('common');
  const schema = useMemo(() => makeSchema(t), [t]);

  const submitting = useBoolean();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [full, setFull] = useState(false);

  const defaultValues: FormValues = useMemo(
    () => ({
      translation_key: translationKey ?? '',
      value: override?.value ?? '',
      notes: override?.notes ?? '',
    }),
    [translationKey, override]
  );

  const methods = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const { handleSubmit, reset } = methods;

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  useEffect(() => {
    if (!open) {
      setErrorMsg(null);
      setFull(false);
    }
  }, [open]);

  const performSave = handleSubmit(async (values) => {
    if (!clientId || !values.translation_key) return;
    setErrorMsg(null);
    submitting.onTrue();
    try {
      const notes = values.notes ? values.notes : null;
      const saved =
        mode === 'edit'
          ? await updateTranslationOverride(clientId, values.translation_key, {
              value: values.value,
              notes,
            })
          : await createTranslationOverride(clientId, {
              translation_key: values.translation_key,
              value: values.value,
              notes,
            });
      onSaved(saved);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('feedback.saveFailed'));
    } finally {
      submitting.onFalse();
    }
  });

  const title =
    mode === 'edit' ? t('editOverride', { key: translationKey ?? '' }) : t('newOverride');

  return (
    <>
      <MotionDialog
        open={open}
        onClose={submitting.value ? undefined : onClose}
        fullWidth
        fullScreen={full}
        maxWidth="sm"
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, pr: 2.5 }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" noWrap>
              {title}
            </Typography>
          </Box>
          <Tooltip title={full ? tCommon('actions.collapse') : tCommon('actions.expand')}>
            <IconButton size="small" onClick={() => setFull((v) => !v)}>
              <Iconify icon={full ? 'eva:collapse-fill' : 'eva:expand-fill'} width={18} />
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={onClose} disabled={submitting.value}>
            <Iconify icon="mingcute:close-line" width={18} />
          </IconButton>
        </DialogTitle>

        <Form methods={methods} onSubmit={performSave} sx={{ display: 'contents' }}>
          <DialogContent dividers sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2.5}>
              {keyInfo && (
                <Box
                  sx={{
                    display: 'grid',
                    gap: 1.5,
                    p: 2,
                    border: (th) => `1px dashed ${th.vars.palette.divider}`,
                    borderRadius: 1,
                  }}
                >
                  <DefaultPreview label={t('form.keyLabel')} value={keyInfo.key} mono />
                  <DefaultPreview label={t('form.defaultId')} value={keyInfo.id} />
                </Box>
              )}

              <Field.Text
                name="value"
                label={t('form.value')}
                placeholder={t('form.valuePlaceholder')}
                helperText={t('form.valueHint')}
                multiline
                minRows={2}
                maxRows={4}
                autoFocus
                slotProps={{ inputLabel: { shrink: true } }}
              />

              <Field.Text
                name="notes"
                label={t('form.notes')}
                placeholder={t('form.notesPlaceholder')}
                helperText={t('form.notesHint')}
                multiline
                minRows={2}
                maxRows={4}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
          </DialogContent>

          <DialogActions>
            <Button
              type="submit"
              variant="contained"
              startIcon={<Iconify icon="solar:check-circle-bold" />}
              loading={submitting.value}
              disabled={!clientId}
            >
              {tCommon('actions.save')}
            </Button>
          </DialogActions>
        </Form>
      </MotionDialog>

      <ErrorDialog open={!!errorMsg} message={errorMsg ?? ''} onClose={() => setErrorMsg(null)} />
    </>
  );
}

// ----------------------------------------------------------------------

function DefaultPreview({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <Stack spacing={0.25}>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          whiteSpace: 'pre-wrap',
          ...(mono && { fontFamily: 'monospace', fontSize: '0.8rem', color: 'text.secondary' }),
        }}
      >
        {value || '—'}
      </Typography>
    </Stack>
  );
}
