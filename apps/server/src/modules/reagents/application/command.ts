import type pg from 'pg';
import type { InventoryContext } from '../../../capabilities/inventory/index.js';
import { withIdempotency } from '../../../platform/idempotency/idempotency.js';
import { requirePermission, withModuleAccess, type WorkspaceAccess } from '../../core/index.js';

/** Petición ya autenticada: el actor y el espacio salen del contexto verificado, nunca del cuerpo. */
export interface CommandRequest {
  subject: string;
  workspaceId: string;
  idempotencyKey: string | undefined;
}

export const inventoryContext = (access: WorkspaceAccess): InventoryContext => ({
  client: access.client,
  workspaceId: access.workspace.id,
  principalId: access.principalId,
  correlationId: access.correlationId,
  kind: 'reagent',
});

/** Catálogo: alta y edición de reactivos, listas y ubicaciones (Administrador y Propietario). */
export const CATALOG = 'reagents.catalog.manage';

/** Autoriza con un permiso del espacio: el caso común de `runCommand`. */
export const requires = (permission: string) => (access: WorkspaceAccess) => requirePermission(access, permission);

/**
 * Una transacción por comando (primer incremento): admisión de Reactivos para operación nueva,
 * permiso, clave idempotente, negocio y auditoría; se confirma o revierte todo junto. El permiso se
 * comprueba antes de la clave, así un reintento también revalida el acceso. Los roles valen para
 * todo el espacio (ADR 0008): la ubicación la valida la operación, no el permiso.
 */
export function runCommand<T>(
  pool: pg.Pool,
  request: CommandRequest,
  operation: string,
  input: unknown,
  authorize: (access: WorkspaceAccess) => Promise<void>,
  work: (access: WorkspaceAccess) => Promise<T>,
  // Decidir una solicitud es resolver un pendiente (ADR 0009): sigue admitido en consulta o cierre.
  actionClass: 'new_operation' | 'resolve_pending' = 'new_operation',
): Promise<T> {
  return withModuleAccess(
    pool,
    { subject: request.subject, workspaceId: request.workspaceId, moduleCode: 'reagents', actionClass },
    async (access) => {
      await authorize(access);
      return withIdempotency(
        access.client,
        {
          workspaceId: access.workspace.id,
          principalId: access.principalId,
          operation,
          key: request.idempotencyKey,
          input,
        },
        () => work(access),
      );
    },
  );
}
