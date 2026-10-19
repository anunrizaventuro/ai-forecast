import type { Theme, SxProps } from '@mui/material/styles';

import { m } from 'framer-motion';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

import { ForbiddenIllustration } from 'src/assets/illustrations';
import { varBounce, MotionContainer } from 'src/shared/ui/animate';

import { usePermission } from '../hooks/use-permission';

export type PermissionGuardProps = {
  children: React.ReactNode;
  require?: string | string[];
  mode?: 'all' | 'any';
  fallback?: React.ReactNode;
  showForbidden?: boolean;
  sx?: SxProps<Theme>;
};

export function PermissionGuard({
  children,
  require,
  mode = 'all',
  fallback = null,
  showForbidden = false,
  sx,
}: PermissionGuardProps) {
  const { can, canAll, canAny } = usePermission();

  const allowed = (() => {
    if (!require) return true;
    if (typeof require === 'string') return can(require);
    return mode === 'all' ? canAll(require) : canAny(require);
  })();

  if (allowed) return <>{children}</>;

  if (showForbidden) {
    return (
      <Container
        component={MotionContainer}
        sx={[{ textAlign: 'center' }, ...(Array.isArray(sx) ? sx : [sx])]}
      >
        <m.div variants={varBounce('in')}>
          <Typography variant="h3" sx={{ mb: 2 }}>
            Permission denied
          </Typography>
        </m.div>

        <m.div variants={varBounce('in')}>
          <Typography sx={{ color: 'text.secondary' }}>
            You do not have permission to access this page.
          </Typography>
        </m.div>

        <m.div variants={varBounce('in')}>
          <ForbiddenIllustration sx={{ my: { xs: 5, sm: 10 } }} />
        </m.div>
      </Container>
    );
  }

  return <>{fallback}</>;
}
