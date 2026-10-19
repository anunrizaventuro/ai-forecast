import { useState, useEffect } from 'react';

import { paths } from 'src/routes/paths';
import { useRouter, usePathname } from 'src/routes/hooks';

import { SplashScreen } from 'src/shared/ui/loading-screen';

import { useAuthContext } from '../hooks';

type AuthGuardProps = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const { authenticated, loading } = useAuthContext();

  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!authenticated) {
      const queryString = new URLSearchParams({ returnTo: pathname }).toString();
      router.replace(`${paths.auth.jwt.signIn}?${queryString}`);
      return;
    }

    setIsChecking(false);
  }, [authenticated, loading, pathname, router]);

  if (isChecking) {
    return <SplashScreen />;
  }

  return <>{children}</>;
}
