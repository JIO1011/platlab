import type pg from 'pg';
import type { z } from 'zod';
import {
  requestCode,
  type ActivityStage,
  type LabsRequest,
  type RequestLine,
  type RequestList,
  type RequestOptions,
  type RequestStatus,
  type RequestSummary,
  type requestListQuery,
} from '@platlab/contracts';
import { todayIn } from '../../../platform/dates.js';
import { AppError } from '../../../platform/errors.js';
import { hasPermission, moduleAdmits, type QueryRequest, type WorkspaceAccess } from '../../core/index.js';
import { requestableAssetTypes } from '../../equipment/index.js';
import { requestableReagents } from '../../reagents/index.js';
import { activityUsage } from '../infrastructure/practice.queries.js';
import {
  listRequests as listRequestsQuery,
  listValues,
  requestBlocks,
  requestEvents,
  requestLines,
  type IListRequestsResult,
  type IRequestLinesResult,
} from '../infrastructure/requests.queries.js';
import { REQUEST_CREATE, REQUEST_VIEW, runQuery } from './command.js';
import { findingsOf, reagentsFreeOn, type Ask } from './availability.js';
import { blockHolds, type LineHold } from './holds.js';

/**
 * Lo que se lee de las solicitudes (ADR 0023): la bandeja y «Mis solicitudes», la solicitud con sus recursos
 * verificados (✔ ⚠ ✖ por la regla única de `availability.ts`), su historial y sus bloques con lo apartado, y lo que se
 * puede pedir. Los comandos están en `requests.ts`.
 */

const notFound = () => new AppError('NOT_FOUND', 'Recurso no encontrado');

// ---------------------------------------------------------------------------
// Recursos: nombre y marca de la regla única (`availability.ts`)
// ---------------------------------------------------------------------------

/** Una línea guardada o por guardar, numerada desde 1 en su orden. */
export type LineRow = Omit<IRequestLinesResult, 'request_id'>;

/** Las fechas aún sin bloque, en orden: las que cuentan para la regla. */
export const pendingOf = (dates: readonly string[], scheduled: readonly string[]): string[] => dates.filter((date) => !scheduled.includes(date)).sort();

/** Con todas sus fechas programadas, una línea alcanza si lo apartado alcanza en cada uno de sus bloques. */
function heldOf(blocks: ReadonlyArray<readonly LineHold[]>): Map<number, boolean> {
  const held = new Map<number, boolean>();
  for (const holds of blocks) for (const hold of holds) held.set(hold.line, (held.get(hold.line) ?? true) && hold.complete);
  return held;
}

/** Lo que la regla necesita de una solicitud leída: sus fechas pendientes, su franja y, sin pendientes, lo apartado. */
function scopeOf(row: IListRequestsResult, held: ReadonlyMap<number, boolean> | undefined): Omit<Ask, 'lines'> {
  const pending = pendingOf(row.dates, row.scheduled_dates);
  return { pending, startsAt: row.starts_at, endsAt: row.ends_at, held: pending.length === 0 && row.block_ids.length > 0 ? held : undefined };
}

/** Lo apartado por línea de las solicitudes del listado con todas sus fechas programadas, en una pasada. */
async function heldByRequest(access: WorkspaceAccess, rows: readonly IListRequestsResult[]): Promise<Map<string, Map<number, boolean>>> {
  const scheduled = rows.filter((row) => row.block_ids.length > 0 && pendingOf(row.dates, row.scheduled_dates).length === 0);
  const holds = await blockHolds(
    access,
    scheduled.flatMap((row) => row.block_ids.map((activityId, index) => ({ activityId, requestId: row.id, closed: row.block_closed[index] ?? false }))),
  );
  return new Map(scheduled.map((row) => [row.id, heldOf(row.block_ids.map((id) => holds.get(id) ?? []))]));
}

/**
 * Las líneas de cada solicitud, en su orden, con su nombre y su marca. Los nombres vienen siempre del dueño (la FK
 * garantiza que existen); la marca y lo que hay, de la regla única.
 */
