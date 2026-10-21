import type pg from 'pg';
import type { z } from 'zod';
import { periodDatesValid, type createPeriodRequest, type Period, type PeriodList, type updatePeriodRequest } from '@platlab/contracts';
import { AppError } from '../../../platform/errors.js';
import { recordAudit, requireEditable, requires, type CommandRequest, type QueryRequest, type WorkspaceAccess } from '../../core/index.js';
import {
  archivePeriod as archivePeriodQuery,
  insertPeriod,
  listPeriods as listPeriodsQuery,
  lockPeriod,
  writePeriod,
  type IListPeriodsResult,
} from '../infrastructure/periods.queries.js';
import { runCommand, runQuery, SPACE_MANAGE } from './command.js';

/**
 * Períodos (ADR 0023, «Períodos y sigla»): identifican la actividad en el código de la solicitud programada y fuera
 * de ellos no se agenda. Los administra el Administrador, junto a la anticipación; se archivan, no se borran.
 */

const toPeriod = (row: IListPeriodsResult): Period => ({
  id: row.id,
  code: row.code,
  startsOn: row.starts_on,
  endsOn: row.ends_on,
  version: row.version,
  archivedAt: row.archived_at?.toISOString() ?? null,
});

async function periodById(access: WorkspaceAccess, periodId: string): Promise<Period> {
  const [row] = await listPeriodsQuery.run({ workspaceId: access.workspace.id, periodId }, access.client);
  if (!row) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
  return toPeriod(row);
}

/** Un código activo repetido es CODE_TAKEN y unas fechas que se cruzan con otro período activo, VALIDATION_FAILED. */
async function withFreePeriod<T>(code: string, write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (error) {
    const constraint = (error as { constraint?: unknown }).constraint;
    if (constraint === 'periods_active_code') throw new AppError('CODE_TAKEN', `Ya hay un período ${code}`);
    if (constraint === 'periods_no_overlap') throw new AppError('VALIDATION_FAILED', 'Esas fechas se cruzan con otro período');
    throw error;
  }
}

export function listPeriods(pool: pg.Pool, request: QueryRequest): Promise<PeriodList> {
  return runQuery(pool, request, async (access) => {
    const rows = await listPeriodsQuery.run({ workspaceId: access.workspace.id, periodId: null }, access.client);
    return { items: rows.map(toPeriod) };
  });
}

export function createPeriod(pool: pg.Pool, request: CommandRequest, input: z.infer<typeof createPeriodRequest>): Promise<Period> {
  return runCommand(pool, request, 'labs.period.create', input, requires(SPACE_MANAGE), async (access) => {
    const [created] = await withFreePeriod(input.code, () =>
      insertPeriod.run({ workspaceId: access.workspace.id, ...input, createdBy: access.principalId }, access.client),
    );
    await recordAudit(access, { action: 'labs.period.create', entityType: 'labs.period', entityId: created!.id, changes: input });
    return periodById(access, created!.id);
  });
}

/** Cambia solo lo que llega, con la versión que la persona vio; las fechas combinadas deben seguir siendo válidas. */
export function updatePeriod(
  pool: pg.Pool,
  request: CommandRequest,
  periodId: string,
  { expectedVersion, ...changes }: z.infer<typeof updatePeriodRequest>,
): Promise<Period> {
  return runCommand(pool, request, 'labs.period.update', { periodId, expectedVersion, ...changes }, requires(SPACE_MANAGE), async (access) => {
    const workspaceId = access.workspace.id;
    const [current] = await lockPeriod.run({ workspaceId, periodId }, access.client);
    requireEditable(current, expectedVersion);
    const next = { code: changes.code ?? current.code, startsOn: changes.startsOn ?? current.starts_on, endsOn: changes.endsOn ?? current.ends_on };
    if (!periodDatesValid(next.startsOn, next.endsOn)) {
      throw new AppError('VALIDATION_FAILED', 'El período empieza antes de terminar y dura hasta un año');
    }
    await withFreePeriod(next.code, () => writePeriod.run({ workspaceId, periodId, ...next }, access.client));
    await recordAudit(access, { action: 'labs.period.update', entityType: 'labs.period', entityId: periodId, changes });
    return periodById(access, periodId);
  });
}

/** Deja de agendarse en él; libera su código y sus fechas. */
export function archivePeriod(pool: pg.Pool, request: CommandRequest, periodId: string): Promise<Period> {
  return runCommand(pool, request, 'labs.period.archive', { periodId }, requires(SPACE_MANAGE), async (access) => {
    const [current] = await lockPeriod.run({ workspaceId: access.workspace.id, periodId }, access.client);
    requireEditable(current);
    await archivePeriodQuery.run({ workspaceId: access.workspace.id, periodId }, access.client);
    await recordAudit(access, { action: 'labs.period.archive', entityType: 'labs.period', entityId: periodId, changes: { archived: true } });
    return periodById(access, periodId);
  });
}
