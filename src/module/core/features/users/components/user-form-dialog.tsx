import type { TFunction } from 'i18next';
import type { User, CreateUserPayload, UpdateUserPayload } from '../types';

import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { useBoolean } from 'minimal-shared/hooks';
import { useMemo, useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
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
import { useRoles } from 'src/module/core/features/roles/hooks/use-roles';
import { useCompanies } from 'src/module/core/features/auth/hooks/use-companies';
import { useBranchesByCompanies } from 'src/module/core/features/branches/hooks/use-branches-by-companies';

import { createUser, updateUser } from '../api';
import { CompanyAccessSection } from './company-access-section';
import { BranchScopingSection } from './branch-scoping-section';

// ----------------------------------------------------------------------

function makeSchema(t: TFunction, isEditing: boolean) {
  return z.object({
    full_name: z.string().max(255),
    email: z.string().email({ message: t('validation.emailInvalid') }),
    username: z
      .string()
      .min(3, { message: t('validation.usernameMin') })
      .max(100, { message: t('validation.usernameMax') })
      .regex(/^[a-zA-Z0-9_]+$/, { message: t('validation.usernameFormat') }),
    password: isEditing ? z.string() : z.string().min(8, { message: t('validation.passwordMin') }),
    phone: z.string().max(20),
    role_id: z.string(),
    is_active: z.boolean(),
  });
}

type FormValues = {
  full_name: string;
  email: string;
  username: string;
  password: string;
  phone: string;
  role_id: string;
  is_active: boolean;
};

// ----------------------------------------------------------------------

type Props = {
  open: boolean;
  mode: 'new' | 'edit';
  seed?: User | null;
  onClose: () => void;
  onSaved: (user: User) => void;
};

export function UserFormDialog({ open, mode, seed, onClose, onSaved }: Props) {
  const { t } = useTranslate('users');
  const { t: tCommon } = useTranslate('common');
  const isEditing = mode === 'edit';
  const schema = useMemo(() => makeSchema(t, isEditing), [t, isEditing]);

  const rolesQuery = useRoles();
  const { companies: companiesAll } = useCompanies();

  const submitting = useBoolean();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [companiesError, setCompaniesError] = useState<string | null>(null);

  const initialValue = seed ?? null;

  const [checkedCompanies, setCheckedCompanies] = useState<Set<string>>(new Set());
  const [checkedBranches, setCheckedBranches] = useState<Set<string>>(new Set());

  const companyIdsParam = useMemo(() => Array.from(checkedCompanies), [checkedCompanies]);
  const branchesQuery = useBranchesByCompanies(companyIdsParam);

  const ownedCompanyIds = useMemo(() => {
    if (!initialValue?.companies) return new Set<string>();
    return new Set(initialValue.companies.filter((c) => c.is_owner).map((c) => c.company_id));
  }, [initialValue]);

  const companyNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of companiesAll) map.set(c.id, c.name);
    return map;
  }, [companiesAll]);

  const branchToCompanyId = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of branchesQuery.data) map.set(b.id, b.company_id);
    return map;
  }, [branchesQuery.data]);

  const defaultValues: FormValues = useMemo(
    () => ({
      full_name: initialValue?.full_name ?? '',
      email: initialValue?.email ?? '',
      username: initialValue?.username ?? '',
      password: '',
      phone: initialValue?.phone ?? '',
      role_id: '',
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
    if (!open) {
      setErrorMsg(null);
      setCompaniesError(null);
      return;
    }
    methods.reset(defaultValues);

    const initialCompanies = new Set(initialValue?.companies?.map((c) => c.company_id) ?? []);
    const initialBranches = new Set(initialValue?.branches?.map((b) => b.branch_id) ?? []);
    setCheckedCompanies(initialCompanies);
    setCheckedBranches(initialBranches);
  }, [open, defaultValues, methods, initialValue]);

  const handleToggleCompany = (id: string) => {
    if (ownedCompanyIds.has(id)) return;

    setCheckedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);

      // Cascade: drop branches whose parent company is no longer checked.
      setCheckedBranches((prevBranches) => {
        const nextBranches = new Set<string>();
        for (const branchId of prevBranches) {
          const companyId = branchToCompanyId.get(branchId);
          if (companyId && next.has(companyId)) nextBranches.add(branchId);
        }
        return nextBranches;
      });

      return next;
    });
  };

  const handleToggleBranch = (id: string) => {
    setCheckedBranches((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (companiesError && checkedCompanies.size > 0) {
    setCompaniesError(null);
  }

  const onSave = handleSubmit(async (values) => {
    if (checkedCompanies.size === 0) {
      setCompaniesError(t('form.companyRequired'));
      return;
    }
    setCompaniesError(null);
    setErrorMsg(null);
    submitting.onTrue();
    try {
      let saved: User;
      if (isEditing && initialValue) {
        const payload: UpdateUserPayload = {
          email: values.email,
          username: values.username,
          full_name: values.full_name || undefined,
          phone: values.phone || undefined,
          is_active: values.is_active,
          role_id: values.role_id || undefined,
          company_ids: Array.from(checkedCompanies),
          branch_ids: Array.from(checkedBranches),
        };
        saved = await updateUser(initialValue.id, payload);
      } else {
        const payload: CreateUserPayload = {
          email: values.email,
          username: values.username,
          password: values.password,
          full_name: values.full_name || undefined,
          phone: values.phone || undefined,
          role_id: values.role_id || undefined,
          company_ids: Array.from(checkedCompanies),
          branch_ids: Array.from(checkedBranches),
        };
        saved = await createUser(payload);
      }
      onSaved(saved);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('errors.saveFailed'));
    } finally {
      submitting.onFalse();
    }
  });

  const title = isEditing
    ? t('form.editTitle', { name: initialValue?.full_name || initialValue?.username || '' })
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
                <Field.Text name="full_name" label={t('form.fullName')} />
                <Field.Text name="email" label={t('form.email')} />
              </Box>

              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { sm: 'repeat(2, 1fr)' } }}>
                <Field.Text name="phone" label={t('form.phone')} />
                <Field.Text name="username" label={t('form.username')} />
              </Box>

              <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { sm: 'repeat(2, 1fr)' } }}>
                <Field.Select name="role_id" label={t('form.role')}>
                  <MenuItem value="">—</MenuItem>
                  {rolesQuery.data.map((r) => (
                    <MenuItem key={r.id} value={r.id}>
                      {r.name}
                    </MenuItem>
                  ))}
                </Field.Select>
                {!isEditing && (
                  <Field.Text name="password" label={t('form.password')} type="password" />
                )}
              </Box>

              <CompanyAccessSection
                companies={companiesAll}
                checked={checkedCompanies}
                ownedCompanyIds={ownedCompanyIds}
                onToggle={handleToggleCompany}
                error={companiesError}
              />

              <BranchScopingSection
                branches={branchesQuery.data}
                companyNameById={companyNameById}
                checkedCompanies={checkedCompanies}
                checkedBranches={checkedBranches}
                onToggleBranch={handleToggleBranch}
              />

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
