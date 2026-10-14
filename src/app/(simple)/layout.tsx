import { SimpleLayout } from 'src/layouts/simple';

// ----------------------------------------------------------------------
// Route group = satu layout bersama tanpa menambah segmen URL.
// Halaman utility compact (coming-soon, maintenance) berbagi SimpleLayout ini.

type Props = {
  children: React.ReactNode;
};

export default function Layout({ children }: Props) {
  return (
    <SimpleLayout
      slotProps={{
        content: { compact: true },
      }}
    >
      {children}
    </SimpleLayout>
  );
}
