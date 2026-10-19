import Box from '@mui/material/Box';

import { CONFIG } from 'src/shared/config';

// ----------------------------------------------------------------------

const metadata = { title: `Rekomendasi Stok - ${CONFIG.appName}` };

export default function Page() {
  return (
    <>
      <title>{metadata.title}</title>
      <Box sx={{ p: { xs: 2, md: 3 } }}>Rekomendasi Stok</Box>
    </>
  );
}
