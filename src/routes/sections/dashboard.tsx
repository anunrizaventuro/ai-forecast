import type { RouteObject } from 'react-router';

import { Outlet } from 'react-router';
import { lazy, Suspense } from 'react';

import Box from '@mui/material/Box';

import { CONFIG } from 'src/shared/config';
import { PERM } from 'src/shared/lib/permissions';
import { DashboardLayout } from 'src/layouts/dashboard';
import { LoadingScreen } from 'src/shared/ui/loading-screen';
import { AuthGuard, PermissionGuard } from 'src/module/core/features/auth/guard';

import { usePathname } from '../hooks';

// ----------------------------------------------------------------------

const BranchesListPage = lazy(() => import('src/module/core/features/branches/pages/list'));
const RolesListPage = lazy(() => import('src/module/core/features/roles/pages/list'));
const UsersListPage = lazy(() => import('src/module/core/features/users/pages/list'));
const TranslationOverridePage = lazy(
  () => import('src/module/core/features/translation-override/pages/list')
);

// ----------------------------------------------------------------------

function SuspenseOutlet() {
  const pathname = usePathname();
  return (
    <Suspense key={pathname} fallback={<LoadingScreen />}>
      <Outlet />
    </Suspense>
  );
}

const dashboardLayout = () => (
  <DashboardLayout>
    <SuspenseOutlet />
  </DashboardLayout>
);

function gated(require: string | string[], element: React.ReactElement) {
  return (
    <PermissionGuard require={require} showForbidden>
      {element}
    </PermissionGuard>
  );
}

export const dashboardRoutes: RouteObject[] = [
  {
    path: '/',
    element: CONFIG.auth.skip ? dashboardLayout() : <AuthGuard>{dashboardLayout()}</AuthGuard>,
    children: [
      { element: <Box sx={{ p: 3 }}>AI Forecast</Box>, index: true },
      { path: 'settings/branches', element: gated(PERM.branches.read, <BranchesListPage />) },
      { path: 'settings/roles', element: gated(PERM.roles.read, <RolesListPage />) },
      {
        path: 'settings/users',
        element: gated(PERM.userManagement.read, <UsersListPage />),
      },
      {
        path: 'settings/translation-override',
        element: gated(PERM.translationOverrides.read, <TranslationOverridePage />),
      },
    ],
  },
];
