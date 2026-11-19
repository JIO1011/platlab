import type { InventoryContext } from '../../../capabilities/inventory/index.js';
import { moduleCommand, moduleQuery, type WorkspaceAccess } from '../../core/index.js';

export { requires, type CommandRequest, type QueryRequest } from '../../core/index.js';

export const inventoryContext = (access: WorkspaceAccess): InventoryContext => ({
  client: access.client,
  workspaceId: access.workspace.id,
  principalId: access.principalId,
  correlationId: access.correlationId,
  kind: 'material',
});

/** Permisos de Materiales (manifiesto, ADR 0025; matriz de 01 §5). */
const READ = 'materials.catalog.read';
/** Catálogo: alta, ficha y mínimo (Administrador y Propietario). */
export const CATALOG = 'materials.catalog.manage';
export const RECEIPT = 'materials.receipt.create';
export const ISSUE = 'materials.issue.create';
/** Ajustes de existencias: Administrador y Propietario. */
export const ADJUSTMENT = 'materials.adjustment.create';
/** Prestar y recibir devoluciones: Operador y Administrador (01 §5). */
export const LOAN = 'materials.loan.create';
export const RETURN = 'materials.loan.return';

/** Comandos de Materiales: una transacción con su admisión, permiso, idempotencia y auditoría. */
export const runCommand = moduleCommand('materials');

/** Consultas de Materiales: admisión de consulta y lectura del catálogo. */
export const runQuery = moduleQuery('materials', READ);
