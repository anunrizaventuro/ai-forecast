import type { Metadata } from 'next';

import { NotFoundView } from 'src/sections/error/view/not-found-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: `404 page not found! | Error`,
  robots: { index: false, follow: false },
};

export default function Page() {
  return <NotFoundView />;
}
