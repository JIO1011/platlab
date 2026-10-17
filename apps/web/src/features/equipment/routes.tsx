import type { ModuleRoutes } from '../../app/web-module';

/** Un solo fragmento diferido para todo el módulo (02 §8): se descarga al abrir su primera ruta. */
const pages = () => import('./pages');

/**
 * Rutas de la app de Equipos (ADR 0011, 0019). Sus secciones coinciden con las del manifiesto, que el
 * servidor filtra por permiso en /me.
 */
export const equipmentRoutes: ModuleRoutes = {
  top: [],
  workspace: [
    {
      path: 'equipos',
      lazy: async () => ({ Component: (await pages()).EquipmentLayout }),
      children: [
        { index: true, lazy: async () => ({ Component: (await pages()).EquipmentSummaryPage }) },
        // Inventario por áreas (E-01c): las tarjetas y, dentro de un área, sus equipos.
        { path: 'inventario', lazy: async () => ({ Component: (await pages()).EquipmentAreasPage }) },
        { path: 'inventario/area/:areaId', lazy: async () => ({ Component: (await pages()).EquipmentAreaPage }) },
        // Ficha del equipo: se abre desde el Inventario, el Informe, el Resumen y los incidentes.
        { path: 'inventario/:assetId', lazy: async () => ({ Component: (await pages()).EquipmentAssetPage }) },
        // La tabla con filtros que se imprime y se exporta.
        { path: 'informe', lazy: async () => ({ Component: (await pages()).EquipmentReportPage }) },
        // Incidentes, que son las fallas; la hoja de una se abre con `?falla=`.
        { path: 'incidentes', lazy: async () => ({ Component: (await pages()).EquipmentFaultsPage }) },
      ],
    },
  ],
};
