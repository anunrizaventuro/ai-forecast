import type { RouteObject } from 'react-router';

import { lazy, Suspense } from 'react';
import { Outlet, Navigate } from 'react-router';

import { CONFIG } from 'src/shared/config';
import { PERM } from 'src/shared/lib/permissions';
import { DashboardLayout } from 'src/layouts/dashboard';
import { LoadingScreen } from 'src/shared/ui/loading-screen';
import { AuthGuard, PermissionGuard } from 'src/module/core/features/auth/guard';

import { usePathname } from '../hooks';
import { legacyRedirects } from '../paths';

// ----------------------------------------------------------------------

const DashboardPage = lazy(() => import('src/module/forecast/features/dashboard/pages'));
const RecommendationPage = lazy(() => import('src/module/forecast/features/recommendation/pages'));
const SalesAnalysisPage = lazy(() => import('src/module/forecast/features/sales-analysis/pages'));
const StoresPage = lazy(() => import('src/module/forecast/features/stores/pages'));
const ProductsPage = lazy(() => import('src/module/forecast/features/products/pages'));
const SettingsPage = lazy(() => import('src/module/forecast/features/settings/pages'));

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

// Halaman core skeleton butuh backend /core/v1 — hanya didaftarkan bila auth aktif.
const coreRoutes: RouteObject[] = CONFIG.auth.skip
  ? []
  : [
      { path: 'settings/branches', element: gated(PERM.branches.read, <BranchesListPage />) },
      { path: 'settings/roles', element: gated(PERM.roles.read, <RolesListPage />) },
      { path: 'settings/users', element: gated(PERM.userManagement.read, <UsersListPage />) },
      {
        path: 'settings/translation-override',
        element: gated(PERM.translationOverrides.read, <TranslationOverridePage />),
      },
    ];

export const dashboardRoutes: RouteObject[] = [
  {
    path: '/',
    element: CONFIG.auth.skip ? dashboardLayout() : <AuthGuard>{dashboardLayout()}</AuthGuard>,
    children: [
      { element: <DashboardPage />, index: true },
      { path: 'rekomendasi-stok', element: <RecommendationPage /> },
      { path: 'analisis-penjualan', element: <SalesAnalysisPage /> },
      { path: 'toko', element: <StoresPage /> },
      { path: 'produk', element: <ProductsPage /> },
      { path: 'pengaturan', element: <SettingsPage /> },
      ...coreRoutes,
    ],
  },
  ...legacyRedirects.map(({ from, to }) => ({
    path: from,
    element: <Navigate to={to} replace />,
  })),
];
