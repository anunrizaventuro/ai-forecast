import type { Metadata } from 'next';

import { Error500View } from 'src/sections/error/view/500-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: `500 Internal server error! | Error`,
  robots: { index: false, follow: false },
};

export default function Page500() {
  return <Error500View />;
}
