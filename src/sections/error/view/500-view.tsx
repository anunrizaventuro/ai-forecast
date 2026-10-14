'use client';

import { m } from 'framer-motion';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { RouterLink } from 'src/routes/components';

import { CONFIG } from 'src/global-config';
import { SimpleLayout } from 'src/layouts/simple';

import { varBounce, MotionContainer } from 'src/components/animate';

// ----------------------------------------------------------------------
// Statis — tanpa sumber data. Dirender oleh src/app/error.tsx (error boundary
// global, termasuk gagal fetch transien di halaman ISR) dan route pratinjau
// /error/500. Membawa SimpleLayout sendiri (error boundary di luar layout).

export function Error500View() {
  return (
    <SimpleLayout slotProps={{ content: { compact: true } }}>
      <MotionContainer>
        <m.div variants={varBounce('in')}>
          <Typography variant="h3" sx={{ mb: 2 }}>
            500 internal server error
          </Typography>
        </m.div>

        <m.div variants={varBounce('in')}>
          <Typography sx={{ color: 'text.secondary' }}>
            There was an error, please try again later.
          </Typography>
        </m.div>

        <m.div variants={varBounce('in')}>
          <Box
            component="img"
            alt="Error"
            src={`${CONFIG.assetsDir}/assets/illustrations/illustration-500.svg`}
            sx={{
              mx: 'auto',
              width: 320,
              maxWidth: 1,
              height: 'auto',
              my: { xs: 5, sm: 10 },
            }}
          />
        </m.div>

        <Button component={RouterLink} href="/" size="large" color="inherit" variant="contained">
          Go to home
        </Button>
      </MotionContainer>
    </SimpleLayout>
  );
}
