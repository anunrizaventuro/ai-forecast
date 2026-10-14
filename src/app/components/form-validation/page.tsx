import type { Metadata } from 'next';

import { FormValidationView } from 'src/sections/_examples/form-validation-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Form validation | Components` };

export default function Page() {
  return <FormValidationView />;
}
