import type { ModuleRoutes } from '../../app/web-module';

/** Un solo fragmento diferido para todo el módulo (02 §8): se descarga al abrir su primera ruta. */
const pages = () => import('./pages');

/**
 * Rutas de la app de Materiales (ADR 0025). Sus secciones coinciden con las del manifiesto, que el servidor filtra
 * por permiso en /me.
 */
export const materialsRoutes: ModuleRoutes = {
  top: [],
  workspace: [
    {
      path: 'materiales',
      lazy: async () => ({ Component: (await pages()).MaterialsLayout }),
      children: [
        { index: true, lazy: async () => ({ Component: (await pages()).MaterialsSummaryPage }) },
        // Los materiales con lo disponible hoy; la ficha de cada uno abre sobre la lista.
        { path: 'inventario', lazy: async () => ({ Component: (await pages()).MaterialsInventoryPage }) },
        // El mostrador: `?filtro=`, `?vale=` y `?nuevo=1`.
        { path: 'prestamos', lazy: async () => ({ Component: (await pages()).MaterialsLoansPage }) },
      ],
    },
  ],
};
