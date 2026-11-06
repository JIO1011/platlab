import type pg from 'pg';
import type { z } from 'zod';
import {
  ACTIVITY_CHANGEABLE,
  formLayout,
  LEAD_DAYS_DEFAULT,
  REQUEST_CANCELLABLE,
  REQUEST_EDITABLE,
  requestAnswers,
  type ActivityStage,
  type createRequestRequest,
  type labCancelRequest as labCancelRequestSchema,
  type FormLayout,
  type LabsRequest,
  type RequestStatus,
  type requestReasonRequest,
  type requestVersionRequest,
  type SaveRequest,
} from '@platlab/contracts';
import { addDays, todayIn } from '../../../platform/dates.js';
import { AppError } from '../../../platform/errors.js';
import { moduleAdmits, recordAudit, requires, type CommandRequest, type WorkspaceAccess } from '../../core/index.js';
import { requestableAssetTypes } from '../../equipment/index.js';
import { requestableReagents } from '../../reagents/index.js';
import { getSettings as getSettingsQuery } from '../infrastructure/settings.queries.js';
import {
  activeFormRevision,
  activeSpace,
  datesOutsidePeriods,
  deleteRequestLines,
  insertListValue,
  insertRequest,
  insertRequestEvent,
  insertRequestLines,
  listRequests as listRequestsQuery,
  listValueNamed,
  lockRequest,
  nextRequestNumber,
  releaseRequestBlocks,
  requestBlocks,
  requestLines,
  revisionLayout,
  setRequestStatus,
  writeRequest,
} from '../infrastructure/requests.queries.js';
import { REQUEST_CREATE, REQUEST_REVIEW, runCommand } from './command.js';
import { releaseBlocks } from './holds.js';
import { visibleRequest } from './request-view.js';
import { activeRequestActivities } from '../infrastructure/holds.queries.js';

/**
 * Solicitudes (ADR 0023, «Diseño de L-01b»): quien pide (Docente, tesista o el Administrador) llena un formato activo,
 * lo guarda como borrador y lo envía; el Operador y el Administrador consultan las recibidas, y el Administrador pide
 * cambios o rechaza con motivo. Programar llega con el Cronograma (L-01c). Validar los recursos no reserva nada: se
 * calcula al leer, por la interfaz de Reactivos y Equipos.
 */

const notFound = () => new AppError('NOT_FOUND', 'Recurso no encontrado');
const conflict = () => new AppError('VERSION_CONFLICT', 'Otra persona la cambió mientras la veías: vuelve a cargarla');
const invalid = (message: string) => new AppError('VALIDATION_FAILED', message);

/** Los datos del sistema opcionales que la revisión presenta: si están, se piden; si no, quedan vacíos. */
function systemKeys(layout: FormLayout): Set<string> {
  return new Set(layout.rows.flatMap((row) => (row.kind === 'row' ? row.fields : [])).filter((field) => !('type' in field)).map((field) => field.key));
}

// ---------------------------------------------------------------------------
// Comandos de quien pide
// ---------------------------------------------------------------------------

/** La solicitud bloqueada, solo si es de quien la cambia y con la versión que vio. */
async function lockMine(access: WorkspaceAccess, requestId: string, expectedVersion: number) {
  const [current] = await lockRequest.run({ workspaceId: access.workspace.id, requestId }, access.client);
  if (!current || current.requester_principal_id !== access.principalId) throw notFound();
  if (current.version !== expectedVersion) throw conflict();
  return { ...current, status: current.status as RequestStatus };
}

async function layoutOf(access: WorkspaceAccess, formId: string, revision: number): Promise<FormLayout> {
  const [row] = await revisionLayout.run({ workspaceId: access.workspace.id, formId, revision }, access.client);
  return formLayout.parse(row!.layout);
}

