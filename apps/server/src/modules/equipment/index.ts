/**
 * Interfaz pública de Equipos (02 §3): rutas, aportes al Inicio y a Áreas (ADR 0024), y estado e incidentes del equipo
 * para otros módulos, y los tipos que Laboratorios pide (ADR 0023).
 */
export { equipmentHome } from './application/home.js';
export { equipmentAreaContribution } from './application/queries.js';
export { equipmentRoutes } from './http/routes.js';
export { recordConservation, requireActiveAsset } from './application/status.js';
export { frequentFaultAssets, lockAssetFault, openFaultsOf, reportAssetFault, resolveAssetFault } from './application/faults.js';
export { assetCodes, operationalAssetsOfTypes, requestableAssetTypes, type RequestableAssetType } from './application/requestables.js';
