import { insertAuditEvent } from '../infrastructure/audit.queries.js';
import type { WorkspaceAccess } from './access.js';

export interface AuditEntry {
  /** Nombre del permiso o comando, con el prefijo de su módulo (p. ej. reagents.issue.create). */
  action: string;
  entityType: string;
  entityId?: string | null;
  reason?: string | null;
  changes?: Record<string, unknown>;
}

/**
 * Registra la auditoría en la misma transacción que el negocio (02 §5, paso 5): si el comando
 * revierte, no queda auditoría de éxito. El actor y el espacio salen del acceso admitido.
 */
export async function recordAudit(access: WorkspaceAccess, entry: AuditEntry): Promise<string> {
  const [row] = await insertAuditEvent.run(
    {
      workspaceId: access.workspace.id,
      principalId: access.principalId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      correlationId: access.correlationId,
      reason: entry.reason ?? null,
      changes: JSON.stringify(entry.changes ?? {}),
    },
    access.client,
  );
  if (!row) throw new Error('La auditoría no devolvió su identificador');
  return row.id;
}
