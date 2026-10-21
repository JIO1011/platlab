import type pg from 'pg';
import type { z } from 'zod';
import type { Closure, ClosureList, closureListQuery, createClosureRequest } from '@platlab/contracts';
import { AppError } from '../../../platform/errors.js';
import { recordAudit, requires, type CommandRequest, type QueryRequest, type WorkspaceAccess } from '../../core/index.js';
import {
  insertClosure,
  listClosures as listClosuresQuery,
  lockClosure,
  voidClosure as voidClosureQuery,
  type IListClosuresResult,
} from '../infrastructure/closures.queries.js';
import { shareSpace } from '../infrastructure/spaces.queries.js';
import { runCommand, runQuery, SPACE_MANAGE } from './command.js';

/** Cierres (ADR 0023): de un espacio o, sin área, feriados comunes que se cargan una vez. Se anulan, no se borran. */

const toClosure = (row: IListClosuresResult): Closure => ({
  id: row.id,
  areaId: row.area_id,
  areaName: row.area_name,
  startsOn: row.starts_on,
  endsOn: row.ends_on,
  reason: row.reason,
  voidedAt: row.voided_at?.toISOString() ?? null,
  createdAt: row.created_at.toISOString(),
});

async function closureById(access: WorkspaceAccess, closureId: string): Promise<Closure> {
  const [row] = await listClosuresQuery.run(
    { workspaceId: access.workspace.id, closureId, from: null, to: null, includeVoided: null },
    access.client,
  );
  if (!row) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
  return toClosure(row);
}

export function listClosures(pool: pg.Pool, request: QueryRequest, query: z.infer<typeof closureListQuery>): Promise<ClosureList> {
  return runQuery(pool, request, async (access) => {
    const rows = await listClosuresQuery.run({ workspaceId: access.workspace.id, closureId: null, ...query }, access.client);
    return { items: rows.map(toClosure) };
  });
}

/** Un cierre de espacio exige un espacio activo, bloqueado compartido: no se archiva mientras tanto. */
export function createClosure(pool: pg.Pool, request: CommandRequest, input: z.infer<typeof createClosureRequest>): Promise<Closure> {
  return runCommand(pool, request, 'labs.closure.create', input, requires(SPACE_MANAGE), async (access) => {
    const workspaceId = access.workspace.id;
    if (input.areaId !== null) {
      const [space] = await shareSpace.run({ workspaceId, areaId: input.areaId }, access.client);
      if (!space || space.archived_at) throw new AppError('VALIDATION_FAILED', 'Elige un espacio habilitado');
    }
    const [created] = await insertClosure.run({ workspaceId, ...input, createdBy: access.principalId }, access.client);
    await recordAudit(access, { action: 'labs.closure.create', entityType: 'labs.closure', entityId: created!.id, changes: input });
    return closureById(access, created!.id);
  });
}

/** Anular es definitivo: el cierre deja de valer y queda en la historia. */
export function voidClosure(pool: pg.Pool, request: CommandRequest, closureId: string): Promise<Closure> {
  return runCommand(pool, request, 'labs.closure.void', { closureId }, requires(SPACE_MANAGE), async (access) => {
    const workspaceId = access.workspace.id;
    const [current] = await lockClosure.run({ workspaceId, closureId }, access.client);
    if (!current) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
    if (current.voided_at) throw new AppError('VALIDATION_FAILED', 'Ese cierre ya está anulado');
    await voidClosureQuery.run({ workspaceId, closureId, voidedBy: access.principalId }, access.client);
    await recordAudit(access, { action: 'labs.closure.void', entityType: 'labs.closure', entityId: closureId, changes: { voided: true } });
    return closureById(access, closureId);
  });
}
