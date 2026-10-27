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
  type ApprovalResults,
  type ApprovedRequest,
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
import { runQuery, runScheduleCommand, SCHEDULE_LEAD, SCHEDULE_MANAGE } from './command.js';
import { blockHolds, holdBlock, rebookEquipment } from './holds.js';

/**
 * Cronograma (ADR 0023, «Reglas y diseño de L-01c»): el Administrador programa cada fecha de una solicitud enviada en un
 * área, a una hora y con un responsable; con todas programadas, la solicitud queda «programada». Las reglas son las del
 * contrato (`scheduleCheck`), aplicadas aquí con los datos leídos en la misma transacción; el choque lo impide además
 * la exclusión GiST. Superar el aforo solo avisa.
 */

const notFound = () => new AppError('NOT_FOUND', 'Recurso no encontrado');
const invalid = (message: string) => new AppError('VALIDATION_FAILED', message);
const conflict = () => new AppError('VERSION_CONFLICT', 'Otra persona la cambió mientras la veías: vuelve a cargarla');

const toActivity = (row: IListActivitiesResult, complete: boolean): Activity => ({
  id: row.id,
  requestId: row.request_id,
  requestCode: requestCode(row.request_number),
  title: row.title,
  requesterName: row.requester_name,
  subject: row.subject,
  group: row.group,
  participants: row.participants,
  date: row.date,
  areaId: row.area_id,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  responsibleId: row.responsible_principal_id,
  responsibleName: row.responsible_name,
  code: row.code,
  complete,
  version: row.version,
});

/** Los bloques con si lo apartado alcanza lo pedido (L-01d). */
async function withHolds(access: WorkspaceAccess, rows: readonly IListActivitiesResult[]): Promise<Activity[]> {
  const holds = await blockHolds(access, rows.map((row) => ({ activityId: row.id, requestId: row.request_id })));
  return rows.map((row) => toActivity(row, (holds.get(row.id) ?? []).every((hold) => hold.complete)));
}

