/**
 * Interfaz pública de la capacidad inventario (02 §3–§4). No tiene rutas propias: la usan los
 * módulos dueños de cada tipo de ítem, con sus rutas y permisos, dentro de su transacción admitida.
 */
export { createItem, hasMovements, lockItem, setMinimum, updateItemFields } from './application/catalog.js';
export { suggestContainerCodes } from './application/codes.js';
export type { InventoryContext } from './application/context.js';
export { addReason, brandsOf, reasonsOf, retireReason } from './application/lists.js';
export {
  adjustByWeight,
  applyMovement,
  countLocation,
  lockExistingPosition,
  receiveContainers,
  setTare,
  transferContainer,
} from './application/movements.js';
export {
  containerItem,
  countOperationsPerDay,
  hasStockAt,
  listOperationPage,
  listPositionPage,
  operationFacetsOf,
  operationTotalsOf,
  stockedItemCounts,
  type OperationFilter,
} from './application/queries.js';
export {
  approveIssueRequest,
  listIssueRequests,
  pendingRequestCount,
  releaseIssueRequest,
  requestIssue,
} from './application/requests.js';
