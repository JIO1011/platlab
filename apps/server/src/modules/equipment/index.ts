/** Interfaz pública de Equipos (02 §3): rutas, aporte a la tarjeta de Inicio y estado del equipo para otros módulos. */
export { equipmentHomeSummary } from './application/queries.js';
export { equipmentRoutes } from './http/routes.js';
export { recordConservation, requireActiveAsset } from './application/status.js';
