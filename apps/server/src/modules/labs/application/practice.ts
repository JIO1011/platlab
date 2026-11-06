import type pg from 'pg';
import type { z } from 'zod';
import {
  compareDecimals,
  sumDecimals,
  type Activity,
  type ActivityStage,
  type AssetBookings,
  type ClosePracticeRequest,
  type Fault,
  type IncidentPractice,
  type PracticeChecklistRequest,
  type practiceIncidentRequest,
  type practiceStepRequest,
} from '@platlab/contracts';
import { todayIn } from '../../../platform/dates.js';
import { AppError } from '../../../platform/errors.js';
import { recordAudit, requirePermission, requires, type CommandRequest, type QueryRequest, type WorkspaceAccess } from '../../core/index.js';
import { reportAssetFault } from '../../equipment/index.js';
import { consumeReagentHolds, heldReagentQuantities } from '../../reagents/index.js';
import { activityAllocations } from '../infrastructure/holds.queries.js';
import {
  advanceStage,
  blockAsset,
  completeRequest,
  incidentPractice,
  insertActivityIncident,
  insertUsage,
  lockActivityRequest,
  lockPractice,
  setPreparedLines,
  upcomingAssetBookings,
} from '../infrastructure/practice.queries.js';
import { insertRequestEvent, requestLines } from '../infrastructure/requests.queries.js';
import { REQUEST_VIEW, runCommand, runIncidentCommand, runQuery, runScheduleCommand, SCHEDULE_LEAD } from './command.js';
import { activityById } from './schedule.js';

/**
 * Preparación y cierre (ADR 0023, «Cierre de Laboratorios», L-01e): quien tenga `labs.schedule.lead` lleva cada bloque
 * de programada a lista, en curso y cerrada. Al cerrar, lo utilizado de cada reactivo sale del inventario como salida
 * hacia el área y lo demás vuelve a estar disponible; con todos sus bloques cerrados, la solicitud queda «finalizada».
 * Lo pedido a Reactivos y a Equipos va por su interfaz pública, en la misma transacción.
 */

const notFound = () => new AppError('NOT_FOUND', 'Recurso no encontrado');
const invalid = (message: string) => new AppError('VALIDATION_FAILED', message);

type LockedPractice = NonNullable<Awaited<ReturnType<typeof lockPractice.run>>[number]>;
type Step = 'ready' | 'running' | 'closed';

/** De qué etapa sale cada paso y qué responde si el bloque está en otra. */
const steps: Record<Step, { from: ActivityStage; wrong: string }> = {
  ready: { from: 'scheduled', wrong: 'Solo se marca lista una práctica programada' },
  running: { from: 'ready', wrong: 'Solo se inicia una práctica lista' },
  closed: { from: 'running', wrong: 'Solo se cierra una práctica en curso' },
};

/** La solicitud y después el bloque, bloqueados en ese orden, con la versión del bloque que se vio. */
async function lockBlock(access: WorkspaceAccess, activityId: string, expectedVersion: number): Promise<LockedPractice> {
  const workspaceId = access.workspace.id;
  await lockActivityRequest.run({ workspaceId, activityId }, access.client);
  const [block] = await lockPractice.run({ workspaceId, activityId }, access.client);
  if (!block || block.cancelled_at) throw notFound();
  if (block.version !== expectedVersion) throw new AppError('VERSION_CONFLICT', 'Otra persona cambió el bloque mientras lo veías: vuelve a cargarlo');
  return block;
}

/** El bloque está en la etapa de la que sale ese paso; la base rechaza además cualquier salto. */
function requireStep(block: LockedPractice, stage: Step): void {
  if (block.stage !== steps[stage].from) throw invalid(steps[stage].wrong);
}

/** Un paso adelante, con quién y cuándo. */
async function advance(access: WorkspaceAccess, activityId: string, stage: Step, notes: string | null): Promise<void> {
  await advanceStage.run({ workspaceId: access.workspace.id, activityId, stage, principalId: access.principalId, notes }, access.client);
}

