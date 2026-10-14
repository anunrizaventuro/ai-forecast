import type { Metadata } from 'next';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';

// ----------------------------------------------------------------------
// Reference: dynamic route recipe — async data fetch + static params (SSG) +
// dynamic metadata. Preserved from the original `marketing/case-studies/[id]`
// demo so the pattern survives the template cleanup. Swap `fetchItem` for your
// real data source (DB/API) and delete this file once you have a real route.
// ----------------------------------------------------------------------

type Params = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Params) {
  const { id } = await params;

  const data = await fetchItem(id);

  return (
    <Container sx={{ minHeight: 560 }}>
      <Typography variant="h4">Item: {data?.id ?? 'not found'}</Typography>
    </Container>
  );
}

// ----------------------------------------------------------------------

async function fetchItem(paramId: string) {
  try {
    // Replace with a real fetch (DB/API). Simulated async lookup:
    await new Promise((resolve) => setTimeout(resolve, 300));
    return { id: paramId };
  } catch (error) {
    console.error(error);
    return undefined;
  }
}

/**
 * https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes#generating-static-params
 */
export async function generateStaticParams() {
  // Return the list of ids to pre-render at build time.
  return [{ id: '1' }];
}

/**
 * https://nextjs.org/docs/app/building-your-application/optimizing/metadata#dynamic-metadata
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;

  const data = await fetchItem(id);

  return { title: `Item ${data?.id}`, robots: { index: false, follow: false } };
}
