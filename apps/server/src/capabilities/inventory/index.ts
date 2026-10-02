/**
 * Interfaz pública de la capacidad inventario (02 §3–§4). No tiene rutas propias: la usan los
 * módulos dueños de cada tipo de ítem, con sus rutas y permisos, dentro de su transacción admitida.
 */
export { createItem, createLot } from './application/catalog.js';
export type { InventoryContext } from './application/context.js';
export { applyMovement, lockExistingPosition, lockReceiptPosition } from './application/movements.js';
export { countOperationsPerDay, listOperationPage, listPositionPage } from './application/queries.js';