/** Marca la lista de chequeo: las líneas de la solicitud ya preparadas. Solo antes de iniciar; no bloquea «Lista». */
export function setChecklist(pool: pg.Pool, request: CommandRequest, activityId: string, input: PracticeChecklistRequest): Promise<Activity> {
  return runCommand(pool, request, 'labs.activity.checklist', { activityId, ...input }, requires(SCHEDULE_LEAD), async (access) => {
    const workspaceId = access.workspace.id;
    const block = await lockBlock(access, activityId, input.expectedVersion);
    if (block.stage !== 'scheduled' && block.stage !== 'ready') throw invalid('La lista de chequeo se marca antes de iniciar');
    const lines = await requestLines.run({ workspaceId, requestIds: [block.request_id] }, access.client);
    if (input.lines.some((line) => !lines.some((item) => item.line === line))) throw invalid('Esa línea no es de la solicitud');
    await setPreparedLines.run({ workspaceId, activityId, lines: input.lines.toSorted((a, b) => a - b) }, access.client);
    await recordAudit(access, { action: 'labs.activity.checklist', entityType: 'labs.activity', entityId: activityId, changes: { lines: input.lines } });
    return activityById(access, activityId);
  });
}

/** «Lista» e «Iniciar»: un paso con la versión vista; se inicia desde el día de la práctica. */
function step(stage: 'ready' | 'running', operation: string) {
  return (pool: pg.Pool, request: CommandRequest, activityId: string, { expectedVersion }: z.infer<typeof practiceStepRequest>): Promise<Activity> =>
    runCommand(pool, request, operation, { activityId, expectedVersion }, requires(SCHEDULE_LEAD), async (access) => {
      const block = await lockBlock(access, activityId, expectedVersion);
      requireStep(block, stage);
      if (stage === 'running' && block.on_date > todayIn(access.workspace.timeZone)) throw invalid('Se inicia desde el día de la práctica');
      await advance(access, activityId, stage, null);
      await recordAudit(access, { action: operation, entityType: 'labs.activity', entityId: activityId, changes: { stage } });
      return activityById(access, activityId);
    });
}

export const markReady = step('ready', 'labs.activity.ready');
export const startPractice = step('running', 'labs.activity.start');

/** Lo que sigue apartado de cada línea de reactivo del bloque: sus reservas y el total. */
async function heldLines(access: WorkspaceAccess, activityId: string): Promise<Map<number, { allocationIds: string[]; total: string }>> {
  const allocations = await activityAllocations.run({ workspaceId: access.workspace.id, activityIds: [activityId] }, access.client);
  const held = await heldReagentQuantities(access, allocations.map((row) => row.allocation_id));
  const lines = new Map<number, { allocationIds: string[]; parts: string[] }>();
  for (const row of allocations) {
    const quantity = held.get(row.allocation_id);
    if (quantity === undefined) continue;
    const line = lines.get(row.line) ?? { allocationIds: [], parts: [] };
    line.allocationIds.push(row.allocation_id);
    line.parts.push(quantity);
    lines.set(row.line, line);
  }
  return new Map([...lines].map(([line, { allocationIds, parts }]) => [line, { allocationIds, total: sumDecimals(parts) }]));
}

/**
 * «Cerrar»: por cada reactivo apartado, lo utilizado (hasta lo apartado) sale como salida «Práctica <código>» hacia el
 * área y lo devuelto vuelve a estar disponible; queda lo apartado, utilizado y devuelto. Resuelve lo pendiente de la
 * práctica, así que se admite también en cierre (ADR 0009).
 */