export async function checkedLines(access: WorkspaceAccess, requests: ReadonlyArray<Omit<Ask, 'lines'> & { lines: readonly LineRow[] }>): Promise<RequestLine[][]> {
  const rows = requests.flatMap((request) => request.lines);
  const itemIds = [...new Set(rows.flatMap((row) => (row.kind === 'reagent' && row.item_id ? [row.item_id] : [])))];
  const typeIds = [...new Set(rows.flatMap((row) => (row.kind === 'equipment' && row.asset_type_id ? [row.asset_type_id] : [])))];
  const reagents = new Map((itemIds.length > 0 ? await requestableReagents(access, { itemIds }) : []).map((item) => [item.id, item.name]));
  const types = new Map((typeIds.length > 0 ? await requestableAssetTypes(access, typeIds) : []).map((type) => [type.id, type.name]));
  const findings = await findingsOf(access, requests);
  return requests.map((request, index) =>
    request.lines.map((row, position): RequestLine => {
      const { check, available } = findings[index]![position]!;
      if (row.kind === 'reagent') {
        const name = (row.item_id && reagents.get(row.item_id)) || row.description || '';
        return { kind: 'reagent', itemId: row.item_id, name, quantity: row.quantity, unit: row.unit ?? '', check, available };
      }
      if (row.kind === 'equipment') {
        const name = (row.asset_type_id && types.get(row.asset_type_id)) || row.description || '';
        const perGroup = row.per_group === null ? null : Number(row.per_group);
        return { kind: 'equipment', assetTypeId: row.asset_type_id, name, perGroup, quantity: Number(row.quantity), check, available: available === null ? null : Number(available) };
      }
      return { kind: 'material', name: row.description ?? '', perGroup: row.per_group, quantity: row.quantity, check };
    }),
  );
}

const exceptionsOf = (lines: readonly RequestLine[]) => lines.filter((line) => line.check !== 'ok').length;

function toSummary(row: IListRequestsResult, lines: readonly RequestLine[]): RequestSummary {
  return {
    id: row.id,
    number: row.number,
    code: requestCode(row.number),
    status: row.status as RequestStatus,
    formName: row.form_name,
    title: row.title,
    requesterName: row.requester_name,
    firstDate: row.dates[0] ?? null,
    dateCount: row.dates.length,
    late: row.late,
    exceptions: exceptionsOf(lines),
    scheduledCount: row.scheduled_dates.length,
    dates: row.dates,
    scheduledDates: row.scheduled_dates,
    blockCodes: row.block_codes,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    participants: row.participants,
    subject: row.subject,
    group: row.career,
    areaId: row.area_id,
    submittedAt: row.submitted_at?.toISOString() ?? null,
    version: row.version,
  };
}

/** La solicitud que quien mira puede ver: la suya o, con permiso de consultar, una recibida (nunca un borrador ajeno). */
export async function visibleRequest(access: WorkspaceAccess, requestId: string): Promise<LabsRequest> {
  const workspaceId = access.workspace.id;
  const [row] = await listRequestsQuery.run({ workspaceId, requestId, requesterId: null }, access.client);
  if (!row) throw notFound();
  const mine = row.requester_principal_id === access.principalId;
  if (!mine && (row.status === 'draft' || !(await hasPermission(access, REQUEST_VIEW)))) throw notFound();
  const blocks = await blocksOf(access, requestId);
  const lineRows = await requestLines.run({ workspaceId, requestIds: [requestId] }, access.client);
  const [lines = []] = await checkedLines(access, [{ ...scopeOf(row, heldOf(blocks.map((block) => block.holds))), lines: lineRows }]);
  const events = await requestEvents.run({ workspaceId, requestId }, access.client);
  return {
    ...toSummary(row, lines),
    formId: row.form_id,
    formRevision: row.form_revision,
    formTitle: row.form_title,
    documentCode: row.document_code,
    layout: row.layout,
    teacherName: row.teacher_name,
    activityType: row.activity_type as LabsRequest['activityType'],
    subject: row.subject,
    career: row.career,
    dates: row.dates,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    participants: row.participants,
    groups: row.groups,
    answers: row.answers as Record<string, unknown>,
    notes: row.notes,
    lines,
    events: events.map((event) => ({ action: event.action as LabsRequest['events'][number]['action'], reason: event.reason, by: event.by, at: event.created_at.toISOString() })),
    blocks,
    mine,
  };
}

