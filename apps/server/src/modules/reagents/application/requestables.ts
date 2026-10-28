import { heldForActivity, holdableByArea, holdForActivity, releaseActivityHolds } from '../../../capabilities/inventory/index.js';
import type { WorkspaceAccess } from '../../core/index.js';
import { requestableReagents as requestableReagentsQuery } from '../infrastructure/requestables.queries.js';
import { inventoryContext } from './command.js';

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

/**
 * Aparta un reactivo para un bloque de Laboratorios (ADR 0023, L-01d) por la capacidad inventario, dentro de la
 * transacción de Laboratorios ya admitida con Reactivos. Devuelve lo apartado por frasco; lo que falta, no se aparta.
 */
export function holdReagentForActivity(
  access: WorkspaceAccess,
  input: { itemId: string; quantity: string; validOn: string; reason: string; destination: string },
): Promise<Array<{ allocationId: string; quantity: string }>> {
  return holdForActivity(inventoryContext(access), input);
}

/** Libera lo apartado para un bloque, con su motivo. */
export function releaseReagentHolds(access: WorkspaceAccess, allocationIds: readonly string[], reason: string): Promise<void> {
  return releaseActivityHolds(inventoryContext(access), allocationIds, reason);
}

/** Lo que sigue apartado de cada reserva de bloque, por reserva. */
export function heldReagentQuantities(access: WorkspaceAccess, allocationIds: readonly string[]): Promise<Map<string, string>> {
  return heldForActivity({ client: access.client, workspaceId: access.workspace.id }, allocationIds);
}

/** Lo que se podría apartar de cada reactivo el día `validOn`, por área: las alternativas antes de enviar (ADR 0023). */
export function reagentStockByArea(access: WorkspaceAccess, itemIds: readonly string[], validOn: string) {
  return holdableByArea(inventoryContext(access), itemIds, validOn);
}