export function closePractice(pool: pg.Pool, request: CommandRequest, activityId: string, input: ClosePracticeRequest): Promise<Activity> {
  return runScheduleCommand(
    pool,
    request,
    'labs.activity.close',
    { activityId, ...input },
    requires(SCHEDULE_LEAD),
    async (access) => {
      const workspaceId = access.workspace.id;
      const block = await lockBlock(access, activityId, input.expectedVersion);
      requireStep(block, 'closed');
      const held = await heldLines(access, activityId);
      if (held.size > 0 && !access.optionalAdmitted) throw invalid('Reactivos no admite cambios ahora: la práctica no se cierra con reactivos apartados');
      const used = new Map(input.usage.map((item) => [item.line, item.used]));
      if (used.size !== held.size || [...used.keys()].some((line) => !held.has(line))) throw invalid('Indica lo utilizado de cada reactivo apartado, y solo de esos');
      for (const [line, hold] of held) {
        const quantity = used.get(line)!;
        if (compareDecimals(quantity, hold.total) > 0) throw invalid('Lo utilizado no puede superar lo apartado');
        await consumeReagentHolds(access, { allocationIds: hold.allocationIds, used: quantity, reason: `Práctica ${block.code}`, destination: block.area_name, releaseReason: 'Práctica cerrada' });
        await insertUsage.run({ workspaceId, activityId, line, held: hold.total, used: quantity }, access.client);
      }
      await advance(access, activityId, 'closed', input.notes);
      const [completed] = await completeRequest.run({ workspaceId, requestId: block.request_id }, access.client);
      if (completed) await insertRequestEvent.run({ workspaceId, requestId: block.request_id, action: 'completed', reason: null, principalId: access.principalId }, access.client);
      await recordAudit(access, { action: 'labs.activity.close', entityType: 'labs.activity', entityId: activityId, changes: { usage: input.usage, notes: input.notes, completed: completed !== undefined } });
      return activityById(access, activityId);
    },
    'resolve_pending',
  );
}

/**
 * «Reportar incidencia» de un equipo apartado, desde una práctica en curso o cerrada: el incidente nace en Equipos, que
 * lo autoriza con su permiso, y Laboratorios guarda en qué práctica ocurrió.
 */
export function reportPracticeIncident(pool: pg.Pool, request: CommandRequest, activityId: string, input: z.infer<typeof practiceIncidentRequest>): Promise<Fault> {
  return runIncidentCommand(pool, request, 'labs.activity.incident', { activityId, ...input }, requires(SCHEDULE_LEAD), async (access) => {
    const workspaceId = access.workspace.id;
    const block = await activityById(access, activityId);
    if (block.stage !== 'running' && block.stage !== 'closed') throw invalid('El incidente se reporta desde una práctica en curso o cerrada');
    const [booked] = await blockAsset.run({ workspaceId, activityId, assetId: input.assetId }, access.client);
    if (!booked) throw invalid('Ese equipo no está apartado para esta práctica');
    const fault = await reportAssetFault(access, input);
    await insertActivityIncident.run({ workspaceId, activityId, caseId: fault.id }, access.client);
    await recordAudit(access, { action: 'labs.activity.incident', entityType: 'labs.activity', entityId: activityId, changes: { faultId: fault.id, assetId: input.assetId } });
    return fault;
  });
}

/** «Reservado» en la ficha del equipo: sus próximas reservas del Cronograma, desde hoy. */
export function assetBookingsOf(pool: pg.Pool, request: QueryRequest, assetId: string): Promise<AssetBookings> {
  return runQuery(pool, request, async (access) => {
    await requirePermission(access, REQUEST_VIEW);
    const rows = await upcomingAssetBookings.run({ workspaceId: access.workspace.id, assetId, from: todayIn(access.workspace.timeZone) }, access.client);
    return {
      items: rows.map((row) => ({
        activityId: row.id,
        code: row.code,
        date: row.date,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        areaName: row.area_name,
        requesterName: row.requester_name,
        stage: row.stage as ActivityStage,
      })),
    };
  });
}

/** La práctica en que se reportó un incidente de Equipos, si nació de una. */
export function incidentPracticeOf(pool: pg.Pool, request: QueryRequest, faultId: string): Promise<IncidentPractice> {
  return runQuery(pool, request, async (access) => {
    await requirePermission(access, REQUEST_VIEW);
    const [row] = await incidentPractice.run({ workspaceId: access.workspace.id, caseId: faultId }, access.client);
    return {
      practice: row
        ? { activityId: row.id, code: row.code, title: row.title, requesterName: row.requester_name, date: row.date, startsAt: row.starts_at, endsAt: row.ends_at, areaName: row.area_name }
        : null,
    };
  });
}
