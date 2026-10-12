import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router';
import { LoginPage } from '../features/auth/login-page';
import { HomePage } from '../features/home/home-page';
import { reagentsRoutes } from '../features/reagents/routes';
import { WorkspacePicker } from '../features/workspaces/workspace-picker';
import { AppShell } from './app-shell';
import type { ModuleRoutes } from './web-module';
import { NotFound, PageLoading } from './states';
import { useSession } from './session';

/** Rutas de los módulos de la web: una línea por módulo (02 §4, paso 6). */
const moduleRoutes: ModuleRoutes[] = [reagentsRoutes];

/** Las rutas privadas esperan a conocer la sesión y, sin ella, llevan al acceso. */
function RequireSession() {
  const { session, loading, expired } = useSession();
  const location = useLocation();
  if (loading) return <PageLoading />;
  if (!session) {
    return <Navigate to={expired ? '/acceso?sesion=expirada' : '/acceso'} replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

export const router = createBrowserRouter([
  { path: '/acceso', element: <LoginPage /> },
  {
    element: <RequireSession />,
    children: [
      { path: '/', element: <Navigate to="/espacios" replace /> },
      { path: '/espacios', element: <WorkspacePicker /> },
      ...moduleRoutes.flatMap((module) => module.top),
      {
        path: '/e/:workspaceId',
        element: <AppShell />,
        children: [
          { index: true, element: <HomePage /> },
          ...moduleRoutes.flatMap((module) => module.workspace),
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]);
