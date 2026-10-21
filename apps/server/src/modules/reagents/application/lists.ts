import type pg from 'pg';
import type { z } from 'zod';
import type { createReasonRequest, ListEntry } from '@platlab/contracts';
import { addReason, retireReason } from '../../../capabilities/inventory/index.js';
import { recordAudit } from '../../core/index.js';
import { CATALOG, inventoryContext, requires, runCommand, type CommandRequest } from './command.js';

/** Motivos (ADR 0012): los administra el Administrador; se archivan. */

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
