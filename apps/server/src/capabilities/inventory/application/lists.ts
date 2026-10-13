import { AppError } from '../../../platform/errors.js';
import {
  archiveArea,
  archiveDestination,
  archiveReason,
  insertArea,
  insertDestination,
  insertReason,
  listAreas,
  listBrands,
  listDestinations,
  listReasons,
} from '../infrastructure/inventory.queries.js';
import type { InventoryContext } from './context.js';

/**
 * Motivos, destinos (03 §4, ADR 0012) y áreas (ADR 0015) del espacio, una lista por módulo: el tipo de ítem del
 * contexto decide cuál, así que compartir la capacidad nunca comparte derechos (02 §4). Son
 * ayudas para elegir: la operación guarda el texto elegido y archivar nunca cambia la historia.
 */
export type ReasonKind = 'issue' | 'adjustment';

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

/** Listas que solo tienen un nombre: destinos de salida y áreas o departamentos (ADR 0015). */
export type NamedList = 'destination' | 'area';

const namedLists = {
  destination: { list: listDestinations, insert: insertDestination, archive: archiveDestination },
  area: { list: listAreas, insert: insertArea, archive: archiveArea },
};

export function entriesOf(ctx: InventoryContext, list: NamedList): Promise<ListEntry[]> {
  return namedLists[list].list.run({ workspaceId: ctx.workspaceId, itemKind: ctx.kind }, ctx.client);
}

/** Un nombre que ya está activo no se duplica: se devuelve el existente. */
export async function addEntry(ctx: InventoryContext, list: NamedList, name: string): Promise<ListEntry> {
  const [row] = await namedLists[list].insert.run({ workspaceId: ctx.workspaceId, itemKind: ctx.kind, name }, ctx.client);
  if (!row) throw new Error('La lista no devolvió fila');
  return row;
}

export async function retireEntry(ctx: InventoryContext, list: NamedList, id: string): Promise<void> {
  const [row] = await namedLists[list].archive.run({ workspaceId: ctx.workspaceId, itemKind: ctx.kind, id }, ctx.client);
  if (!row) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
}

/** Marcas ya usadas en lotes del tipo del módulo, las más recientes primero (ADR 0015). */
export async function brandsOf(ctx: InventoryContext): Promise<string[]> {
  return (await listBrands.run({ workspaceId: ctx.workspaceId, kind: ctx.kind }, ctx.client)).map((row) => row.brand);
}
