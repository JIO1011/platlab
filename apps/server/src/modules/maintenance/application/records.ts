import { createHash, randomUUID } from 'node:crypto';
import type pg from 'pg';
import type { z } from 'zod';
import {
  ASSET_DOCUMENT_MAX_BYTES,
  VALIDITY_KINDS,
  type createRecordRequest,
  type MaintenanceRecord,
  type RecordCreated,
  type RecordList,
  type recordListQuery,
  type WorkKind,
} from '@platlab/contracts';
import { AppError } from '../../../platform/errors.js';
import { decodeCursor, encodeCursor } from '../../../platform/http/cursor.js';
import { pdfBody } from '../../../platform/storage/pdf.js';
import type { PublicFiles } from '../../../platform/storage/public-files.js';
import { recordAudit, requires, withModuleAccess, type CommandRequest, type QueryRequest, type WorkspaceAccess } from '../../core/index.js';
import { recordConservation, requireActiveAsset } from '../../equipment/index.js';
import {
  insertCertificate,
  insertRecord,
  listRecords as listRecordsQuery,
  nextDueOn,
  recordExists,
  sharePlan,
  shareProvider,
  type IListRecordsResult,
} from '../infrastructure/records.queries.js';
import { workspaceToday } from '../infrastructure/work.queries.js';
import { RECORD, runCommand, runQuery, runRecordCommand } from './command.js';

/**
 * Registro de lo hecho (ADR 0020): inmutable, con el plan que se elige o, sin plan, con su tipo de trabajo.
 * El certificado PDF se adjunta al registrar o después, uno por registro.
 */

const toRecord = (row: IListRecordsResult): MaintenanceRecord => ({
  id: row.id,
  asset: { id: row.asset_id, code: row.asset_code, name: row.asset_name },
  // El registro repite el tipo de trabajo de su plan (FK de records).
  plan: row.plan_id && row.plan_title ? { id: row.plan_id, title: row.plan_title, kind: row.kind as WorkKind } : null,
  kind: row.kind as WorkKind,
  performedOn: row.performed_on,
  provider: row.provider_id && row.provider_name ? { id: row.provider_id, name: row.provider_name } : null,
  result: row.result as MaintenanceRecord['result'],
  observations: row.observations,
  checklist: row.checklist as MaintenanceRecord['checklist'],
  cost: row.cost,
  validUntil: row.valid_until,
  conservation: row.conservation as MaintenanceRecord['conservation'],
  recordedBy: row.recorded_by_name ? { name: row.recorded_by_name } : null,
  recordedAt: row.recorded_at.toISOString(),
  certificate:
    row.certificate_url && row.certificate_byte_size !== null && row.certificate_uploaded_at
      ? { url: row.certificate_url, byteSize: row.certificate_byte_size, uploadedAt: row.certificate_uploaded_at.toISOString() }
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

/** El tipo de trabajo y la lista del plan elegido, bloqueado; sin plan, el tipo que llega y ninguna lista. */
async function chosenWork(
  access: WorkspaceAccess,
  input: z.infer<typeof createRecordRequest>,
): Promise<{ kind: WorkKind; checklist: string[] }> {
  if (input.planId === null) {
    if (!input.kind) throw new AppError('VALIDATION_FAILED', 'Sin plan, indica el tipo de trabajo');
    return { kind: input.kind, checklist: [] };
  }
  const [plan] = await sharePlan.run({ workspaceId: access.workspace.id, planId: input.planId }, access.client);
  if (!plan) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
  if (plan.archived_at) throw new AppError('VALIDATION_FAILED', 'El plan está archivado');
  if (input.kind && input.kind !== plan.kind) throw new AppError('VALIDATION_FAILED', 'El tipo de trabajo es el del plan');
  return { kind: plan.kind as WorkKind, checklist: plan.checklist };
}

/** La lista del plan con sus marcas, en orden: cada ítem se marca, y nada más. */
function markedChecklist(items: string[], marks: boolean[]): { item: string; done: boolean }[] {
  if (marks.length !== items.length) throw new AppError('VALIDATION_FAILED', 'Marca cada ítem de la lista del plan');
  return items.map((item, index) => ({ item, done: marks[index]! }));
}

/**
 * «Registrar mantenimiento» (ADR 0020). Se admite con Mantenimiento y Equipos. Bloquea el plan, después el
 * equipo (no dado de baja) y el proveedor; el plan debe cubrir al equipo. La fecha no puede ser posterior a
 * hoy en la zona del espacio, y «válida hasta» es solo de calibraciones y verificaciones. Con el estado
 * físico, Equipos lo aplica con su permiso y su historial. Responde con la nueva próxima fecha del plan.
 */
export function createRecord(pool: pg.Pool, request: CommandRequest, input: z.infer<typeof createRecordRequest>): Promise<RecordCreated> {
  return runRecordCommand(pool, request, 'maintenance.record.create', input, requires(RECORD), async (access) => {
    const workspaceId = access.workspace.id;
    const work = await chosenWork(access, input);
    await requireActiveAsset(access, input.assetId);
    if (input.planId) {
      const [covered] = await nextDueOn.run({ workspaceId, planId: input.planId, assetId: input.assetId }, access.client);
      if (!covered) throw new AppError('VALIDATION_FAILED', 'El plan no cubre a este equipo');
    }
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
    const [created] = await insertRecord.run(
      {
        workspaceId,
        assetId: input.assetId,
        planId: input.planId,
        kind: work.kind,
        performedOn: input.performedOn,
        providerId: input.providerId,
        result: input.result,
        observations: input.observations,
        checklist: JSON.stringify(checklist),
        cost: input.cost,
        validUntil: input.validUntil,
        conservation: input.conservation,
        recordedBy: access.principalId,
      },
      access.client,
    );
    const recordId = created!.id;
    if (input.conservation) await recordConservation(access, input.assetId, input.conservation);
    await recordAudit(access, {
      action: 'maintenance.record.create',
      entityType: 'maintenance.record',
      entityId: recordId,
      changes: { ...input, kind: work.kind, checklist },
    });
    const [next] = input.planId ? await nextDueOn.run({ workspaceId, planId: input.planId, assetId: input.assetId }, access.client) : [];
    return { ...(await recordById(access, recordId)), nextDueOn: next?.due_on ?? null };
  });
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
  const requireRecord = async (access: WorkspaceAccess) => {
    const [found] = await recordExists.run({ workspaceId: access.workspace.id, recordId }, access.client);
    if (!found) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
  };
  // Sin el permiso o sin el registro, nada llega al bucket. Si ya tiene certificado se decide al
  // registrarlo, así el reintento con la misma clave recibe la respuesta guardada.
  await withModuleAccess(
    pool,
    { subject: request.subject, workspaceId: request.workspaceId, moduleCode: 'maintenance', actionClass: 'new_operation' },
    async (access) => {
      await authorize(access);
      await requireRecord(access);
    },
  );
  const certificateId = randomUUID();
  const objectPath = `${request.workspaceId}/maintenance/certificates/${certificateId}.pdf`;
  const url = await files.put(objectPath, pdf, 'application/pdf');
  const sha256 = createHash('sha256').update(pdf).digest('hex');

  return runCommand(pool, request, 'maintenance.record.certificate.add', { recordId, sha256 }, authorize, async (access) => {
    await requireRecord(access);
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
