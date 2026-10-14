import type { IconifyName } from 'src/components/iconify';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = {
  title: string;
  description?: string;
  /** Ikon yang sama dengan menu sidebar halaman ini. */
  icon?: IconifyName;
  action?: React.ReactNode;
};

export function ForecastPageHeader({ title, description, icon, action }: Props) {
  return (
    <Box
      sx={{
        mb: 3,
        gap: 2,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Box sx={{ gap: 2, minWidth: 0, display: 'flex', alignItems: 'center', maxWidth: 820 }}>
        {icon && (
          <Box
            sx={(theme) => ({
              width: 52,
              height: 52,
              flexShrink: 0,
              display: 'flex',
              borderRadius: 1.75,
              alignItems: 'center',
              justifyContent: 'center',
              color: 'common.white',
              backgroundImage: `linear-gradient(135deg, ${theme.vars.palette.primary.light}, ${theme.vars.palette.primary.dark})`,
              boxShadow: `0 8px 16px -4px ${varAlpha(theme.vars.palette.primary.mainChannel, 0.4)}`,
            })}
          >
            <Iconify icon={icon} width={26} />
          </Box>
        )}
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h4" component="h1">
            {title}
          </Typography>
          {description && (
            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
              {description}
            </Typography>
          )}
        </Box>
      </Box>
      {action}
    </Box>
  );
}
