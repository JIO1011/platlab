import type pg from 'pg';
import { withIdempotency } from '../../../platform/idempotency/idempotency.js';
import { requirePermission, withModuleAccess, type WorkspaceAccess } from './access.js';

/** Petición ya autenticada: el actor y el espacio salen del contexto verificado, nunca del cuerpo. */
export interface QueryRequest {
  subject: string;
  workspaceId: string;
}

export interface CommandRequest extends QueryRequest {
  idempotencyKey: string | undefined;
}

/** Autoriza con un permiso del espacio: el caso común de un comando. */
export const requires = (permission: string) => (access: WorkspaceAccess) => requirePermission(access, permission);

/**
 * Comandos de un módulo: una transacción por comando con la admisión del módulo para operación nueva,
 * el permiso, la clave idempotente, el negocio y la auditoría; se confirma o revierte todo junto. El
 * permiso se comprueba antes de la clave, así un reintento también revalida el acceso. Los roles
 * valen para todo el espacio (ADR 0008): la ubicación la valida la operación, no el permiso.
 */
export function moduleCommand(moduleCode: string) {
  return function runCommand<T>(
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
      { subject: request.subject, workspaceId: request.workspaceId, moduleCode, actionClass },
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
  };
}

/** Consultas de un módulo: admisión de consulta y el permiso de lectura de su catálogo. */
export function moduleQuery(moduleCode: string, readPermission: string) {
  return function runQuery<T>(pool: pg.Pool, request: QueryRequest, work: (access: WorkspaceAccess) => Promise<T>): Promise<T> {
    return withModuleAccess(pool, { ...request, moduleCode, actionClass: 'read_export' }, async (access) => {
      await requirePermission(access, readPermission);
      return work(access);
    });
  };
}
