import { createHash, randomUUID } from 'node:crypto';
import type pg from 'pg';
import type { z } from 'zod';
import {
  ASSET_DOCUMENT_MAX_BYTES,
  VALIDITY_KINDS,
  type correctRecordRequest,
  type createRecordRequest,
  type MaintenanceRecord,
  type RecordCreated,
  type RecordList,
  type recordListQuery,
  type voidRecordRequest,
  type PlanKind,
  type WorkKind,
} from '@platlab/contracts';
import { AppError } from '../../../platform/errors.js';
import { decodeCursor, encodeCursor } from '../../../platform/http/cursor.js';
import { pdfBody } from '../../../platform/storage/pdf.js';
import type { PublicFiles } from '../../../platform/storage/public-files.js';
import {
  recordAudit,
  requirePermission,
  requires,
  withModuleAccess,
  type CommandRequest,
  type QueryRequest,
  type WorkspaceAccess,
} from '../../core/index.js';
import { lockAssetFault, recordConservation, requireActiveAsset, resolveAssetFault } from '../../equipment/index.js';
import {
  carryCertificate,
  insertCertificate,
  insertRecord,
  listRecords as listRecordsQuery,
  lockRecord,
  nextDueOn,
  recordExists,
  sharePlan,
  shareProvider,
  voidRecord as voidRecordQuery,
  type IListRecordsResult,
} from '../infrastructure/records.queries.js';
import { workspaceToday } from '../infrastructure/work.queries.js';
import { RECORD, runCommand, runQuery, runRecordCommand, VOID } from './command.js';

/**
 * Registro de lo hecho (ADR 0020): inmutable, con el plan que se elige o, sin plan, con su tipo de trabajo.
 * El certificado PDF se adjunta al registrar o después, uno por registro. El Administrador lo anula con
 * motivo o lo corrige con un registro nuevo (M-01b).
 */

type WorkInput = z.infer<typeof createRecordRequest>;

const recordRef = (id: string | null, performedOn: string | null | undefined) => (id && performedOn ? { id, performedOn } : null);

const toRecord = (row: IListRecordsResult): MaintenanceRecord => ({
  id: row.id,
  asset: { id: row.asset_id, code: row.asset_code, name: row.asset_name },
  // El registro repite el tipo de trabajo de su plan (FK de records).
  plan: row.plan_id && row.plan_title ? { id: row.plan_id, title: row.plan_title, kind: row.kind as PlanKind } : null,
  kind: row.kind as WorkKind,
  performedOn: row.performed_on,
  dueOn: row.due_on,
  provider: row.provider_id && row.provider_name ? { id: row.provider_id, name: row.provider_name } : null,
  result: row.result as MaintenanceRecord['result'],
  observations: row.observations,
  checklist: row.checklist as MaintenanceRecord['checklist'],
  cost: row.cost,
  validUntil: row.valid_until,
  acceptanceCriteria: row.acceptance_criteria,
  recordedBy: row.recorded_by_name ? { name: row.recorded_by_name } : null,
  recordedAt: row.recorded_at.toISOString(),
  certificate:
    row.certificate_url && row.certificate_byte_size !== null && row.certificate_uploaded_at
      ? { url: row.certificate_url, byteSize: row.certificate_byte_size, uploadedAt: row.certificate_uploaded_at.toISOString() }
      : null,
  faultId: row.fault_id,
  corrects: recordRef(row.corrects_record_id, row.corrects_performed_on),
  voided:
    row.voided_at && row.void_reason
      ? {
          at: row.voided_at.toISOString(),
          by: row.voided_by_name ? { name: row.voided_by_name } : null,
          reason: row.void_reason,
          correctedBy: recordRef(row.corrected_by_id, row.corrected_by_performed_on),
        }
      : null,
});

interface RecordFilter {
  recordId?: string;
  assetId?: string;
  /** Fecha del trabajo, hora exacta del registro e id del último de la página anterior. */
  after?: string[] | null;
  limit: number;
}

/** Una página de registros, del más reciente al más antiguo; también la usa la ficha del equipo. */
async function recordRows(access: WorkspaceAccess, filter: RecordFilter): Promise<IListRecordsResult[]> {
  return listRecordsQuery.run(
    {
      workspaceId: access.workspace.id,
      recordId: filter.recordId ?? null,
      assetId: filter.assetId ?? null,
      afterOn: filter.after?.[0] ?? null,
      afterAt: filter.after?.[1] ?? null,
      afterId: filter.after?.[2] ?? null,
      limit: filter.limit,
    },
    access.client,
  );
}

