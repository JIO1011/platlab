import { createBrowserRouter, Navigate, Outlet, useLocation } from 'react-router';
import { LoginPage } from '../features/auth/login-page';
import { HomePage } from '../features/home/home-page';
import { WorkspacePicker } from '../features/workspaces/workspace-picker';
import { AppShell } from './app-shell';
import { NotFound, PageLoading } from './states';
import { useSession } from './session';

const reagents = () => import('../features/reagents/reagents-page');

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
      {
        path: '/e/:workspaceId',
        element: <AppShell />,
        children: [
          { index: true, element: <HomePage /> },
          // La app de Reactivos (ADR 0011), diferida (02 §8): se descarga al abrirla. Sus secciones
          // coinciden con las del manifiesto, que el servidor filtra por permiso en /me.
          {
            path: 'reactivos',
            lazy: async () => ({ Component: (await reagents()).ReagentsLayout }),
            children: [
              { index: true, lazy: async () => ({ Component: (await reagents()).ReagentsSummaryPage }) },
              { path: 'inventario', lazy: async () => ({ Component: (await reagents()).ReagentsInventoryPage }) },
              // Ficha del reactivo, segundo nivel del inventario (ADR 0012).
              { path: 'inventario/:productId', lazy: async () => ({ Component: (await reagents()).ReagentsProductPage }) },
              { path: 'movimientos', lazy: async () => ({ Component: (await reagents()).ReagentsMovementsPage }) },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]);
