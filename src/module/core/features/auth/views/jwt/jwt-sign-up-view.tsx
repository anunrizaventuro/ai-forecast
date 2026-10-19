import type { TFunction } from 'i18next';

import * as z from 'zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useBoolean } from 'minimal-shared/hooks';
import { zodResolver } from '@hookform/resolvers/zod';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useTranslate } from 'src/locales';
import { Iconify } from 'src/shared/ui/iconify';
import { Form, Field, schemaUtils } from 'src/shared/ui/hook-form';

import { useAuthContext } from '../../hooks';
import { getErrorMessage } from '../../utils';
import { FormHead } from '../../components/form-head';
import { SignUpTerms } from '../../components/sign-up-terms';

function makeSchema(t: TFunction) {
  return z.object({
    email: schemaUtils.email(),
    username: z
      .string()
      .min(3, { message: t('validation.usernameMin') })
      .max(100, { message: t('validation.usernameMax') }),
    password: z
      .string()
      .min(1, { message: t('validation.passwordRequired') })
      .min(8, { message: t('validation.passwordMin') }),
    full_name: z.string().max(255).optional(),
    phone: z.string().max(20).optional(),
    company_name: z
      .string()
      .min(2, { message: t('validation.companyNameMin') })
      .max(255, { message: t('validation.companyNameMax') }),
  });
}

export type SignUpSchemaType = z.infer<ReturnType<typeof makeSchema>>;

export function JwtSignUpView() {
  const router = useRouter();
  const showPassword = useBoolean();
  const { signUp } = useAuthContext();
  const { t } = useTranslate('auth');

  const schema = useMemo(() => makeSchema(t), [t]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const methods = useForm<SignUpSchemaType>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      username: '',
      password: '',
      full_name: '',
      phone: '',
      company_name: '',
    },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMessage(null);
      await signUp({
        email: data.email,
        username: data.username,
        password: data.password,
        full_name: data.full_name || undefined,
        phone: data.phone || undefined,
        company_name: data.company_name,
      });
      router.refresh();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  });

  const renderForm = () => (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      <Field.Text
        name="full_name"
        label={t('signUp.fields.fullName')}
        slotProps={{ inputLabel: { shrink: true } }}
      />

      <Box
        sx={{ display: 'flex', gap: { xs: 3, sm: 2 }, flexDirection: { xs: 'column', sm: 'row' } }}
      >
        <Field.Text
          name="email"
          label={t('signUp.fields.email')}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <Field.Text
          name="username"
          label={t('signUp.fields.username')}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Box>

      <Field.Text
        name="phone"
        label={t('signUp.fields.phone')}
        slotProps={{ inputLabel: { shrink: true } }}
      />

      <Field.Text
        name="company_name"
        label={t('signUp.fields.companyName')}
        slotProps={{ inputLabel: { shrink: true } }}
      />

      <Field.Text
        name="password"
        label={t('signUp.fields.password')}
        placeholder={t('signUp.fields.passwordPlaceholder')}
        type={showPassword.value ? 'text' : 'password'}
        slotProps={{
          inputLabel: { shrink: true },
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={showPassword.onToggle} edge="end">
                  <Iconify icon={showPassword.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />

      <Button
        fullWidth
        color="inherit"
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
        loadingIndicator={t('signUp.submitting')}
      >
        {t('signUp.submit')}
      </Button>
    </Box>
  );

  return (
    <>
      <FormHead
        title={t('signUp.title')}
        description={
          <>
            {t('signUp.description')}
            <Link component={RouterLink} href={paths.auth.jwt.signIn} variant="subtitle2">
              {t('signUp.descriptionLink')}
            </Link>
          </>
        }
        sx={{ textAlign: { xs: 'center', md: 'left' } }}
      />

      {!!errorMessage && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMessage}
        </Alert>
      )}

      <Form methods={methods} onSubmit={onSubmit}>
        {renderForm()}
      </Form>

      <SignUpTerms />
    </>
  );
}