export const recordsOf = async (access: WorkspaceAccess, assetId: string, limit: number): Promise<MaintenanceRecord[]> =>
  (await recordRows(access, { assetId, limit })).map(toRecord);

async function recordById(access: WorkspaceAccess, recordId: string): Promise<MaintenanceRecord> {
  const [row] = await recordRows(access, { recordId, limit: 1 });
  if (!row) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
  return toRecord(row);
}

interface ChosenWork {
  kind: WorkKind;
  checklist: string[];
  /** La versión del plan y su criterio, que el registro copia; null sin plan. */
  planVersion: number | null;
  acceptanceCriteria: string | null;
}

/**
 * El plan elegido, bloqueado, en la versión que la persona vio: si cambió mientras llenaba la hoja,
 * VERSION_CONFLICT para que revise la lista. Sin plan, el tipo que llega y ninguna lista.
 */
async function chosenWork(access: WorkspaceAccess, input: WorkInput): Promise<ChosenWork> {
  if (input.planId === null) {
    if (!input.kind) throw new AppError('VALIDATION_FAILED', 'Sin plan, indica el tipo de trabajo');
    return { kind: input.kind, checklist: [], planVersion: null, acceptanceCriteria: null };
  }
  const [plan] = await sharePlan.run({ workspaceId: access.workspace.id, planId: input.planId }, access.client);
  if (!plan) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
  if (plan.archived_at) throw new AppError('VALIDATION_FAILED', 'El plan está archivado');
  if (input.kind && input.kind !== plan.kind) throw new AppError('VALIDATION_FAILED', 'El tipo de trabajo es el del plan');
  if (input.planVersion !== plan.version) {
    throw new AppError('VERSION_CONFLICT', 'El plan cambió mientras registrabas: revisa la lista y vuelve a registrar');
  }
  return { kind: plan.kind as WorkKind, checklist: plan.checklist, planVersion: plan.version, acceptanceCriteria: plan.acceptance_criteria };
}

/** La lista del plan con sus marcas, en orden: cada ítem se marca, y nada más. */
function markedChecklist(items: string[], marks: boolean[]): { item: string; done: boolean }[] {
  if (marks.length !== items.length) throw new AppError('VALIDATION_FAILED', 'Marca cada ítem de la lista del plan');
  return items.map((item, index) => ({ item, done: marks[index]! }));
}

/** Bloquea el registro vigente; si no lo hay, dice si no existe o si ya está anulado. Devuelve su equipo. */
async function lockLiveRecord(access: WorkspaceAccess, recordId: string, voidedMessage: string): Promise<string> {
  const filter = { workspaceId: access.workspace.id, recordId };
  const [record] = await lockRecord.run(filter, access.client);
  if (record) return record.asset_id;
  const [found] = await recordExists.run(filter, access.client);
  throw found ? new AppError('VALIDATION_FAILED', voidedMessage) : new AppError('NOT_FOUND', 'Recurso no encontrado');
}

/** Anula el registro con su motivo, una sola vez; con `assetId`, solo si es de ese equipo (la corrección). */
async function voidLocked(access: WorkspaceAccess, recordId: string, reason: string, assetId?: string): Promise<void> {
  const workspaceId = access.workspace.id;
  const recordAsset = await lockLiveRecord(access, recordId, 'El registro ya está anulado');
  if (assetId && recordAsset !== assetId) {
    throw new AppError('VALIDATION_FAILED', 'La corrección es del mismo equipo: si era otro, anula el registro y registra en el correcto');
  }
  await voidRecordQuery.run({ workspaceId, recordId, actorId: access.principalId, reason }, access.client);
  await recordAudit(access, { action: 'maintenance.record.void', entityType: 'maintenance.record', entityId: recordId, changes: { reason } });
}

/** La corrección de un registro: el anulado y si el nuevo lleva su certificado. */
interface Correction {
  recordId: string;
  reason: string;
  keepCertificate: boolean;
}

/**
 * La fecha que tocaba y que el trabajo cumple (M-01c): la próxima del plan. No la cumple un trabajo anterior o
 * del mismo día que el último registro (historia cargada) ni el que repite un «No conforme» antes de su
 * próxima fecha. Fechas ISO: el orden del texto es el del calendario.
 */
function fulfilledDue(
  slot: { due_on: string; last_performed_on: string | null; last_result: string | null },
  performedOn: string,
): string | null {
  if (slot.last_performed_on && performedOn <= slot.last_performed_on) return null;
  if (slot.last_result === 'fail' && performedOn < slot.due_on) return null;
  return slot.due_on;
}

