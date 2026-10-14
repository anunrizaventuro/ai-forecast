import type { Metadata } from 'next';

import { DashboardLayout } from 'src/layouts/dashboard';

// ----------------------------------------------------------------------

// Dashboard internal — jangan diindeks mesin pencari.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
