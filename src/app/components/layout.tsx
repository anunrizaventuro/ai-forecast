import type { Metadata } from 'next';

import { MainLayout } from 'src/layouts/main';

// ----------------------------------------------------------------------

// Galeri referensi komponen (living docs untuk programmer & AI).
// Akses production digate lewat src/middleware.ts (NEXT_PUBLIC_SHOW_COMPONENTS)
// — notFound() di layout tidak bisa menggate halaman yang di-prerender statis.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  return <MainLayout>{children}</MainLayout>;
}