/** El id del valor de la lista; un nombre nuevo entra a ella (sin tildes ni mayúsculas, es el mismo). */
async function listValueId(access: WorkspaceAccess, kind: 'subject' | 'career', name: string | null): Promise<string | null> {
  if (name === null) return null;
  const params = { workspaceId: access.workspace.id, kind, name };
  const [created] = await insertListValue.run({ ...params, createdBy: access.principalId }, access.client);
  // Si otra persona lo agregó a la vez, ON CONFLICT no lo devuelve: se lee en otra sentencia, que ya lo ve.
  return created?.id ?? (await listValueNamed.run(params, access.client))[0]!.id;
}

/** Las líneas del catálogo existen y los reactivos van en su unidad base; las no catalogadas, como llegan. */
async function linesPayload(access: WorkspaceAccess, input: SaveRequest): Promise<string> {
  const itemIds = input.lines.flatMap((line) => (line.kind === 'reagent' && line.itemId ? [line.itemId] : []));
  const typeIds = input.lines.flatMap((line) => (line.kind === 'equipment' && line.assetTypeId ? [line.assetTypeId] : []));
  // Como en `request-options`: del catálogo solo se pide con el módulo dueño admitiendo operaciones nuevas.
  if (itemIds.length > 0 && !(await moduleAdmits(access, 'reagents', 'new_operation'))) throw invalid('Reactivos no está disponible: pide el reactivo como no catalogado');
  if (typeIds.length > 0 && !(await moduleAdmits(access, 'equipment', 'new_operation'))) throw invalid('Equipos no está disponible: pide el equipo como no catalogado');
  const reagents = new Map((itemIds.length > 0 ? await requestableReagents(access, { itemIds }) : []).map((item) => [item.id, item]));
  const types = new Set((typeIds.length > 0 ? await requestableAssetTypes(access, typeIds) : []).map((type) => type.id));
  const rows = input.lines.map((line) => {
    if (line.kind === 'reagent') {
      const item = line.itemId ? reagents.get(line.itemId) : undefined;
      if (line.itemId && !item) throw invalid('Uno de los reactivos ya no está en el catálogo');
      if (item && item.unit !== line.unit) throw invalid(`${item.name} se pide en ${item.unit}`);
      return { kind: 'reagent', item_id: line.itemId, description: line.description, quantity: line.quantity, unit: line.unit };
    }
    if (line.kind === 'equipment') {
      if (line.assetTypeId && !types.has(line.assetTypeId)) throw invalid('Uno de los tipos de equipo ya no existe');
      return { kind: 'equipment', asset_type_id: line.assetTypeId, description: line.description, quantity: line.quantity, per_group: line.perGroup };
    }
    return { kind: 'material', description: line.description, quantity: line.quantity, per_group: line.perGroup };
  });
  // Con «por grupo», el total es por grupo × grupos (ADR 0023, «Cantidades»): lo calcula el servidor, exacto.
  return JSON.stringify(rows.map((row) => ('per_group' in row && row.per_group !== null && row.per_group !== undefined ? { ...row, quantity: null } : row)));
}

/** Los campos que se guardan, ya resueltos: los datos del sistema que la revisión no presenta quedan vacíos. */
async function fields(access: WorkspaceAccess, layout: FormLayout, input: SaveRequest) {
  const present = systemKeys(layout);
  const answers = requestAnswers(layout).partial().safeParse(input.answers);
  if (!answers.success) throw invalid('Revisa los datos del formato');
  if (input.areaId) {
    const [space] = await activeSpace.run({ workspaceId: access.workspace.id, areaId: input.areaId }, access.client);
    if (!space) throw invalid('Esa área no está habilitada para prácticas');
  }
  return {
    title: input.title,
    teacherName: input.teacherName,
    activityType: present.has('tipo') ? input.activityType : null,
    subjectId: present.has('asignatura') ? await listValueId(access, 'subject', input.subject) : null,
    careerId: present.has('carrera') ? await listValueId(access, 'career', input.career) : null,
    dates: [...input.dates].sort(),
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    participants: input.participants,
    groups: present.has('grupos') ? input.groups : 1,
    areaId: input.areaId,
    answers: JSON.stringify(answers.data),
    notes: layout.notes ? input.notes : null,
  };
}

