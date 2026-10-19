import type { ModuleRoutes } from '../../app/web-module';

/** Un solo fragmento diferido para todo el módulo (02 §8): se descarga al abrir su primera ruta. */
const pages = () => import('./pages');

/**
 * Rutas de la app de Mantenimiento (ADR 0020). Sus secciones coinciden con las del manifiesto, que el
 * servidor filtra por permiso en /me.
 */
export const maintenanceRoutes: ModuleRoutes = {
  top: [],
  workspace: [
    {
      path: 'mantenimiento',
      lazy: async () => ({ Component: (await pages()).MaintenanceLayout }),
      children: [
        // El Resumen es la portada (ADR 0021): las cifras, los próximos trabajos, los indicadores y los avisos.
        { index: true, lazy: async () => ({ Component: (await pages()).MaintenanceSummaryPage }) },
        // La lista de trabajo; `?registrar=<equipo>` abre la hoja de registro con ese equipo.
        { path: 'por-hacer', lazy: async () => ({ Component: (await pages()).MaintenanceTodoPage }) },
        // Historial de lo registrado; `?equipo=` deja solo los de ese equipo.
        { path: 'historial', lazy: async () => ({ Component: (await pages()).MaintenanceHistoryPage }) },
        // Planes de trabajo (y, desde su menú, los proveedores).
        // La sección Indicadores se fundió en el Resumen: el enlace viejo lleva allí, con su `#reemplazo`.
        { path: 'indicadores', lazy: async () => ({ Component: (await pages()).IndicatorsRedirect }) },
        { path: 'planes', lazy: async () => ({ Component: (await pages()).MaintenancePlansPage }) },
      ],
    },
  ],
};
