import { m } from 'framer-motion';

import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { useTranslate } from 'src/locales';
import { SimpleLayout } from 'src/layouts/simple';
import { varBounce, MotionContainer } from 'src/shared/ui/animate';
import { PageNotFoundIllustration } from 'src/assets/illustrations';

// ----------------------------------------------------------------------

export function NotFoundView() {
  const { t } = useTranslate('error');

  return (
    <SimpleLayout
      slotProps={{
        content: { compact: true },
      }}
    >
      <Container component={MotionContainer}>
        <m.div variants={varBounce('in')}>
          <Typography variant="h3" sx={{ mb: 2 }}>
            {t('notFound.title')}
          </Typography>
        </m.div>

        <m.div variants={varBounce('in')}>
          <Typography sx={{ color: 'text.secondary' }}>{t('notFound.description')}</Typography>
        </m.div>

        <m.div variants={varBounce('in')}>
          <PageNotFoundIllustration sx={{ my: { xs: 5, sm: 10 } }} />
        </m.div>

        <Button component={RouterLink} href="/" size="large" variant="contained">
          {t('notFound.goHome')}
        </Button>
      </Container>
    </SimpleLayout>
  );
}
