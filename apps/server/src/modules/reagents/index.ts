/** Interfaz pública de Reactivos (02 §3): rutas, aportes al Inicio y a Áreas (ADR 0024) y lo que Laboratorios pide (ADR 0023). */
export { reagentsAreaContribution, reagentsHome } from './application/queries.js';
export { reagentsRoutes } from './http/routes.js';
export {
  consumeReagentHolds,
  heldReagentQuantities,
  holdReagentForActivity,
  reagentHoldOptions,
  reagentStockBreakdown,
  reagentStockByArea,
  reholdReagentForActivity,
  releaseReagentHolds,
  requestableReagents,
  type RequestableReagent,
} from './application/requestables.js';
