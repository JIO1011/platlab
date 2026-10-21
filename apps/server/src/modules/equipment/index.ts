/**
 * Interfaz pública de Equipos (02 §3): rutas, aportes a la tarjeta de Inicio y a Áreas (ADR 0024), y estado e incidentes del equipo
 * para otros módulos.
 */
export { equipmentAreaContribution, equipmentHomeSummary } from './application/queries.js';
export { equipmentRoutes } from './http/routes.js';
export { recordConservation, requireActiveAsset } from './application/status.js';
export { frequentFaultAssets, lockAssetFault, openFaultsOf, resolveAssetFault } from './application/faults.js';
