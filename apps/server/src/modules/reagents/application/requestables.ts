import type { WorkspaceAccess } from '../../core/index.js';
import { requestableReagents as requestableReagentsQuery } from '../infrastructure/requestables.queries.js';

export interface RequestableReagent {
  id: string;
  code: string;
  name: string;
  unit: string;
  /** Lo usable hoy, en la unidad base: sin cuarentena ni lotes vencidos. Cadena decimal exacta. */
  available: string;
}

/**
 * Reactivos que Laboratorios ofrece y valida en una solicitud (ADR 0023): sin reservar nada. Con `itemIds`, esos; si
 * no, los activos cuyo nombre o código contienen `q` (vacío, todos, hasta 200).
 */
export async function requestableReagents(access: WorkspaceAccess, filter: { q?: string; itemIds?: string[] }): Promise<RequestableReagent[]> {
  const rows = await requestableReagentsQuery.run(
    { workspaceId: access.workspace.id, timeZone: access.workspace.timeZone, q: filter.q ?? '', itemIds: filter.itemIds ?? null },
    access.client,
  );
  return rows.map((row) => ({ id: row.id, code: row.code, name: row.name, unit: row.unit, available: row.available }));
}
