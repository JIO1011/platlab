import type pg from 'pg';
import type { z } from 'zod';
import type { createEntryRequest, createReasonRequest, ListEntry } from '@platlab/contracts';
import { addEntry, addReason, retireEntry, retireReason, type NamedList } from '../../../capabilities/inventory/index.js';
import { recordAudit } from '../../core/index.js';
import { CATALOG, inventoryContext, requires, runCommand, type CommandRequest } from './command.js';

/** Motivos, destinos (ADR 0012) y áreas (ADR 0015): las administra el Administrador; se archivan. */

export function createReason(
  pool: pg.Pool,
  request: CommandRequest,
  input: z.infer<typeof createReasonRequest>,
): Promise<ListEntry> {
  return runCommand(pool, request, 'reagents.reason.create', input, requires(CATALOG), async (access) => {
    const entry = await addReason(inventoryContext(access), input.kind, input.name);
    await recordAudit(access, {
      action: 'reagents.reason.create',
      entityType: 'inventory.reason',
      entityId: entry.id,
      changes: { kind: input.kind, name: entry.name },
    });
    return entry;
  });
}

export function archiveReason(pool: pg.Pool, request: CommandRequest, id: string): Promise<{ id: string }> {
  return runCommand(pool, request, 'reagents.reason.archive', { id }, requires(CATALOG), async (access) => {
    await retireReason(inventoryContext(access), id);
    await recordAudit(access, { action: 'reagents.reason.archive', entityType: 'inventory.reason', entityId: id, changes: {} });
    return { id };
  });
}

/** Alta de un destino o un área; un nombre activo repetido devuelve el existente. */
export function createEntry(
  pool: pg.Pool,
  request: CommandRequest,
  list: NamedList,
  input: z.infer<typeof createEntryRequest>,
): Promise<ListEntry> {
  const action = `reagents.${list}.create`;
  return runCommand(pool, request, action, input, requires(CATALOG), async (access) => {
    const entry = await addEntry(inventoryContext(access), list, input.name);
    await recordAudit(access, { action, entityType: `inventory.${list}`, entityId: entry.id, changes: { name: entry.name } });
    return entry;
  });
}

export function archiveEntry(pool: pg.Pool, request: CommandRequest, list: NamedList, id: string): Promise<{ id: string }> {
  const action = `reagents.${list}.archive`;
  return runCommand(pool, request, action, { id }, requires(CATALOG), async (access) => {
    await retireEntry(inventoryContext(access), list, id);
    await recordAudit(access, { action, entityType: `inventory.${list}`, entityId: id, changes: {} });
    return { id };
  });
}
