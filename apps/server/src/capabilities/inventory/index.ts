/**
 * Interfaz pública de la capacidad inventario (02 §3–§4). No tiene rutas propias: la usan los
 * módulos dueños de cada tipo de ítem, con sus rutas y permisos, dentro de su transacción admitida.
 */
export { createItem, createLot, setMinimum } from './application/catalog.js';
export type { InventoryContext } from './application/context.js';
export {
  addDestination,
  addReason,
  destinationsOf,
  reasonsOf,
  retireDestination,
  retireReason,
} from './application/lists.js';
export { applyMovement, lockExistingPosition, receiveContainers } from './application/movements.js';
export { countOperationsPerDay, listOperationPage, listPositionPage } from './application/queries.js';
export {
  approveIssueRequest,
  listIssueRequests,
  pendingRequestCount,
  releaseIssueRequest,
  requestIssue,
} from './application/requests.js';
