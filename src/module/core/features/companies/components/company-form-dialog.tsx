import type { TFunction } from 'i18next';
import type { CompanyMembership } from 'src/module/core/features/auth/types';
import type { Company, CreateCompanyPayload, UpdateCompanyPayload } from '../types';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useBoolean } from 'minimal-shared/hooks';
import { useMemo, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';

import { useTranslate } from 'src/locales';
import { Iconify } from 'src/shared/ui/iconify';
import { MotionDialog } from 'src/shared/ui/animate';
import { Form, Field } from 'src/shared/ui/hook-form';
import { ErrorDialog } from 'src/shared/ui/error-dialog';

import { createCompany, updateCompany } from '../api';

// ----------------------------------------------------------------------

function makeSchema(t: TFunction) {
  return z.object({
    name: z
      .string()
      .min(2, { message: t('validation.nameMin') })
      .max(255, { message: t('validation.nameMax') }),
    type: z.enum(['holding', 'subsidiary']),
    parent_id: z.string().optional().or(z.literal('')),
    logo_url: z
      .string()
      .max(500, { message: t('validation.logoMax') })
      .url({ message: t('validation.logoUrl') })
      .optional()
      .or(z.literal('')),
  });
}

type FormValues = z.infer<ReturnType<typeof makeSchema>>;

type ParentOption = { id: string; name: string };

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  mode: 'new' | 'edit';
  seed?: CompanyMembership | null;
  parentOptions: ParentOption[];
  onClose: () => void;
  onSaved: (company: Company) => void;
};

export function CompanyFormDialog({ open, mode, seed, parentOptions, onClose, onSaved }: Props) {
  const { t } = useTranslate('companies');
  const { t: tCommon } = useTranslate('common');
  const schema = useMemo(() => makeSchema(t), [t]);

  const submitting = useBoolean();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const initialValue = seed ?? null;
  const isEditing = mode === 'edit';

  const defaultValues = useMemo<FormValues>(
    () => ({
      name: initialValue?.name ?? '',
      type: initialValue?.type ?? 'holding',
      parent_id: initialValue?.parent_id ?? '',
      logo_url: initialValue?.logo_url ?? '',
    }),
    [initialValue]
  );

  const methods = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });
  const { handleSubmit } = methods;

  // Parent options exclude the company being edited (cannot be its own parent).
  const availableParents = useMemo(
    () => parentOptions.filter((c) => c.id !== initialValue?.id),
    [parentOptions, initialValue?.id]
  );

  useEffect(() => {
    if (open) methods.reset(defaultValues);
    if (!open) setErrorMsg(null);
  }, [open, defaultValues, methods]);

  const onSave = handleSubmit(async (values) => {
    setErrorMsg(null);
    submitting.onTrue();
    try {
      let saved: Company;
      if (isEditing && initialValue) {
        const payload: UpdateCompanyPayload = {
          name: values.name,
          type: values.type,
          logo_url: values.logo_url || null,
        };
        saved = await updateCompany(initialValue.id, payload);
      } else {
        const payload: CreateCompanyPayload = {
          name: values.name,
          type: values.type,
          parent_id: values.parent_id || null,
          logo_url: values.logo_url || null,
        };
        saved = await createCompany(payload);
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

              <Field.Select name="type" label={t('form.type')}>
                <MenuItem value="holding">{t('types.holding')}</MenuItem>
                <MenuItem value="subsidiary">{t('types.subsidiary')}</MenuItem>
              </Field.Select>

              <Field.Select
                name="parent_id"
                label={t('form.parent')}
                disabled={isEditing}
                helperText={isEditing ? t('form.parentImmutable') : t('form.parentHint')}
              >
                <MenuItem value="">{t('form.noParent')}</MenuItem>
                {availableParents.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.name}
                  </MenuItem>
                ))}
              </Field.Select>

              <Field.Text name="logo_url" label={t('form.logoUrl')} />
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
