import type pg from 'pg';
import {
  ACTIVITY_CHANGEABLE,
  compareDecimals,
  requestCode,
  sumDecimals,
  type Activity,
  type ActivityStage,
  type ReagentPickOptions,
  type ReagentPicksRequest,
} from '@platlab/contracts';
import { AppError } from '../../../platform/errors.js';
import { moduleAdmits, recordAudit, requirePermission, requires, type CommandRequest, type QueryRequest, type WorkspaceAccess } from '../../core/index.js';
import { reagentHoldOptions, reholdReagentForActivity } from '../../reagents/index.js';
import { activityAllocations, activityReagentLine, insertActivityAllocation, touchActivity } from '../infrastructure/holds.queries.js';
import { lockActivity } from '../infrastructure/schedule.queries.js';
import { runQuery, runScheduleCommand, SCHEDULE_MANAGE } from './command.js';
import { activityById } from './schedule.js';

/**
 * Cambiar los frascos apartados (ADR 0023, «Cierre de Laboratorios»): el Administrador elige, para un reactivo de un
 * bloque, de qué frascos usables y vigentes ese día sale cada cantidad, hasta lo pedido. Lo que no cubre queda «Falta».
 * Todo por la interfaz de Reactivos y solo si ese módulo admite la operación.
 */

const invalid = (message: string) => new AppError('VALIDATION_FAILED', message);
const notFound = () => new AppError('NOT_FOUND', 'Recurso no encontrado');

/** La línea de reactivo del bloque y lo que tiene apartado ahora. */
async function reagentLine(access: WorkspaceAccess, activityId: string, line: number) {
  const workspaceId = access.workspace.id;
  const [row] = await activityReagentLine.run({ workspaceId, activityId, line }, access.client);
  if (!row) throw notFound();
  const allocations = await activityAllocations.run({ workspaceId, activityIds: [activityId] }, access.client);
  return { ...row, allocationIds: allocations.filter((item) => item.line === line).map((item) => item.allocation_id) };
}

/** Los frascos de los que se puede apartar ese reactivo el día del bloque, con lo que el bloque ya tiene de cada uno. */
export function reagentPickOptions(pool: pg.Pool, request: QueryRequest, activityId: string, line: number): Promise<ReagentPickOptions> {
  return runQuery(pool, request, async (access) => {
    await requirePermission(access, SCHEDULE_MANAGE);
    if (!(await moduleAdmits(access, 'reagents', 'read_export'))) throw invalid('Reactivos no está disponible en este espacio');
    const activity = await activityById(access, activityId);
    const current = await reagentLine(access, activityId, line);
    const items = await reagentHoldOptions(access, { itemId: current.item_id, validOn: activity.date, allocationIds: current.allocationIds });
    return { needed: current.quantity, unit: current.unit, items };
  });
}

/**
 * Aparta de los frascos elegidos y libera lo anterior, en una transacción con la versión del bloque que se vio. Solo
 * en un bloque programado o listo; lo elegido no supera lo pedido.
 */
export function changeReagentPicks(pool: pg.Pool, request: CommandRequest, activityId: string, line: number, input: ReagentPicksRequest): Promise<Activity> {
  return runScheduleCommand(pool, request, 'labs.activity.reagents', { activityId, line, ...input }, requires(SCHEDULE_MANAGE), async (access) => {
    if (!access.optionalAdmitted) throw invalid('Reactivos no admite cambios ahora: los frascos no se pueden cambiar');
    const workspaceId = access.workspace.id;
    const [locked] = await lockActivity.run({ workspaceId, activityId }, access.client);
    if (!locked || locked.cancelled_at) throw notFound();
    if (locked.version !== input.expectedVersion) throw new AppError('VERSION_CONFLICT', 'Otra persona cambió el bloque mientras lo veías: vuelve a cargarlo');
    if (!ACTIVITY_CHANGEABLE.includes(locked.stage as ActivityStage)) throw invalid('Los frascos se cambian antes de iniciar la práctica');
    const current = await reagentLine(access, activityId, line);
    if (compareDecimals(sumDecimals(input.picks.map((pick) => pick.quantity)), current.quantity) > 0) throw invalid('Lo elegido supera lo pedido para esta fecha');
    const held = await reholdReagentForActivity(access, {
      itemId: current.item_id,
      validOn: locked.on_date,
      allocationIds: current.allocationIds,
      picks: input.picks,
      reason: `Práctica ${requestCode(current.request_number)}`,
      destination: current.area_name,
      releaseReason: 'Cambio de frascos',
    });
    for (const hold of held) await insertActivityAllocation.run({ workspaceId, activityId, line, allocationId: hold.allocationId }, access.client);
    await touchActivity.run({ workspaceId, activityId }, access.client);
    await recordAudit(access, { action: 'labs.activity.reagents', entityType: 'labs.activity', entityId: activityId, changes: { line, picks: input.picks } });
    return activityById(access, activityId);
  });
}
