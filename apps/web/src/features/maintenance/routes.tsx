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
        { index: true, lazy: async () => ({ Component: (await pages()).MaintenanceSummaryPage }) },
        // Por hacer y, con `?vista=completados` (y `&equipo=`), los completados; `?registrar=` abre la hoja con ese equipo.
        { path: 'trabajos', lazy: async () => ({ Component: (await pages()).MaintenanceWorkPage }) },
        // Planes de trabajo y, con `?vista=proveedores`, los proveedores del espacio.
        { path: 'planes', lazy: async () => ({ Component: (await pages()).MaintenancePlansPage }) },
      ],
    },
  ],
};
