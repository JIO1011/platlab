/**
 * Lo que Mantenimiento pinta dentro de Equipos (ADR 0020), en su propio fragmento: la ficha y la tabla de
 * equipos no descargan las páginas del módulo. Aparte de `pages.ts` también por las fronteras: las páginas
 * importan el shell, que importa el registro de módulos, y el descriptor no puede volver a ellas.
 */
export { AssetMaintenanceEvents } from './asset-events';
export { AssetMaintenanceTab } from './asset-tab';
export { CalibrationStatus } from './calibration-status';
export { NextDueCell } from './next-due-cell';
export { RepairAction } from './repair-action';
