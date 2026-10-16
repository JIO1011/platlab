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
        { path: 'inventario', lazy: async () => ({ Component: (await pages()).EquipmentInventoryPage }) },
        // Fallas reportadas; la hoja de una falla se abre con `?falla=`.
        { path: 'reportes', lazy: async () => ({ Component: (await pages()).EquipmentFaultsPage }) },
        // Ficha del equipo, segundo nivel del inventario.
        { path: 'inventario/:assetId', lazy: async () => ({ Component: (await pages()).EquipmentAssetPage }) },
      ],
    },
  ],
};
