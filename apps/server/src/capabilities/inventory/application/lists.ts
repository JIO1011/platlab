import { AppError } from '../../../platform/errors.js';
import {
  archiveDestination,
  archiveReason,
  insertDestination,
  insertReason,
  listDestinations,
  listReasons,
} from '../infrastructure/inventory.queries.js';
import type { InventoryContext } from './context.js';

/**
 * Motivos y destinos del espacio (03 §4, ADR 0012), una lista por módulo: el tipo de ítem del
 * contexto decide cuál, así que compartir la capacidad nunca comparte derechos (02 §4). Son
 * ayudas para elegir: la operación guarda el texto elegido y archivar nunca cambia la historia.
 */
export type ReasonKind = 'issue' | 'adjustment' | 'disposal';

export interface ListEntry {
  id: string;
  name: string;
}

export function reasonsOf(ctx: InventoryContext, kind: ReasonKind): Promise<ListEntry[]> {
  return listReasons.run({ workspaceId: ctx.workspaceId, itemKind: ctx.kind, kind }, ctx.client);
}

/** Un nombre que ya está activo no se duplica: se devuelve el existente. */
export async function addReason(ctx: InventoryContext, kind: ReasonKind, name: string): Promise<ListEntry> {
  const [row] = await insertReason.run({ workspaceId: ctx.workspaceId, itemKind: ctx.kind, kind, name }, ctx.client);
  if (!row) throw new Error('El motivo no devolvió fila');
  return row;
}

export async function retireReason(ctx: InventoryContext, id: string): Promise<void> {
  const [row] = await archiveReason.run({ workspaceId: ctx.workspaceId, itemKind: ctx.kind, id }, ctx.client);
  if (!row) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
}

export function destinationsOf(ctx: InventoryContext): Promise<ListEntry[]> {
  return listDestinations.run({ workspaceId: ctx.workspaceId, itemKind: ctx.kind }, ctx.client);
}

export async function addDestination(ctx: InventoryContext, name: string): Promise<ListEntry> {
  const [row] = await insertDestination.run({ workspaceId: ctx.workspaceId, itemKind: ctx.kind, name }, ctx.client);
  if (!row) throw new Error('El destino no devolvió fila');
  return row;
}

export async function retireDestination(ctx: InventoryContext, id: string): Promise<void> {
  const [row] = await archiveDestination.run({ workspaceId: ctx.workspaceId, itemKind: ctx.kind, id }, ctx.client);
  if (!row) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
}