/**
 * Lo común de registrar y de corregir (ADR 0020, M-01b). Bloquea el plan, el incidente, el equipo (no dado de
 * baja), el proveedor y, al corregir, el registro anulado (02 §6); el plan debe cubrir al equipo. La fecha no
 * puede ser posterior a hoy en la zona del espacio, y «válida hasta» es solo de calibraciones y verificaciones.
 * Guarda la fecha que tocaba (M-01c). Equipos soluciona el incidente de un correctivo con «qué se hizo» y
 * aplica el estado físico actual con la fecha de hoy, con sus permisos y su historial; el registro no los
 * guarda. Responde con la nueva próxima fecha del plan.
 */
async function registerWork(access: WorkspaceAccess, input: WorkInput, correction?: Correction): Promise<RecordCreated> {
  const workspaceId = access.workspace.id;
  const work = await chosenWork(access, input);
  if (input.faultId) await lockAssetFault(access, input.faultId, input.assetId);
  await requireActiveAsset(access, input.assetId);
  if (input.providerId) {
    const [provider] = await shareProvider.run({ workspaceId, providerId: input.providerId }, access.client);
    if (!provider) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
    if (provider.archived_at) throw new AppError('VALIDATION_FAILED', 'El proveedor está archivado');
  }
  const [{ today }] = (await workspaceToday.run({ timeZone: access.workspace.timeZone }, access.client)) as [{ today: string }];
  // Fechas ISO (AAAA-MM-DD): el orden del texto es el del calendario.
  if (input.performedOn > today) throw new AppError('VALIDATION_FAILED', 'La fecha del trabajo no puede ser posterior a hoy');
  if (input.validUntil && !VALIDITY_KINDS.includes(work.kind)) {
    throw new AppError('VALIDATION_FAILED', 'Solo una calibración o una verificación tiene «válida hasta»');
  }
  const checklist = markedChecklist(work.checklist, input.checklist);
  if (correction) await voidLocked(access, correction.recordId, correction.reason, input.assetId);
  // Después de anular: al corregir, la fecha que tocaba es la de antes del registro anulado.
  const [slot] = input.planId ? await nextDueOn.run({ workspaceId, planId: input.planId, assetId: input.assetId }, access.client) : [];
  if (input.planId && !slot) throw new AppError('VALIDATION_FAILED', 'El plan no cubre a este equipo');
  const [created] = await insertRecord.run(
    {
      workspaceId,
      assetId: input.assetId,
      planId: input.planId,
      planVersion: work.planVersion,
      acceptanceCriteria: work.acceptanceCriteria,
      kind: work.kind,
      performedOn: input.performedOn,
      dueOn: slot ? fulfilledDue(slot, input.performedOn) : null,
      providerId: input.providerId,
      result: input.result,
      observations: input.observations,
      checklist: JSON.stringify(checklist),
      cost: input.cost,
      validUntil: input.validUntil,
      recordedBy: access.principalId,
      faultId: input.faultId,
      correctsRecordId: correction?.recordId ?? null,
    },
    access.client,
  );
  const recordId = created!.id;
  if (correction?.keepCertificate) {
    await carryCertificate.run({ workspaceId, recordId, fromRecordId: correction.recordId, uploadedBy: access.principalId }, access.client);
  }
  if (input.faultId && input.resolveFault) {
    // El contrato exige «qué se hizo» en un correctivo: es el resultado con que se soluciona.
    await resolveAssetFault(access, input.faultId, input.assetId, {
      resolution: input.observations!,
      returnToOperational: input.resolveFault.returnToOperational,
    });
  }
  if (input.conservation) await recordConservation(access, input.assetId, input.conservation);
  await recordAudit(access, {
    action: correction ? 'maintenance.record.correct' : 'maintenance.record.create',
    entityType: 'maintenance.record',
    entityId: recordId,
    changes: { ...input, kind: work.kind, checklist, ...(correction ? { corrects: correction } : {}) },
  });
  const [next] = input.planId ? await nextDueOn.run({ workspaceId, planId: input.planId, assetId: input.assetId }, access.client) : [];
  return { ...(await recordById(access, recordId)), nextDueOn: next?.due_on ?? null };
}

/** «Registrar mantenimiento» (ADR 0020): se admite con Mantenimiento y Equipos. */
export function createRecord(pool: pg.Pool, request: CommandRequest, input: WorkInput): Promise<RecordCreated> {
  return runRecordCommand(pool, request, 'maintenance.record.create', input, requires(RECORD), (access) => registerWork(access, input));
}