/**
 * Un borrador con la última revisión de un formato activo o, con `from`, la copia de una solicitud propia (sin sus
 * fechas, que son de otra práctica) sobre la última revisión de su formato. «Docente» parte con el nombre de quien pide.
 */
export function createRequest(pool: pg.Pool, request: CommandRequest, input: z.infer<typeof createRequestRequest>): Promise<LabsRequest> {
  return runCommand(pool, request, 'labs.request.create', input, requires(REQUEST_CREATE), async (access) => {
    const workspaceId = access.workspace.id;
    const source = 'from' in input ? await visibleRequest(access, input.from) : undefined;
    if (source && !source.mine) throw notFound();
    const formId = source?.formId ?? ('formId' in input ? input.formId : '');
    const [active] = await activeFormRevision.run({ workspaceId, formId }, access.client);
    if (!active?.revision) throw source ? invalid('El formato de esa solicitud está archivado') : notFound();
    const layout = await layoutOf(access, formId, active.revision);
    const [{ number }] = (await nextRequestNumber.run({ workspaceId }, access.client)) as [{ number: number }];
    const copy: SaveRequest = {
      expectedVersion: 1,
      title: source?.title ?? null,
      teacherName: source?.teacherName ?? (access.displayName.trim().slice(0, 120) || null),
      activityType: source?.activityType ?? null,
      subject: source?.subject ?? null,
      career: source?.career ?? null,
      dates: [],
      startsAt: source?.startsAt ?? null,
      endsAt: source?.endsAt ?? null,
      participants: source?.participants ?? null,
      groups: source?.groups ?? 1,
      areaId: source?.areaId ?? null,
      answers: copyAnswers(layout, source?.answers ?? {}),
      notes: source?.notes ?? null,
      lines: [],
    };
    const values = await fields(access, layout, copy);
    const [created] = await insertRequest.run({ workspaceId, number, formId, formRevision: active.revision, requesterId: access.principalId, ...values }, access.client);
    const requestId = created!.id;
    if (source) {
      const lines = await requestLines.run({ workspaceId, requestIds: [source.id] }, access.client);
      await insertRequestLines.run(
        {
          workspaceId,
          requestId,
          groups: copy.groups,
          lines: JSON.stringify(lines.map((line) => ({ kind: line.kind, item_id: line.item_id, asset_type_id: line.asset_type_id, description: line.description, quantity: line.per_group ? null : line.quantity, per_group: line.per_group, unit: line.unit }))),
        },
        access.client,
      );
    }
    await recordAudit(access, { action: 'labs.request.create', entityType: 'labs.request', entityId: requestId, changes: { number, formId, from: source?.id ?? null } });
    return visibleRequest(access, requestId);
  });
}

/** Las respuestas de otra solicitud que la revisión nueva todavía acepta, una por una. */
function copyAnswers(layout: FormLayout, answers: Record<string, unknown>): SaveRequest['answers'] {
  const schema = requestAnswers(layout).partial();
  return Object.fromEntries(
    Object.entries(answers).filter(([key, value]) => schema.safeParse({ [key]: value }).success) as Array<[string, string | number | boolean | null]>,
  );
}

/** Guarda el borrador o la corrección pedida entera, con sus recursos, mientras quien pide la edita. */
export function saveRequest(pool: pg.Pool, request: CommandRequest, requestId: string, input: SaveRequest): Promise<LabsRequest> {
  return runCommand(pool, request, 'labs.request.save', { requestId, ...input }, requires(REQUEST_CREATE), async (access) => {
    const workspaceId = access.workspace.id;
    const current = await lockMine(access, requestId, input.expectedVersion);
    if (!REQUEST_EDITABLE.includes(current.status)) throw invalid('Esta solicitud ya no se edita');
    const [row] = await listRequestsQuery.run({ workspaceId, requestId, requesterId: null }, access.client);
    const layout = await layoutOf(access, row!.form_id, row!.form_revision);
    const values = await fields(access, layout, input);
    const lines = await linesPayload(access, input);
    await writeRequest.run({ workspaceId, requestId, ...values }, access.client);
    await deleteRequestLines.run({ workspaceId, requestId }, access.client);
    await insertRequestLines.run({ workspaceId, requestId, groups: values.groups, lines }, access.client);
    await recordAudit(access, { action: 'labs.request.save', entityType: 'labs.request', entityId: requestId, changes: { lines: input.lines.length } });
    return visibleRequest(access, requestId);
  });
}