async function activityById(access: WorkspaceAccess, activityId: string): Promise<Activity> {
  const [row] = await listActivities.run({ workspaceId: access.workspace.id, activityId, from: null, to: null }, access.client);
  if (!row) throw notFound();
  const [activity] = await withHolds(access, [row]);
  return activity!;
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
  return { period, week: periodWeek(period.startsOn, placement.date), abbreviation: context.abbreviation, areaName: context.area_name, warnings: check.warnings };
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
    return { items: await withHolds(access, rows) };
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

type LockedRequest = NonNullable<Awaited<ReturnType<typeof lockRequestForSchedule.run>>[number]>;

/** La solicitud bloqueada que se programa: enviada, con la versión vista. */
async function lockSubmitted(access: WorkspaceAccess, requestId: string, expectedVersion: number): Promise<LockedRequest> {
  const [current] = await lockRequestForSchedule.run({ workspaceId: access.workspace.id, requestId }, access.client);
  if (!current || current.status === 'draft') throw notFound();
  if (current.version !== expectedVersion) throw conflict();
  if (current.status !== 'submitted') throw new AppError('REQUEST_RESOLVED', 'Esta solicitud ya no se programa');
  return current;
}

/**
 * Programa una fecha de la solicitud ya bloqueada: valida el lugar, toma su código, aparta lo de esa fecha (L-01d) y
 * deja la auditoría. No cambia el estado de la solicitud: eso lo hace `settleRequest` al final.
 */
async function placeDate(
  access: WorkspaceAccess,
  current: LockedRequest,
  requestId: string,
  slot: { date: string; areaId: string; startsAt: string; endsAt: string; responsibleId: string },
): Promise<ScheduledActivity> {
  const workspaceId = access.workspace.id;
  if (!current.dates.includes(slot.date)) throw invalid('Esa fecha no es de la solicitud');
  const placed = await checkPlacement(access, { ...slot, participants: current.participants, exceptId: null });
  const { sequence, code } = await nextCode(access, placed, slot.areaId);
  const [created] = await withoutOverlap(() =>
    insertActivity.run(
      { workspaceId, requestId, date: slot.date, areaId: slot.areaId, startsAt: slot.startsAt, endsAt: slot.endsAt, responsibleId: slot.responsibleId, periodId: placed.period.id, week: placed.week, sequence, code, createdBy: access.principalId },
      access.client,
    ),
  );
  const activityId = created!.id;
  await insertActivityCode.run({ workspaceId, activityId, code, principalId: access.principalId }, access.client);
  // La reserva real (L-01d): este bloque aparta lo de su fecha; lo que no alcanza queda «Falta».
  await holdBlock(access, { activityId, requestId, requestCode: requestCode(current.number), date: slot.date, startsAt: slot.startsAt, endsAt: slot.endsAt, areaName: placed.areaName });
  await recordAudit(access, { action: 'labs.activity.schedule', entityType: 'labs.activity', entityId: activityId, changes: { requestId, ...slot, code, warnings: placed.warnings } });
  return { activity: await activityById(access, activityId), warnings: placed.warnings };
}

/** Con todas sus fechas programadas, la solicitud queda «programada» con su evento; si no, cambia su versión. */
async function settleRequest(access: WorkspaceAccess, requestId: string): Promise<void> {
  const workspaceId = access.workspace.id;
  const [complete] = await markScheduled.run({ workspaceId, requestId }, access.client);
  if (complete) {
    await insertRequestEvent.run({ workspaceId, requestId, action: 'scheduled', reason: null, principalId: access.principalId }, access.client);
  } else {
    await bumpRequest.run({ workspaceId, requestId }, access.client);
  }
}

/** Programa una fecha de una solicitud enviada; con todas programadas, la solicitud queda «programada». */
export function scheduleActivity(pool: pg.Pool, request: CommandRequest, input: z.infer<typeof scheduleActivityRequest>): Promise<ScheduledActivity> {
  return runScheduleCommand(pool, request, 'labs.activity.schedule', input, requires(SCHEDULE_MANAGE), async (access) => {
    const current = await lockSubmitted(access, input.requestId, input.expectedVersion);
    const { requestId, expectedVersion: _version, ...slot } = input;
    const scheduled = await placeDate(access, current, requestId, slot);
    await settleRequest(access, requestId);
    return scheduled;
  });
}

/**
 * «Aprobar» (ADR 0023, «Flujo de la Propuesta»): programa cada fecha pendiente en el laboratorio y el horario pedidos,
 * con quien aprueba como responsable (o, si no puede serlo, el primero de la lista). Todo o nada: si una fecha choca,
 * no se programa ninguna y el motivo dice cuál; sin laboratorio pedido, se programa arrastrando.
 */
export function approveRequest(pool: pg.Pool, request: CommandRequest, requestId: string, expectedVersion: number): Promise<ApprovedRequest> {
  return runScheduleCommand(pool, request, 'labs.request.approve', { requestId, expectedVersion }, requires(SCHEDULE_MANAGE), async (access) => {
    const current = await lockSubmitted(access, requestId, expectedVersion);
    if (!current.area_id || !current.starts_at || !current.ends_at) throw invalid('La solicitud no pide laboratorio: prográmala arrastrando en el Cronograma');
    const leads = await membersWithPermission(access, SCHEDULE_LEAD);
    const responsibleId = leads.some((member) => member.id === access.principalId) ? access.principalId : leads[0]?.id;
    if (!responsibleId) throw invalid('No hay a quién asignar el bloque');
    const items: ScheduledActivity[] = [];
    for (const date of current.dates.filter((day) => !current.scheduled_dates.includes(day))) {
      try {
        items.push(await placeDate(access, current, requestId, { date, areaId: current.area_id, startsAt: current.starts_at, endsAt: current.ends_at, responsibleId }));
      } catch (error) {
        if (error instanceof AppError && error.code === 'VALIDATION_FAILED') throw invalid(`El ${date}: ${error.message}`);
        throw error;
      }
    }
    await settleRequest(access, requestId);
    return { items };
  });
}

/** Aprobar varias a la vez: cada una en su propia transacción y con su resultado; una que falla no frena a las demás. */
export async function approveRequests(pool: pg.Pool, request: CommandRequest, items: ReadonlyArray<{ requestId: string; expectedVersion: number }>): Promise<ApprovalResults> {
  const results: ApprovalResults['items'] = [];
  for (const item of items) {
    try {
      const approved = await approveRequest(pool, { ...request, idempotencyKey: request.idempotencyKey && `${request.idempotencyKey}:${item.requestId}` }, item.requestId, item.expectedVersion);
      results.push({ requestId: item.requestId, ok: true, codes: approved.items.map((scheduled) => scheduled.activity.code), message: null });
    } catch (error) {
      if (!(error instanceof AppError)) throw error;
      results.push({ requestId: item.requestId, ok: false, codes: [], message: error.message });
    }
  }
  return { items: results };
}

/**
 * Mueve un bloque el mismo día: otra área, otra hora u otro responsable. En otra área toma el número siguiente de esa
 * área en la semana y el código anterior queda en su historial.
 */
export function moveActivity(pool: pg.Pool, request: CommandRequest, activityId: string, input: z.infer<typeof updateActivityRequest>): Promise<ScheduledActivity> {
  return runScheduleCommand(pool, request, 'labs.activity.move', { activityId, ...input }, requires(SCHEDULE_MANAGE), async (access) => {
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
    // Otra franja u otra área: los equipos se vuelven a apartar para la nueva; los reactivos son del mismo día.
    if (input.startsAt !== shown.startsAt || input.endsAt !== shown.endsAt) {
      await rebookEquipment(access, { activityId, requestId: current.request_id, requestCode: shown.requestCode, date: current.on_date, startsAt: input.startsAt, endsAt: input.endsAt, areaName: placed.areaName });
    }
    await recordAudit(access, { action: 'labs.activity.move', entityType: 'labs.activity', entityId: activityId, changes: { ...input, code: recoded.code, warnings: placed.warnings } });
    return { activity: await activityById(access, activityId), warnings: placed.warnings };
  });
}
