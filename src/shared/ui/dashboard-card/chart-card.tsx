import type { ReactNode } from 'react';
import type { CardProps } from '@mui/material/Card';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';

// ----------------------------------------------------------------------

type Props = CardProps & {
  title: string;
  subheader?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function ChartCard({ title, subheader, action, children, sx, ...other }: Props) {
  return (
    <Card sx={[{ height: '100%' }, ...(Array.isArray(sx) ? sx : [sx])]} {...other}>
      <CardHeader
        title={title}
        subheader={subheader}
        action={action}
        slotProps={{ title: { sx: { typography: 'h6' } } }}
      />
      {children}
    </Card>
  );
}