/**
 * Envía lo guardado: lo esencial completo, los datos libres válidos y toda fecha futura y dentro de un período activo.
 * Si la primera cae antes de la anticipación, entra «fuera de plazo» y el Administrador decide.
 */
export function submitRequest(pool: pg.Pool, request: CommandRequest, requestId: string, { expectedVersion }: z.infer<typeof requestVersionRequest>): Promise<LabsRequest> {
  return runCommand(pool, request, 'labs.request.submit', { requestId, expectedVersion }, requires(REQUEST_CREATE), async (access) => {
    const workspaceId = access.workspace.id;
    const current = await lockMine(access, requestId, expectedVersion);
    if (!REQUEST_EDITABLE.includes(current.status)) throw invalid('Esta solicitud ya se envió');
    const [row] = await listRequestsQuery.run({ workspaceId, requestId, requesterId: null }, access.client);
    const saved = row!;
    const layout = await layoutOf(access, saved.form_id, saved.form_revision);
    const present = systemKeys(layout);
    const missing = [
      saved.title === null && 'el título',
      saved.teacher_name === null && 'el docente',
      saved.dates.length === 0 && 'la fecha',
      (saved.starts_at === null || saved.ends_at === null) && 'el horario',
      saved.participants === null && 'los participantes',
      present.has('tipo') && saved.activity_type === null && 'el tipo de actividad',
      present.has('asignatura') && saved.subject === null && 'la asignatura',
      present.has('carrera') && saved.career === null && 'la carrera',
    ].filter((value): value is string => value !== false);
    if (missing.length > 0) throw invalid(`Falta ${missing.join(', ')}`);
    if (!requestAnswers(layout).safeParse(saved.answers).success) throw invalid('Faltan datos obligatorios del formato');
    const today = todayIn(access.workspace.timeZone);
    if (saved.dates.some((date) => date <= today)) throw invalid('Las fechas tienen que ser futuras');
    const outside = await datesOutsidePeriods.run({ workspaceId, dates: saved.dates }, access.client);
    if (outside.length > 0) throw invalid(`Fuera de los períodos no se agenda: ${outside.map((date) => date.date).join(', ')}`);
    const [settings] = await getSettingsQuery.run({ workspaceId }, access.client);
    const late = saved.dates[0]! < addDays(today, settings?.lead_days ?? LEAD_DAYS_DEFAULT);
    await setRequestStatus.run({ workspaceId, requestId, status: 'submitted', late, submittedAt: new Date().toISOString() }, access.client);
    const action = current.status === 'changes_requested' ? 'resubmitted' : 'submitted';
    await insertRequestEvent.run({ workspaceId, requestId, action, reason: null, principalId: access.principalId }, access.client);
    await recordAudit(access, { action: 'labs.request.submit', entityType: 'labs.request', entityId: requestId, changes: { late } });
    return visibleRequest(access, requestId);
  });
}

/** Quien pide la cancela mientras no esté programada; queda en su historial y no se borra. */
export function cancelRequest(pool: pg.Pool, request: CommandRequest, requestId: string, { expectedVersion }: z.infer<typeof requestVersionRequest>): Promise<LabsRequest> {
  return runCommand(pool, request, 'labs.request.cancel', { requestId, expectedVersion }, requires(REQUEST_CREATE), async (access) => {
    const current = await lockMine(access, requestId, expectedVersion);
    if (!REQUEST_CANCELLABLE.includes(current.status)) throw invalid('Esta solicitud ya no se cancela');
    // Programada, quien la pidió la cancela hasta el día anterior a su primer bloque; después, el laboratorio.
    const [first] = await requestBlocks.run({ workspaceId: access.workspace.id, requestId }, access.client);
    if (first && first.date <= todayIn(access.workspace.timeZone)) throw invalid('Desde el día de la práctica la cancela el laboratorio');
    await resolve(access, requestId, 'cancelled', null);
    return visibleRequest(access, requestId);
  });
}

