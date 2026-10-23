import type pg from 'pg';
import type { z } from 'zod';
import {
  activityCode,
  periodWeek,
  requestCode,
  scheduleCheck,
  scheduleProblemText,
  type Activity,
  type ResponsibleOptions,
  type scheduleActivityRequest,
  type ScheduledActivity,
  type ScheduleList,
  type scheduleQuery,
  type updateActivityRequest,
  type WeeklyHours,
} from '@platlab/contracts';
import { todayIn } from '../../../platform/dates.js';
import { AppError } from '../../../platform/errors.js';
import { membersWithPermission, recordAudit, requirePermission, requires, type CommandRequest, type QueryRequest, type WorkspaceAccess } from '../../core/index.js';
import {
  bumpRequest,
  insertActivity,
  insertActivityCode,
  listActivities,
  lockActivity,
  lockRequestForSchedule,
  markScheduled,
  moveActivity as moveActivityQuery,
  nextActivitySequence,
  scheduleContext,
  type IListActivitiesResult,
} from '../infrastructure/schedule.queries.js';
import { insertRequestEvent } from '../infrastructure/requests.queries.js';
import { runCommand, runQuery, SCHEDULE_LEAD, SCHEDULE_MANAGE } from './command.js';

/**
 * Cronograma (ADR 0023, «Reglas y diseño de L-01c»): el Administrador programa cada fecha de una solicitud enviada en un
 * área, a una hora y con un responsable; con todas programadas, la solicitud queda «programada». Las reglas son las del
 * contrato (`scheduleCheck`), aplicadas aquí con los datos leídos en la misma transacción; el choque lo impide además
 * la exclusión GiST. Superar el aforo solo avisa.
 */

const notFound = () => new AppError('NOT_FOUND', 'Recurso no encontrado');
const invalid = (message: string) => new AppError('VALIDATION_FAILED', message);
const conflict = () => new AppError('VERSION_CONFLICT', 'Otra persona la cambió mientras la veías: vuelve a cargarla');

const toActivity = (row: IListActivitiesResult): Activity => ({
  id: row.id,
  requestId: row.request_id,
  requestCode: requestCode(row.request_number),
  title: row.title,
  requesterName: row.requester_name,
  group: row.group,
  participants: row.participants,
  date: row.date,
  areaId: row.area_id,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  responsibleId: row.responsible_principal_id,
  responsibleName: row.responsible_name,
  code: row.code,
  version: row.version,
});

async function activityById(access: WorkspaceAccess, activityId: string): Promise<Activity> {
  const [row] = await listActivities.run({ workspaceId: access.workspace.id, activityId, from: null, to: null }, access.client);
  if (!row) throw notFound();
  return toActivity(row);
}

/** Dos bloques activos que se cruzan en un área (la exclusión GiST, también si otra persona programó a la vez). */
async function withoutOverlap<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (error) {
    const constraint = (error as { constraint?: unknown }).constraint;
    if (constraint === 'activities_no_overlap') throw invalid(scheduleProblemText.overlap);
    if (constraint === 'activities_request_date') throw invalid('Esa fecha ya está programada');
    throw error;
  }
}

interface Placement {
  date: string;
  areaId: string;
  startsAt: string;
  endsAt: string;
  responsibleId: string;
  participants: number;
  /** El bloque que se mueve: no choca consigo mismo. */
  exceptId: string | null;
}

/**
 * Comprueba el lugar con las reglas del contrato y devuelve el período, la semana, la sigla y lo que solo avisa. Lo que
 * impide programar responde VALIDATION_FAILED con su explicación.
 */
async function checkPlacement(access: WorkspaceAccess, placement: Placement) {
  const leads = await membersWithPermission(access, SCHEDULE_LEAD);
  if (!leads.some((member) => member.id === placement.responsibleId)) throw invalid('El responsable es un Operador o el Administrador');
  const [context] = await scheduleContext.run(
    { workspaceId: access.workspace.id, areaId: placement.areaId, date: placement.date, exceptId: placement.exceptId },
    access.client,
  );
  if (!context) throw invalid('Esa área no está habilitada para prácticas');
  const periods = context.periods as Array<{ id: string; code: string; startsOn: string; endsOn: string }>;
  const check = scheduleCheck(placement, {
    today: todayIn(access.workspace.timeZone),
    participants: placement.participants,
    space: { capacity: context.capacity, weeklyHours: context.weekly_hours as WeeklyHours },
    periods,
    closures: context.closures as Array<{ startsOn: string; endsOn: string }>,
    others: context.others as Array<{ startsAt: string; endsAt: string }>,
  });
  if (check.blocking.length > 0) throw invalid(check.blocking.map((problem) => scheduleProblemText[problem]).join('. '));
  const period = periods.find((item) => item.startsOn <= placement.date && placement.date <= item.endsOn)!;
  return { period, week: periodWeek(period.startsOn, placement.date), abbreviation: context.abbreviation, warnings: check.warnings };
}

