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
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useTranslate } from 'src/locales';
import { Iconify } from 'src/shared/ui/iconify';
import { Form, Field } from 'src/shared/ui/hook-form';

import { useAuthContext } from '../../hooks';
import { getErrorMessage } from '../../utils';
import { FormHead } from '../../components/form-head';

function makeSchema(t: TFunction) {
  return z.object({
    login: z.string().min(1, { message: t('validation.loginRequired') }),
    password: z
      .string()
      .min(1, { message: t('validation.passwordRequired') })
      .min(8, { message: t('validation.passwordMin') }),
  });
}

export type SignInSchemaType = z.infer<ReturnType<typeof makeSchema>>;

export function JwtSignInView() {
  const router = useRouter();
  const showPassword = useBoolean();
  const { signIn, signInWithGoogle } = useAuthContext();
  const { t } = useTranslate('auth');

  const schema = useMemo(() => makeSchema(t), [t]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const methods = useForm<SignInSchemaType>({
    resolver: zodResolver(schema),
    defaultValues: { login: '', password: '' },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      setErrorMessage(null);
      await signIn({ login: data.login, password: data.password });
      router.refresh();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    }
  });

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      setErrorMessage(null);
      await signInWithGoogle();
      router.refresh();
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setGoogleLoading(false);
    }
  };

  const renderForm = () => (
    <Box sx={{ gap: 3, display: 'flex', flexDirection: 'column' }}>
      <Field.Text
        name="login"
        label={t('signIn.fields.login')}
        slotProps={{ inputLabel: { shrink: true } }}
      />

      <Field.Text
        name="password"
        label={t('signIn.fields.password')}
        placeholder={t('signIn.fields.passwordPlaceholder')}
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
        loadingIndicator={t('signIn.submitting')}
      >
        {t('signIn.submit')}
      </Button>
    </Box>
  );

  return (
    <>
      <FormHead
        title={t('signIn.title')}
        description={
          <>
            {t('signIn.description')}
            <Link component={RouterLink} href={paths.auth.jwt.signUp} variant="subtitle2">
              {t('signIn.descriptionLink')}
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

      <Divider sx={{ my: 3, typography: 'overline', color: 'text.disabled' }}>
        {t('signIn.or')}
      </Divider>

      <Button
        fullWidth
        size="large"
        color="inherit"
        variant="outlined"
        loading={googleLoading}
        loadingIndicator={t('signIn.googleSubmitting')}
        onClick={handleGoogleSignIn}
        startIcon={<Iconify width={22} icon="socials:google" />}
      >
        {t('signIn.googleSubmit')}
      </Button>
    </>
  );
}