/** «Anular» (M-01b): el Administrador, con motivo; el registro sigue a la vista y deja de contar para la próxima fecha. */
export function voidRecord(
  pool: pg.Pool,
  request: CommandRequest,
  recordId: string,
  input: z.infer<typeof voidRecordRequest>,
): Promise<MaintenanceRecord> {
  return runCommand(pool, request, 'maintenance.record.void', { recordId, ...input }, requires(VOID), async (access) => {
    await voidLocked(access, recordId, input.reason);
    return recordById(access, recordId);
  });
}

/**
 * «Corregir» (M-01b): el Administrador anula el registro y registra el correcto, del mismo equipo, en una sola
 * transacción admitida con Mantenimiento y Equipos. Lo que el anulado aplicó en Equipos no se revierte.
 */
export function correctRecord(
  pool: pg.Pool,
  request: CommandRequest,
  recordId: string,
  input: z.infer<typeof correctRecordRequest>,
): Promise<RecordCreated> {
  return runRecordCommand(
    pool,
    request,
    'maintenance.record.correct',
    { recordId, ...input },
    async (access) => {
      await requirePermission(access, VOID);
      await requirePermission(access, RECORD);
    },
    (access) => registerWork(access, input.record, { recordId, reason: input.reason, keepCertificate: input.keepCertificate }),
  );
}

/**
 * Adjunta el certificado PDF de un registro, con las reglas de los documentos de Equipos (E-01e): nada
 * externo ocurre con la transacción abierta. Una primera autoriza y comprueba el registro, el archivo se
 * sube fuera y otra vuelve a autorizar y lo registra. Un registro con certificado responde CONFLICT; el
 * archivo de ese intento queda sin referencia en el bucket público.
 */
export async function uploadRecordCertificate(
  pool: pg.Pool,
  files: PublicFiles,
  request: CommandRequest,
  recordId: string,
  body: unknown,
): Promise<MaintenanceRecord> {
  const pdf = pdfBody(body, ASSET_DOCUMENT_MAX_BYTES, 'El certificado debe ser un PDF de hasta 20 MiB');
  const authorize = requires(RECORD);
  const voided = 'Un registro anulado no admite certificado';
  // Sin el permiso o sin el registro vigente, nada llega al bucket. Si ya tiene certificado se decide al
  // registrarlo, así el reintento con la misma clave recibe la respuesta guardada.
  await withModuleAccess(
    pool,
    { subject: request.subject, workspaceId: request.workspaceId, moduleCode: 'maintenance', actionClass: 'new_operation' },
    async (access) => {
      await authorize(access);
      const [found] = await recordExists.run({ workspaceId: access.workspace.id, recordId }, access.client);
      if (!found) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
      if (found.voided_at) throw new AppError('VALIDATION_FAILED', voided);
    },
  );
  const certificateId = randomUUID();
  const objectPath = `${request.workspaceId}/maintenance/certificates/${certificateId}.pdf`;
  const url = await files.put(objectPath, pdf, 'application/pdf');
  const sha256 = createHash('sha256').update(pdf).digest('hex');

  return runCommand(pool, request, 'maintenance.record.certificate.add', { recordId, sha256 }, authorize, async (access) => {
    await lockLiveRecord(access, recordId, voided);
    const [inserted] = await insertCertificate.run(
      {
        id: certificateId,
        workspaceId: access.workspace.id,
        recordId,
        objectPath,
        url,
        byteSize: pdf.byteLength,
        sha256,
        uploadedBy: access.principalId,
      },
      access.client,
    );
    if (!inserted) throw new AppError('VALIDATION_FAILED', 'El registro ya tiene certificado');
    await recordAudit(access, {
      action: 'maintenance.record.certificate.add',
      entityType: 'maintenance.record',
      entityId: recordId,
      changes: { certificateId, sha256, byteSize: pdf.byteLength },
    });
    return recordById(access, recordId);
  });
}

/** Completados (ADR 0020): del más reciente al más antiguo; con `assetId`, los de un equipo. */
export function listRecords(pool: pg.Pool, request: QueryRequest, query: z.infer<typeof recordListQuery>): Promise<RecordList> {
  return runQuery(pool, request, async (access) => {
    const rows = await recordRows(access, {
      ...(query.assetId ? { assetId: query.assetId } : {}),
      after: decodeCursor(query.cursor, 3),
      limit: query.limit + 1,
    });
    const visible = rows.slice(0, query.limit);
    const last = visible.at(-1);
    return {
      items: visible.map(toRecord),
      nextCursor: rows.length > query.limit && last ? encodeCursor([last.performed_on, last.recorded_key, last.id]) : null,
    };
  });
}
