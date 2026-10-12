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
      // Enlace corto de la etiqueta QR de un frasco (ADR 0012, entrega 4): resuelve espacio y reactivo.
      { path: '/q/:code', lazy: async () => ({ Component: (await reagents()).FrascoLinkPage }) },
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
              // El QR de la etiqueta abre el frasco en su ficha; la ruta sobrevive al acceso (entrega 4).
              {
                path: 'inventario/:productId/frascos/:containerId',
                lazy: async () => ({ Component: (await reagents()).ReagentsProductPage }),
              },
              { path: 'inventario/:productId/etiquetas', lazy: async () => ({ Component: (await reagents()).ReagentsLabelsPage }) },
              { path: 'movimientos', lazy: async () => ({ Component: (await reagents()).ReagentsMovementsPage }) },
              // Solicitudes de salida (ADR 0012): bandeja de quien aprueba o las propias del Operador.
              { path: 'solicitudes', lazy: async () => ({ Component: (await reagents()).ReagentsRequestsPage }) },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <NotFound /> },
]);
