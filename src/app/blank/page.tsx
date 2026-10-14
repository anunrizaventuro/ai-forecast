import type { Metadata } from 'next';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Blank`, robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Container sx={{ minHeight: 560 }}>
      <Typography variant="h4">Blank</Typography>
    </Container>
  );
}
