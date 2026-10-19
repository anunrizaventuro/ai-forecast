import Box from '@mui/material/Box';

import { PageHeader } from 'src/shared/ui/page-header';

import { ForecastSourceChip } from './forecast-source-chip';

// ----------------------------------------------------------------------

type Props = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

/** `PageHeader` skeleton + penanda sumber data di sisi kanan. */
export function ForecastPageHeader({ title, description, action }: Props) {
  return (
    <PageHeader
      title={title}
      subtitle={description}
      action={
        <Box sx={{ gap: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
          <ForecastSourceChip />
          {action}
        </Box>
      }
    />
  );
}
