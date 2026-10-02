import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router';
import { LoginPage } from '../features/auth/login-page';
import { HomePage } from '../features/home/home-page';
import { WorkspacePicker } from '../features/workspaces/workspace-picker';
import { AppShell } from './app-shell';
import { NotFound, PageLoading } from './states';
import { useSession } from './session';

/** Las rutas privadas esperan a conocer la sesión y, sin ella, llevan al acceso. */
function RequireSession() {
  const { session, loading } = useSession();
  const location = useLocation();
  if (loading) return <PageLoading />;
  if (!session) return <Navigate to="/acceso" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export const router = createBrowserRouter([
  { path: '/acceso', element: <LoginPage /> },
  {
    element: <RequireSession />,
    children: [
      { path: '/', element: <Navigate to="/espacios" replace /> },
      { path: '/espacios', element: <WorkspacePicker /> },
      {
        path: '/e/:workspaceId',
        element: <AppShell />,
        children: [
          { index: true, element: <HomePage /> },
          // Ruta diferida por módulo (02 §8): el tablero de Reactivos se descarga al abrirlo.
          {
            path: 'reactivos',
            lazy: async () => ({ Component: (await import('../features/reagents/reagents-page')).ReagentsPage }),
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]);