/** El bloque de cada fecha programada, con lo que apartó por línea (L-01d). */
async function blocksOf(access: WorkspaceAccess, requestId: string): Promise<LabsRequest['blocks']> {
  const workspaceId = access.workspace.id;
  const rows = await requestBlocks.run({ workspaceId, requestId }, access.client);
  const holds = await blockHolds(access, rows.map((row) => ({ activityId: row.id, requestId, closed: row.stage === 'closed' })));
  const closed = rows.filter((row) => row.stage === 'closed').map((row) => row.id);
  const usage = closed.length === 0 ? [] : await activityUsage.run({ workspaceId, activityIds: closed }, access.client);
  return rows.map((block) => ({
    activityId: block.id,
    version: block.version,
    stage: block.stage as ActivityStage,
    preparedLines: block.prepared_lines,
    closingNotes: block.closing_notes,
    usage: usage.filter((row) => row.activity_id === block.id).map(({ line, held, used, returned }) => ({ line, held, used, returned })),
    date: block.date,
    code: block.code,
    areaId: block.area_id,
    areaName: block.area_name,
    startsAt: block.starts_at,
    endsAt: block.ends_at,
    responsibleName: block.responsible_name,
    holds: holds.get(block.id) ?? [],
  }));
}

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

/** `mine`: las propias, para quien pide. `inbox`: las recibidas, lo excepcional primero (fuera de plazo y recursos que faltan). */
export function listRequests(pool: pg.Pool, request: QueryRequest, { scope }: z.infer<typeof requestListQuery>): Promise<RequestList> {
  return runQuery(pool, request, async (access) => {
    const workspaceId = access.workspace.id;
    if (!(await hasPermission(access, scope === 'mine' ? REQUEST_CREATE : REQUEST_VIEW))) throw new AppError('ACCESS_DENIED', 'No tienes permiso para esta acción');
    const rows = await listRequestsQuery.run({ workspaceId, requestId: null, requesterId: scope === 'mine' ? access.principalId : null }, access.client);
    const byRequest = new Map<string, IRequestLinesResult[]>();
    for (const line of rows.length > 0 ? await requestLines.run({ workspaceId, requestIds: rows.map((row) => row.id) }, access.client) : []) {
      byRequest.set(line.request_id, [...(byRequest.get(line.request_id) ?? []), line]);
    }
    const held = await heldByRequest(access, rows);
    const lines = await checkedLines(access, rows.map((row) => ({ ...scopeOf(row, held.get(row.id)), lines: byRequest.get(row.id) ?? [] })));
    const items = rows.map((row, index) => toSummary(row, lines[index]!));
    if (scope === 'inbox') {
      const urgent = (item: RequestSummary) => item.status === 'submitted' && (item.late || item.exceptions > 0);
      items.sort((a, b) => Number(urgent(b)) - Number(urgent(a)));
    }
    return { items };
  });
}

export function getRequest(pool: pg.Pool, request: QueryRequest, requestId: string): Promise<LabsRequest> {
  return runQuery(pool, request, (access) => visibleRequest(access, requestId));
}

/** Cada reactivo con lo libre hoy por la regla única: sin fechas, cuenta hoy. */
async function withFreeToday<T extends { id: string }>(access: WorkspaceAccess, reagents: T[]): Promise<Array<T & { available: string }>> {
  const free = await reagentsFreeOn(access, reagents.map((reagent) => reagent.id), todayIn(access.workspace.timeZone));
  return reagents.map((reagent) => ({ ...reagent, available: free.get(reagent.id) ?? '0' }));
}

/** Lo que se puede pedir hoy y las listas de asignaturas y carreras. Sin Reactivos o Equipos admitidos, sus líneas van «no catalogadas». */
export function getRequestOptions(pool: pg.Pool, request: QueryRequest): Promise<RequestOptions> {
  return runQuery(pool, request, async (access) => {
    if (!(await hasPermission(access, REQUEST_CREATE))) throw new AppError('ACCESS_DENIED', 'No tienes permiso para esta acción');
    const [reagentsEnabled, equipmentEnabled] = await Promise.all([moduleAdmits(access, 'reagents', 'new_operation'), moduleAdmits(access, 'equipment', 'new_operation')]);
    const values = await listValues.run({ workspaceId: access.workspace.id }, access.client);
    return {
      reagentsEnabled,
      equipmentEnabled,
      reagents: reagentsEnabled ? await withFreeToday(access, await requestableReagents(access, {})) : [],
      equipmentTypes: equipmentEnabled ? await requestableAssetTypes(access) : [],
      subjects: values.filter((value) => value.kind === 'subject').map((value) => value.name),
      careers: values.filter((value) => value.kind === 'career').map((value) => value.name),
    };
  });
}
