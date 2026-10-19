import type { Theme, SxProps } from '@mui/material/styles';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';

import { RouterLink } from 'src/routes/components';

import { Iconify } from 'src/shared/ui/iconify';

// ----------------------------------------------------------------------

type Crumb = {
  label: string;
  href?: string;
};

type Props = {
  title: string;
  subtitle?: string;
  crumbs?: Crumb[];
  action?: React.ReactNode;
  sx?: SxProps<Theme>;
};

export function PageHeader({ title, subtitle, crumbs, action, sx }: Props) {
  return (
    <Box sx={[{ mb: 3 }, ...(Array.isArray(sx) ? sx : [sx])]}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4">{title}</Typography>
          {subtitle && (
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {action}
      </Stack>

      {crumbs && crumbs.length > 0 && (
        <Breadcrumbs
          separator={<Iconify icon="eva:arrow-ios-forward-fill" width={16} />}
          sx={{ mt: 1.5 }}
        >
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            if (isLast || !crumb.href) {
              return (
                <Typography
                  key={crumb.label}
                  variant="body2"
                  sx={{ color: isLast ? 'text.primary' : 'text.secondary' }}
                >
                  {crumb.label}
                </Typography>
              );
            }
            return (
              <Link
                key={crumb.label}
                component={RouterLink}
                href={crumb.href}
                variant="body2"
                color="inherit"
              >
                {crumb.label}
              </Link>
            );
          })}
        </Breadcrumbs>
      )}
    </Box>
  );
}
