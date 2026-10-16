import type { InventoryContext } from '../../../capabilities/inventory/index.js';
import { moduleCommand, type WorkspaceAccess } from '../../core/index.js';

export { requires, type CommandRequest } from '../../core/index.js';

export const inventoryContext = (access: WorkspaceAccess): InventoryContext => ({
  client: access.client,
  workspaceId: access.workspace.id,
  principalId: access.principalId,
  correlationId: access.correlationId,
  kind: 'reagent',
});

/** Catálogo: alta y edición de reactivos, listas y ubicaciones (Administrador y Propietario). */
export const CATALOG = 'reagents.catalog.manage';

/** Comandos de Reactivos: una transacción con su admisión, permiso, idempotencia y auditoría. */
export const runCommand = moduleCommand('reagents');
