import type { Metadata } from 'next';

import { FormWizardView } from 'src/sections/_examples/form-wizard-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: `Form wizard | Components` };

export default function Page() {
  return <FormWizardView />;
}
