import type { CardProps } from '@mui/material/Card';
import type { IconifyName } from 'src/components/iconify';

import { varAlpha } from 'minimal-shared/utils';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';

import { Label } from 'src/components/label';
import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title: string;
  value: string;
  caption?: string;
  icon: IconifyName;
  color?: 'primary' | 'info' | 'warning' | 'secondary';
  estimate?: boolean;
};

export function ForecastKpiCard({
  title,
  value,
  caption,
  icon,
  color = 'primary',
  estimate,
  sx,
  ...other
}: Props) {
  return (
    <Card
      sx={[
        { p: 3, gap: 2, height: 1, display: 'flex', alignItems: 'flex-start' },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
        <Box sx={{ mb: 1, gap: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary' }}>
            {title}
          </Typography>
          {estimate && (
            <Label color="warning" variant="soft" sx={{ height: 20, fontSize: 11 }}>
              Estimasi
            </Label>
          )}
        </Box>
        <Typography variant="h4" component="p" sx={{ wordBreak: 'break-word' }}>
          {value}
        </Typography>
        {caption && (
          <Typography variant="caption" sx={{ mt: 0.5, display: 'block', color: 'text.secondary' }}>
            {caption}
          </Typography>
        )}
      </Box>

      <Box
        sx={(theme) => ({
          width: 44,
          height: 44,
          flexShrink: 0,
          display: 'flex',
          borderRadius: 1.5,
          alignItems: 'center',
          justifyContent: 'center',
          color: `${color}.main`,
          bgcolor: varAlpha(theme.vars.palette[color].mainChannel, 0.08),
        })}
      >
        <Iconify icon={icon} width={24} />
      </Box>
    </Card>
  );
}
