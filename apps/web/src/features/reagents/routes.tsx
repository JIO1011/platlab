import type { ModuleRoutes } from '../../app/web-module';

/** Un solo fragmento diferido para todo el módulo (02 §8): se descarga al abrir su primera ruta. */
const pages = () => import('./pages');

/**
 * Rutas de la app de Reactivos (ADR 0011). Sus secciones coinciden con las del manifiesto, que el
 * servidor filtra por permiso en /me.
 */
export const reagentsRoutes: ModuleRoutes = {
  // Enlace corto de la etiqueta QR de un frasco (ADR 0012, entrega 4): resuelve espacio y reactivo.
  top: [{ path: '/q/:code', lazy: async () => ({ Component: (await pages()).FrascoLinkPage }) }],
  workspace: [
    {
      path: 'reactivos',
      lazy: async () => ({ Component: (await pages()).ReagentsLayout }),
      children: [
        { index: true, lazy: async () => ({ Component: (await pages()).ReagentsSummaryPage }) },
        { path: 'inventario', lazy: async () => ({ Component: (await pages()).ReagentsInventoryPage }) },
        // Ficha del reactivo, segundo nivel del inventario (ADR 0012).
        { path: 'inventario/:productId', lazy: async () => ({ Component: (await pages()).ReagentsProductPage }) },
        // El QR de la etiqueta abre el frasco en su ficha; la ruta sobrevive al acceso (entrega 4).
        {
          path: 'inventario/:productId/frascos/:containerId',
          lazy: async () => ({ Component: (await pages()).ReagentsProductPage }),
        },
        { path: 'inventario/:productId/etiquetas', lazy: async () => ({ Component: (await pages()).ReagentsLabelsPage }) },
        { path: 'movimientos', lazy: async () => ({ Component: (await pages()).ReagentsMovementsPage }) },
        // Solicitudes de salida (ADR 0012): bandeja de quien aprueba o las propias del Operador.
        { path: 'solicitudes', lazy: async () => ({ Component: (await pages()).ReagentsRequestsPage }) },
      ],
    },
  ],
};
