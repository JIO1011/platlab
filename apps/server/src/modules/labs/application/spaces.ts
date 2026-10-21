import type pg from 'pg';
import type { z } from 'zod';
import type { createSpaceRequest, Space, SpaceList, updateSpaceRequest, WeeklyHours } from '@platlab/contracts';
import { AppError } from '../../../platform/errors.js';
import {
  recordAudit,
  requireEditable,
  requires,
  type CommandRequest,
  type QueryRequest,
  type WorkspaceAccess,
} from '../../core/index.js';
import {
  archiveSpace as archiveSpaceQuery,
  insertSpace,
  listSpaces as listSpacesQuery,
  lockSpace,
  shareActiveArea,
  writeSpace,
  type IListSpacesResult,
} from '../infrastructure/spaces.queries.js';
import { runCommand, runQuery, SPACE_MANAGE } from './command.js';

/**
 * Espacios (ADR 0023): se agenda el área completa del Núcleo. El Administrador la habilita con aforo y
 * horario semanal, los edita y la archiva; las áreas se crean en «Áreas» (ADR 0024).
 */

const toSpace = (row: IListSpacesResult): Space => ({
  areaId: row.area_id,
  areaName: row.area_name,
  groupName: row.group_name,
  areaArchived: row.area_archived,
  capacity: row.capacity,
  weeklyHours: row.weekly_hours as WeeklyHours,
  version: row.version,
  archivedAt: row.archived_at?.toISOString() ?? null,
});

async function spaceById(access: WorkspaceAccess, areaId: string): Promise<Space> {
  const [row] = await listSpacesQuery.run({ workspaceId: access.workspace.id, areaId }, access.client);
  if (!row) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
  return toSpace(row);
}

export function listSpaces(pool: pg.Pool, request: QueryRequest): Promise<SpaceList> {
  return runQuery(pool, request, async (access) => {
    const rows = await listSpacesQuery.run({ workspaceId: access.workspace.id, areaId: null }, access.client);
    return { items: rows.map(toSpace) };
  });
}

/**
 * Habilita un área activa del Núcleo, bloqueada compartida antes que el espacio (orden de 02 §6). Un
 * espacio archivado se reactiva con los datos nuevos; uno activo ya está habilitado.
 */
export function createSpace(pool: pg.Pool, request: CommandRequest, input: z.infer<typeof createSpaceRequest>): Promise<Space> {
  return runCommand(pool, request, 'labs.space.create', input, requires(SPACE_MANAGE), async (access) => {
    const workspaceId = access.workspace.id;
    const [area] = await shareActiveArea.run({ workspaceId, areaId: input.areaId }, access.client);
    if (!area) throw new AppError('VALIDATION_FAILED', 'Elige un área activa de «Áreas»');
    const alreadyEnabled = () => new AppError('VALIDATION_FAILED', 'Esa área ya está habilitada como espacio');
    const values = { workspaceId, areaId: input.areaId, capacity: input.capacity, weeklyHours: JSON.stringify(input.weeklyHours) };
    const [current] = await lockSpace.run({ workspaceId, areaId: input.areaId }, access.client);
    if (current && !current.archived_at) throw alreadyEnabled();
    if (current) {
      await writeSpace.run(values, access.client);
    } else {
      const [created] = await insertSpace.run({ ...values, createdBy: access.principalId }, access.client);
      if (!created) throw alreadyEnabled();
    }
    await recordAudit(access, {
      action: current ? 'labs.space.reactivate' : 'labs.space.create',
      entityType: 'labs.space',
      entityId: input.areaId,
      changes: input,
    });
    return spaceById(access, input.areaId);
  });
}

/** Cambia solo lo que llega, con la versión que la persona vio. */
export function updateSpace(
  pool: pg.Pool,
  request: CommandRequest,
  areaId: string,
  { expectedVersion, ...changes }: z.infer<typeof updateSpaceRequest>,
): Promise<Space> {
  return runCommand(pool, request, 'labs.space.update', { areaId, expectedVersion, ...changes }, requires(SPACE_MANAGE), async (access) => {
    const workspaceId = access.workspace.id;
    const [current] = await lockSpace.run({ workspaceId, areaId }, access.client);
    requireEditable(current, expectedVersion);
    await writeSpace.run(
      {
        workspaceId,
        areaId,
        capacity: changes.capacity ?? current.capacity,
        weeklyHours: JSON.stringify(changes.weeklyHours ?? current.weekly_hours),
      },
      access.client,
    );
    await recordAudit(access, { action: 'labs.space.update', entityType: 'labs.space', entityId: areaId, changes });
    return spaceById(access, areaId);
  });
}

/** Deja de agendarse; sus cierres se conservan y se reactiva habilitando el área otra vez. */
export function archiveSpace(pool: pg.Pool, request: CommandRequest, areaId: string): Promise<Space> {
  return runCommand(pool, request, 'labs.space.archive', { areaId }, requires(SPACE_MANAGE), async (access) => {
    const [current] = await lockSpace.run({ workspaceId: access.workspace.id, areaId }, access.client);
    requireEditable(current);
    await archiveSpaceQuery.run({ workspaceId: access.workspace.id, areaId }, access.client);
    await recordAudit(access, { action: 'labs.space.archive', entityType: 'labs.space', entityId: areaId, changes: { archived: true } });
    return spaceById(access, areaId);
  });
}