/** El número siguiente del área en esa semana y el código que forma. */
async function nextCode(access: WorkspaceAccess, placed: Awaited<ReturnType<typeof checkPlacement>>, areaId: string) {
  const [{ sequence }] = (await nextActivitySequence.run(
    { workspaceId: access.workspace.id, periodId: placed.period.id, week: placed.week, areaId },
    access.client,
  )) as [{ sequence: number }];
  if (sequence > 99) throw invalid('El área ya tiene 99 bloques esa semana');
  return { sequence, code: activityCode(placed.period.code, placed.week, placed.abbreviation, sequence) };
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

/** Los bloques del rango: todos los que consultan Laboratorios ven la tabla completa. */
export function listSchedule(pool: pg.Pool, request: QueryRequest, { from, to }: z.infer<typeof scheduleQuery>): Promise<ScheduleList> {
  return runQuery(pool, request, async (access) => {
    const rows = await listActivities.run({ workspaceId: access.workspace.id, activityId: null, from, to }, access.client);
    return { items: rows.map(toActivity) };
  });
}

/** Quienes pueden llevar un bloque, para quien programa. */
export function listResponsibles(pool: pg.Pool, request: QueryRequest): Promise<ResponsibleOptions> {
  return runQuery(pool, request, async (access) => {
    await requirePermission(access, SCHEDULE_MANAGE);
    return { items: await membersWithPermission(access, SCHEDULE_LEAD) };
  });
}

// ---------------------------------------------------------------------------
// Comandos del Administrador
// ---------------------------------------------------------------------------

/** Programa una fecha de una solicitud enviada; con todas programadas, la solicitud queda «programada». */
export function scheduleActivity(pool: pg.Pool, request: CommandRequest, input: z.infer<typeof scheduleActivityRequest>): Promise<ScheduledActivity> {
  return runCommand(pool, request, 'labs.activity.schedule', input, requires(SCHEDULE_MANAGE), async (access) => {
    const workspaceId = access.workspace.id;
    const [current] = await lockRequestForSchedule.run({ workspaceId, requestId: input.requestId }, access.client);
    if (!current || current.status === 'draft') throw notFound();
    if (current.version !== input.expectedVersion) throw conflict();
    if (current.status !== 'submitted') throw new AppError('REQUEST_RESOLVED', 'Esta solicitud ya no se programa');
    if (!current.dates.includes(input.date)) throw invalid('Esa fecha no es de la solicitud');
    const placed = await checkPlacement(access, { ...input, participants: current.participants, exceptId: null });
    const { sequence, code } = await nextCode(access, placed, input.areaId);
    const [created] = await withoutOverlap(() =>
      insertActivity.run(
        { workspaceId, requestId: input.requestId, date: input.date, areaId: input.areaId, startsAt: input.startsAt, endsAt: input.endsAt, responsibleId: input.responsibleId, periodId: placed.period.id, week: placed.week, sequence, code, createdBy: access.principalId },
        access.client,
      ),
    );
    const activityId = created!.id;
    await insertActivityCode.run({ workspaceId, activityId, code, principalId: access.principalId }, access.client);
    const [complete] = await markScheduled.run({ workspaceId, requestId: input.requestId }, access.client);
    if (complete) {
      await insertRequestEvent.run({ workspaceId, requestId: input.requestId, action: 'scheduled', reason: null, principalId: access.principalId }, access.client);
    } else {
      await bumpRequest.run({ workspaceId, requestId: input.requestId }, access.client);
    }
    await recordAudit(access, { action: 'labs.activity.schedule', entityType: 'labs.activity', entityId: activityId, changes: { ...input, code, warnings: placed.warnings } });
    return { activity: await activityById(access, activityId), warnings: placed.warnings };
  });
}

/**
 * Mueve un bloque el mismo día: otra área, otra hora u otro responsable. En otra área toma el número siguiente de esa
 * área en la semana y el código anterior queda en su historial.
 */
export function moveActivity(pool: pg.Pool, request: CommandRequest, activityId: string, input: z.infer<typeof updateActivityRequest>): Promise<ScheduledActivity> {
  return runCommand(pool, request, 'labs.activity.move', { activityId, ...input }, requires(SCHEDULE_MANAGE), async (access) => {
    const workspaceId = access.workspace.id;
    const [current] = await lockActivity.run({ workspaceId, activityId }, access.client);
    if (!current || current.cancelled_at) throw notFound();
    if (current.version !== input.expectedVersion) throw conflict();
    const shown = await activityById(access, activityId);
    const placed = await checkPlacement(access, { ...input, date: current.on_date, participants: shown.participants, exceptId: activityId });
    const recoded = input.areaId === current.area_id ? { sequence: current.sequence, code: current.code } : await nextCode(access, placed, input.areaId);
    await withoutOverlap(() =>
      moveActivityQuery.run(
        { workspaceId, activityId, areaId: input.areaId, startsAt: input.startsAt, endsAt: input.endsAt, responsibleId: input.responsibleId, periodId: placed.period.id, week: placed.week, ...recoded },
        access.client,
      ),
    );
    if (recoded.code !== current.code) await insertActivityCode.run({ workspaceId, activityId, code: recoded.code, principalId: access.principalId }, access.client);
    await recordAudit(access, { action: 'labs.activity.move', entityType: 'labs.activity', entityId: activityId, changes: { ...input, code: recoded.code, warnings: placed.warnings } });
    return { activity: await activityById(access, activityId), warnings: placed.warnings };
  });
}