// ---------------------------------------------------------------------------
// Comandos del Administrador
// ---------------------------------------------------------------------------

const releaseReasons = { changes_requested: 'Se pidieron cambios', rejected: 'Solicitud rechazada', cancelled: 'Solicitud cancelada' } as const;

/**
 * Cambia el estado con su evento y su auditoría; los bloques que tuviera se liberan, con lo que apartaron (L-01d), y
 * quedan en su historial.
 */
async function resolve(access: WorkspaceAccess, requestId: string, status: 'changes_requested' | 'rejected' | 'cancelled', reason: string | null) {
  const workspaceId = access.workspace.id;
  const active = await activeRequestActivities.run({ workspaceId, requestId, activityId: null }, access.client);
  // Una práctica que empezó no se libera: el responsable la cierra (L-01e).
  if (active.some((block) => !ACTIVITY_CHANGEABLE.includes(block.stage as ActivityStage))) throw invalid('Una práctica de esta solicitud ya empezó: no se libera, se cierra');
  await releaseBlocks(access, active.map((block) => block.id), reason ?? releaseReasons[status]);
  await releaseRequestBlocks.run({ workspaceId, requestId }, access.client);
  await setRequestStatus.run({ workspaceId, requestId, status, late: null, submittedAt: null }, access.client);
  await insertRequestEvent.run({ workspaceId, requestId, action: status, reason, principalId: access.principalId }, access.client);
  await recordAudit(access, { action: `labs.request.${status}`, entityType: 'labs.request', entityId: requestId, changes: { reason } });
}

/** Pedir cambios o rechazar una enviada, siempre con motivo; con la versión que el Administrador vio. */
function review(status: 'changes_requested' | 'rejected') {
  return (pool: pg.Pool, request: CommandRequest, requestId: string, { expectedVersion, reason }: z.infer<typeof requestReasonRequest>): Promise<LabsRequest> =>
    runCommand(pool, request, `labs.request.${status}`, { requestId, expectedVersion, reason }, requires(REQUEST_REVIEW), async (access) => {
      const [current] = await lockRequest.run({ workspaceId: access.workspace.id, requestId }, access.client);
      if (!current || current.status === 'draft') throw notFound();
      if (current.status !== 'submitted') throw new AppError('REQUEST_RESOLVED', 'Otra persona ya resolvió esta solicitud');
      await resolve(access, requestId, status, reason);
      return visibleRequest(access, requestId);
    });
}

export const requestChanges = review('changes_requested');
export const rejectRequest = review('rejected');

/** El laboratorio cancela una solicitud enviada o programada, siempre con motivo; sus bloques se liberan. */
export function labCancelRequest(pool: pg.Pool, request: CommandRequest, requestId: string, { expectedVersion, reason }: z.infer<typeof labCancelRequestSchema>): Promise<LabsRequest> {
  return runCommand(pool, request, 'labs.request.lab_cancel', { requestId, expectedVersion, reason }, requires(REQUEST_REVIEW), async (access) => {
    const [current] = await lockRequest.run({ workspaceId: access.workspace.id, requestId }, access.client);
    if (!current || current.status === 'draft') throw notFound();
    if (current.status !== 'submitted' && current.status !== 'scheduled') throw new AppError('REQUEST_RESOLVED', 'Otra persona ya resolvió esta solicitud');
    if (current.version !== expectedVersion) throw conflict();
    await resolve(access, requestId, 'cancelled', reason);
    return visibleRequest(access, requestId);
  });
}
