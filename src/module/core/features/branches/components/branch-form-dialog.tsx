import type { TFunction } from 'i18next';
import type { Branch, CreateBranchPayload, UpdateBranchPayload } from '../types';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useBoolean } from 'minimal-shared/hooks';
import { useMemo, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';

import { useTranslate } from 'src/locales';
import { Iconify } from 'src/shared/ui/iconify';
import { MotionDialog } from 'src/shared/ui/animate';
import { Form, Field } from 'src/shared/ui/hook-form';
import { ErrorDialog } from 'src/shared/ui/error-dialog';

import { createBranch, updateBranch } from '../api';

// ----------------------------------------------------------------------

function makeSchema(t: TFunction) {
  return z.object({
    code: z.string().max(50).optional().or(z.literal('')),
    name: z
      .string()
      .min(2, { message: t('validation.nameMin') })
      .max(255, { message: t('validation.nameMax') }),
    logo_url: z
      .string()
      .max(500, { message: t('validation.logoMax') })
      .url({ message: t('validation.logoUrl') })
      .optional()
      .or(z.literal('')),
    is_default: z.boolean(),
    is_active: z.boolean(),
  });
}

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  mode: 'new' | 'edit';
  seed?: Branch | null;
  onClose: () => void;
  onSaved: (branch: Branch) => void;
};

export function BranchFormDialog({ open, mode, seed, onClose, onSaved }: Props) {
  const { t } = useTranslate('branches');
  const { t: tCommon } = useTranslate('common');
  const schema = useMemo(() => makeSchema(t), [t]);

  const submitting = useBoolean();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const initialValue = seed ?? null;

  const defaultValues = useMemo<FormValues>(
    () => ({
      code: initialValue?.code ?? '',
      name: initialValue?.name ?? '',
      logo_url: initialValue?.logo_url ?? '',
      is_default: initialValue?.is_default ?? false,
      is_active: initialValue?.is_active ?? true,
    }),
    [initialValue]
  );

  const methods = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  const { handleSubmit, watch, setValue } = methods;
  const isEditing = mode === 'edit';

  useEffect(() => {
    if (open) methods.reset(defaultValues);
    if (!open) setErrorMsg(null);
  }, [open, defaultValues, methods]);

  const onSave = handleSubmit(async (values) => {
    setErrorMsg(null);
    submitting.onTrue();
    try {
      let saved: Branch;
      if (isEditing && initialValue) {
        const payload: UpdateBranchPayload = {
          code: values.code || undefined,
          name: values.name,
          logo_url: values.logo_url || null,
          is_default: values.is_default || undefined,
          is_active: values.is_active,
        };
        saved = await updateBranch(initialValue.id, payload);
      } else {
        const payload: CreateBranchPayload = {
          code: values.code || undefined,
          name: values.name,
          logo_url: values.logo_url || null,
          is_default: values.is_default,
        };
        saved = await createBranch(payload);
      }
      onSaved(saved);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('errors.saveFailed'));
    } finally {
      submitting.onFalse();
    }
  });

  const title = isEditing
    ? t('form.editTitle', { name: initialValue?.name ?? '' })
    : t('form.newTitle');

  return (
    <>
      <MotionDialog
        open={open}
        onClose={submitting.value ? undefined : onClose}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, pr: 2.5 }}>
          <Box sx={{ flex: 1 }}>{title}</Box>
          <IconButton size="small" onClick={onClose} disabled={submitting.value}>
            <Iconify icon="mingcute:close-line" width={18} />
          </IconButton>
        </DialogTitle>
        <Form methods={methods} onSubmit={onSave} sx={{ display: 'contents' }}>
          <DialogContent dividers sx={{ p: { xs: 2, md: 3 } }}>
            <Stack spacing={2.5}>
              <Field.Text name="name" label={t('form.name')} />

              <Field.Text
                name="code"
                label={t('form.code')}
                disabled={isEditing}
                helperText={isEditing ? t('form.codeImmutable') : t('form.codeHint')}
              />

              {isEditing && (
                <>
                  <Field.Text name="logo_url" label={t('form.logoUrl')} />
                  <Stack direction="row" spacing={3} sx={{ flexWrap: 'wrap' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={watch('is_active')}
                          onChange={(e) => setValue('is_active', e.target.checked)}
                        />
                      }
                      label={t('form.isActive')}
                    />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={watch('is_default')}
                          onChange={(e) => setValue('is_default', e.target.checked)}
                        />
                      }
                      label={t('form.isDefault')}
                    />
                  </Stack>
                </>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              type="submit"
              variant="contained"
              startIcon={<Iconify icon="solar:check-circle-bold" />}
              loading={submitting.value}
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
