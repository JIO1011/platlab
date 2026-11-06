import type pg from 'pg';
import type { z } from 'zod';
import {
  compareDecimals,
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
import { blockHolds } from './holds.js';

/**
 * Lo que se lee de las solicitudes (ADR 0023): la bandeja y «Mis solicitudes», la solicitud con sus recursos
 * verificados (✔ ⚠ ✖ con lo disponible hoy, por la interfaz de Reactivos y Equipos), su historial y sus bloques con lo
 * apartado, y lo que se puede pedir. Los comandos están en `requests.ts`.
 */

const notFound = () => new AppError('NOT_FOUND', 'Recurso no encontrado');

// ---------------------------------------------------------------------------
// Recursos: nombre y ✔ ⚠ ✖ con lo disponible hoy
// ---------------------------------------------------------------------------

/** Las líneas con su nombre y su verificación. Sin el módulo admitido para consultar, ✖ (sin verificar). */
async function checkedLines(access: WorkspaceAccess, rows: IRequestLinesResult[]): Promise<Map<string, RequestLine[]>> {
  const itemIds = [...new Set(rows.flatMap((row) => (row.item_id ? [row.item_id] : [])))];
  const typeIds = [...new Set(rows.flatMap((row) => (row.asset_type_id ? [row.asset_type_id] : [])))];
  const [reagentsOn, equipmentOn] = await Promise.all([
    itemIds.length > 0 ? moduleAdmits(access, 'reagents', 'read_export') : false,
    typeIds.length > 0 ? moduleAdmits(access, 'equipment', 'read_export') : false,
  ]);
  // Los nombres vienen siempre del dueño (la FK garantiza que existen); la disponibilidad, solo si se admite consultar.
  const reagents = new Map((itemIds.length > 0 ? await requestableReagents(access, { itemIds }) : []).map((item) => [item.id, item]));
  const types = new Map((typeIds.length > 0 ? await requestableAssetTypes(access, typeIds) : []).map((type) => [type.id, type]));
  const result = new Map<string, RequestLine[]>();
  for (const row of rows) {
    const lines = result.get(row.request_id) ?? [];
    result.set(row.request_id, lines);
    if (row.kind === 'reagent') {
      const item = row.item_id ? reagents.get(row.item_id) : undefined;
      const available = item && reagentsOn ? item.available : null;
      lines.push({
        kind: 'reagent',
        itemId: row.item_id,
        name: item?.name ?? row.description ?? '',
        quantity: row.quantity,
        unit: row.unit ?? '',
        check: available === null ? 'unverified' : compareDecimals(available, row.quantity) >= 0 ? 'ok' : 'short',
        available,
      });
    } else if (row.kind === 'equipment') {
      const type = row.asset_type_id ? types.get(row.asset_type_id) : undefined;
      const available = type && equipmentOn ? type.available : null;
      const quantity = Number(row.quantity);
      lines.push({
        kind: 'equipment',
        assetTypeId: row.asset_type_id,
        name: type?.name ?? row.description ?? '',
        perGroup: row.per_group === null ? null : Number(row.per_group),
        quantity,
        check: available === null ? 'unverified' : available >= quantity ? 'ok' : 'short',
        available,
      });
    } else {
      lines.push({ kind: 'material', name: row.description ?? '', perGroup: row.per_group, quantity: row.quantity, check: 'unverified' });
    }
  }
  return result;
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
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    participants: row.participants,
    subject: row.subject,
    group: row.career,
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
  const lineRows = await requestLines.run({ workspaceId, requestIds: [requestId] }, access.client);
  const lines = (await checkedLines(access, lineRows)).get(requestId) ?? [];
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
    areaId: row.area_id,
    answers: row.answers as Record<string, unknown>,
    notes: row.notes,
    lines,
    events: events.map((event) => ({ action: event.action as LabsRequest['events'][number]['action'], reason: event.reason, by: event.by, at: event.created_at.toISOString() })),
    blocks: await blocksOf(access, requestId),
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
    const lines = await checkedLines(access, rows.length > 0 ? await requestLines.run({ workspaceId, requestIds: rows.map((row) => row.id) }, access.client) : []);
    const items = rows.map((row) => toSummary(row, lines.get(row.id) ?? []));
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

/** Lo que se puede pedir hoy y las listas de asignaturas y carreras. Sin Reactivos o Equipos admitidos, sus líneas van «no catalogadas». */
export function getRequestOptions(pool: pg.Pool, request: QueryRequest): Promise<RequestOptions> {
  return runQuery(pool, request, async (access) => {
    if (!(await hasPermission(access, REQUEST_CREATE))) throw new AppError('ACCESS_DENIED', 'No tienes permiso para esta acción');
    const [reagentsEnabled, equipmentEnabled] = await Promise.all([moduleAdmits(access, 'reagents', 'new_operation'), moduleAdmits(access, 'equipment', 'new_operation')]);
    const values = await listValues.run({ workspaceId: access.workspace.id }, access.client);
    return {
      reagentsEnabled,
      equipmentEnabled,
      reagents: reagentsEnabled ? await requestableReagents(access, {}) : [],
      equipmentTypes: equipmentEnabled ? await requestableAssetTypes(access) : [],
      subjects: values.filter((value) => value.kind === 'subject').map((value) => value.name),
      careers: values.filter((value) => value.kind === 'career').map((value) => value.name),
    };
  });
}
