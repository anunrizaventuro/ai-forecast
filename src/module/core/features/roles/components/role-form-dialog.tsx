import type { TFunction } from 'i18next';
import type { Role, PermissionLevel, CreateRolePayload, UpdateRolePayload } from '../types';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useBoolean } from 'minimal-shared/hooks';
import { useMemo, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import FormControlLabel from '@mui/material/FormControlLabel';

import { useTranslate } from 'src/locales';
import { Iconify } from 'src/shared/ui/iconify';
import { MotionDialog } from 'src/shared/ui/animate';
import { Form, Field } from 'src/shared/ui/hook-form';
import { ErrorDialog } from 'src/shared/ui/error-dialog';

import { createRole, updateRole } from '../api';
import { LEVEL_OPTIONS, PERMISSION_GROUPS } from '../utils/permissions';

// ----------------------------------------------------------------------

function makeSchema(t: TFunction, isEditing: boolean) {
  return z.object({
    code: isEditing
      ? z.string()
      : z
          .string()
          .min(2, { message: t('validation.codeMin') })
          .max(50, { message: t('validation.codeMax') })
          .regex(/^[a-z0-9_]+$/, { message: t('validation.codeFormat') }),
    name: z
      .string()
      .min(2, { message: t('validation.nameMin') })
      .max(100, { message: t('validation.nameMax') }),
    description: z.string().max(1000, { message: t('validation.descMax') }),
    is_active: z.boolean(),
  });
}

type FormValues = {
  code: string;
  name: string;
  description: string;
  is_active: boolean;
};

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  mode: 'new' | 'edit';
  seed?: Role | null;
  onClose: () => void;
  onSaved: (role: Role) => void;
};

export function RoleFormDialog({ open, mode, seed, onClose, onSaved }: Props) {
  const { t } = useTranslate('roles');
  const { t: tCommon } = useTranslate('common');
  const isEditing = mode === 'edit';
  const schema = useMemo(() => makeSchema(t, isEditing), [t, isEditing]);

  const submitting = useBoolean();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const initialValue = seed ?? null;

  const [permissions, setPermissions] = useState<Record<string, PermissionLevel>>(
    initialValue?.permissions ?? {}
  );

  const defaultValues: FormValues = useMemo(
    () => ({
      code: initialValue?.code ?? '',
      name: initialValue?.name ?? '',
      description: initialValue?.description ?? '',
      is_active: initialValue?.is_active ?? true,
    }),
    [initialValue]
  );

  const methods = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });
  const { handleSubmit, watch, setValue } = methods;

  useEffect(() => {
    if (open) {
      methods.reset(defaultValues);
      setPermissions(initialValue?.permissions ?? {});
    }
    if (!open) setErrorMsg(null);
  }, [open, defaultValues, methods, initialValue]);

  const togglePermission = (resource: string, checked: boolean) => {
    setPermissions((prev) => {
      const next = { ...prev };
      if (checked) next[resource] = next[resource] ?? 'viewer';
      else delete next[resource];
      return next;
    });
  };

  const setPermissionLevel = (resource: string, level: PermissionLevel) => {
    setPermissions((prev) => ({ ...prev, [resource]: level }));
  };

  const onSave = handleSubmit(async (values) => {
    setErrorMsg(null);
    submitting.onTrue();
    try {
      let saved: Role;
      if (isEditing && initialValue) {
        const payload: UpdateRolePayload = {
          name: values.name,
          description: values.description || undefined,
          permissions,
          is_active: values.is_active,
        };
        saved = await updateRole(initialValue.id, payload);
      } else {
        const payload: CreateRolePayload = {
          code: values.code,
          name: values.name,
          description: values.description || undefined,
          permissions,
          is_active: values.is_active,
        };
        saved = await createRole(payload);
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
        maxWidth="md"
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
              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { sm: 'repeat(2, 1fr)' } }}>
                <Field.Text
                  name="code"
                  label={t('form.code')}
                  disabled={isEditing}
                  helperText={isEditing ? t('form.codeImmutable') : t('form.codeHint')}
                />
                <Field.Text name="name" label={t('form.name')} />
              </Box>

              <Field.Text
                name="description"
                label={t('form.description')}
                multiline
                minRows={2}
                maxRows={4}
              />

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  {t('form.permissions')}
                </Typography>
                <Stack spacing={2}>
                  {PERMISSION_GROUPS.map((group) => (
                    <Box key={group.id}>
                      <Typography variant="overline" color="text.secondary">
                        {t(`groups.${group.id}`)}
                      </Typography>
                      <Box
                        sx={{
                          display: 'grid',
                          gap: 1,
                          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                        }}
                      >
                        {group.resources.map((resource) => {
                          const enabled = resource in permissions;
                          return (
                            <Stack
                              key={resource}
                              direction="row"
                              spacing={1}
                              sx={{ alignItems: 'center' }}
                            >
                              <Checkbox
                                size="small"
                                checked={enabled}
                                onChange={(e) => togglePermission(resource, e.target.checked)}
                              />
                              <Typography variant="body2" sx={{ flex: 1 }}>
                                {t(`resources.${resource}`, resource)}
                              </Typography>
                              {enabled && (
                                <FormControl size="small" sx={{ minWidth: 110 }}>
                                  <Select
                                    value={permissions[resource]}
                                    onChange={(e) =>
                                      setPermissionLevel(
                                        resource,
                                        e.target.value as PermissionLevel
                                      )
                                    }
                                  >
                                    {LEVEL_OPTIONS.map((lv) => (
                                      <MenuItem key={lv} value={lv}>
                                        {t(`levels.${lv}`)}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              )}
                            </Stack>
                          );
                        })}
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Box>

              {isEditing && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={watch('is_active')}
                      onChange={(e) => setValue('is_active', e.target.checked)}
                    />
                  }
                  label={t('form.isActive')}
                />
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
