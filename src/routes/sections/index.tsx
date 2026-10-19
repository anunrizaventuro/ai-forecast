import type { RouteObject } from 'react-router';

import { lazy } from 'react';

import { authRoutes } from './auth';
import { dashboardRoutes } from './dashboard';

// ----------------------------------------------------------------------

const Page404 = lazy(() => import('src/module/core/features/error/pages/404'));

export const routesSection: RouteObject[] = [
  // Auth
  ...authRoutes,

  // Dashboard (mounted at '/')
  ...dashboardRoutes,

  // No match
  { path: '*', element: <Page404 /> },
];
