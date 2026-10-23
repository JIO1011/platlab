/** Interfaz pública de Reactivos (02 §3): rutas, aportes a la tarjeta de Inicio y a Áreas (ADR 0024) y lo que Laboratorios pide (ADR 0023). */
export { reagentsAreaContribution, reagentsHomeSummary } from './application/queries.js';
export { reagentsRoutes } from './http/routes.js';
export { requestableReagents, type RequestableReagent } from './application/requestables.js';
