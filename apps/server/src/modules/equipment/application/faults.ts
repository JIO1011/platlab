import type pg from 'pg';
import type { z } from 'zod';
import type {
  Fault,
  FaultCounts,
  FaultList,
  FaultStats,
  faultListQuery,
  reportFaultRequest,
  ReportableAsset,
  ReportableAssetList,
  resolveFaultRequest,
} from '@platlab/contracts';
import {
  attendFault as attendCase,
  lockFault,
  reportCase,
  resolveFault as resolveCase,
  type IncidentsContext,
} from '../../../capabilities/incidents/index.js';
import { AppError } from '../../../platform/errors.js';
import { decodeCursor, encodeCursor } from '../../../platform/http/cursor.js';
import {
  hasPermission,
  moduleQuery,
  recordAudit,
  requirePermission,
  requires,
  type CommandRequest,
  type QueryRequest,
  type WorkspaceAccess,
} from '../../core/index.js';
import { changeAssetCondition, lockAsset } from '../infrastructure/assets.queries.js';
import {
  faultCounts,
  faultStats,
  listFaults as listFaultsQuery,
  reportableAssets,
  type IListFaultsResult,
} from '../infrastructure/faults.queries.js';
import { CONDITION, FAULT_MANAGE, FAULT_REPORT, lockActiveAsset, runCommand } from './command.js';

/** Reportes de fallas (ADR 0019): todos reportan; el Operador y el Administrador atienden, resuelven y cierran. */

/** Consultas de Reportes: las abre todo el que reporta; el alcance lo decide `faultScope`. */
const runReporterQuery = moduleQuery('equipment', FAULT_REPORT);
/** Las cifras de todo el espacio son de quien atiende, que ve todas las fallas. */
const runManagerQuery = moduleQuery('equipment', FAULT_MANAGE);

const incidents = (access: WorkspaceAccess): IncidentsContext => ({
  client: access.client,
  workspaceId: access.workspace.id,
  principalId: access.principalId,
  moduleCode: 'equipment',
});

/** Quien atiende fallas ve todas; quien solo reporta, las suyas. */
async function faultScope(access: WorkspaceAccess): Promise<string | null> {
  return (await hasPermission(access, FAULT_MANAGE)) ? null : access.principalId;
}

const toFault = (row: IListFaultsResult): Fault => ({
  id: row.id,
  asset: {
    id: row.asset_id,
    code: row.asset_code,
    name: row.asset_name,
    photoUrl: row.asset_photo_url,
    location: { name: row.location_name, path: row.location_path },
  },
  faultType: row.fault_type as Fault['faultType'],
  description: row.description,
  usable: row.usable,
  status: row.status as Fault['status'],
  reportedBy: row.reported_by_name ? { name: row.reported_by_name } : null,
  reportedAt: row.reported_at.toISOString(),
  attendedBy: row.attended_by_name ? { name: row.attended_by_name } : null,
  attendedAt: row.attended_at?.toISOString() ?? null,
  resolution: row.resolution,
  resolvedBy: row.resolved_by_name ? { name: row.resolved_by_name } : null,
  resolvedAt: row.resolved_at?.toISOString() ?? null,
  warranty: row.warranty_until
    ? { until: row.warranty_until, supplier: row.supplier, documentUrl: row.warranty_document_url }
    : null,
});

/** Una falla dentro del alcance de la persona; NOT_FOUND fuera de él. */
async function faultById(access: WorkspaceAccess, faultId: string): Promise<Fault> {
  const [row] = await listFaultsQuery.run(
    {
      workspaceId: access.workspace.id,
      faultId,
      reportedBy: await faultScope(access),
      limit: 1,
      timeZone: access.workspace.timeZone,
    },
    access.client,
  );
  if (!row) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
  return toFault(row);
}

const typeText: Record<Fault['faultType'], string> = {
  electrical: 'eléctrica',
  mechanical: 'mecánica',
  spare_part: 'requiere repuesto',
  other: 'otra',
};

/**
 * Reporta una falla (01 §6.3). Si el equipo no se puede seguir usando y estaba operativo o con
 * restricción, pasa a fuera de servicio en la misma transacción, ligado a la falla: es la regla del
 * reporte, así que basta el permiso de reportar.
 */
export function reportFault(pool: pg.Pool, request: CommandRequest, input: z.infer<typeof reportFaultRequest>): Promise<Fault> {
  return runCommand(pool, request, 'equipment.fault.report', input, requires(FAULT_REPORT), async (access) => {
    const asset = await lockActiveAsset(access, input.assetId);
    const caseId = await reportCase(incidents(access), input);
    if (!input.usable && asset.condition !== 'faulted') {
      await changeAssetCondition.run(
        {
          workspaceId: access.workspace.id,
          assetId: input.assetId,
          fromCondition: asset.condition,
          toCondition: 'faulted',
          reason: `Falla ${typeText[input.faultType]} reportada: no se puede usar`,
          result: null,
          actorId: access.principalId,
          caseId,
        },
        access.client,
      );
    }
    await recordAudit(access, {
      action: 'equipment.fault.report',
      entityType: 'incidents.case',
      entityId: caseId,
      changes: { ...input, condition: !input.usable && asset.condition !== 'faulted' ? { from: asset.condition, to: 'faulted' } : null },
    });
    return faultById(access, caseId);
  });
}

/** Abierta → en atención, con quien la toma. Atender es resolver un pendiente (ADR 0009). */
export function attendFault(pool: pg.Pool, request: CommandRequest, faultId: string): Promise<Fault> {
  return runCommand(
    pool,
    request,
    'equipment.fault.attend',
    { faultId },
    requires(FAULT_MANAGE),
    async (access) => {
      const ctx = incidents(access);
      await lockFault(ctx, faultId);
      await attendCase(ctx, faultId);
      await recordAudit(access, { action: 'equipment.fault.attend', entityType: 'incidents.case', entityId: faultId, changes: { status: 'in_progress' } });
      return faultById(access, faultId);
    },
    'resolve_pending',
  );
}

/**
 * Resuelve con su resultado. Con `returnToOperational`, el equipo vuelve a operativo con ese resultado,
 * ligado a la falla (exige además cambiar la condición). Bloquea la falla y después el equipo (02 §6).
 */
export function resolveFault(
  pool: pg.Pool,
  request: CommandRequest,
  faultId: string,
  input: z.infer<typeof resolveFaultRequest>,
): Promise<Fault> {
  return runCommand(
    pool,
    request,
    'equipment.fault.resolve',
    { faultId, ...input },
    async (access) => {
      await requirePermission(access, FAULT_MANAGE);
      if (input.returnToOperational) await requirePermission(access, CONDITION);
    },
    async (access) => {
      const ctx = incidents(access);
      const { assetId } = await lockFault(ctx, faultId);
      await resolveCase(ctx, faultId, input.resolution);
      let condition: { from: string; to: string } | null = null;
      if (input.returnToOperational && assetId) {
        const [asset] = await lockAsset.run({ workspaceId: access.workspace.id, assetId }, access.client);
        if (asset?.condition === 'retired') throw new AppError('VALIDATION_FAILED', 'El equipo está dado de baja: no vuelve a operativo');
        if (asset && asset.condition !== 'operational') {
          await changeAssetCondition.run(
            {
              workspaceId: access.workspace.id,
              assetId,
              fromCondition: asset.condition,
              toCondition: 'operational',
              reason: 'Falla resuelta',
              result: input.resolution,
              actorId: access.principalId,
              caseId: faultId,
            },
            access.client,
          );
          condition = { from: asset.condition, to: 'operational' };
        }
      }
      await recordAudit(access, {
        action: 'equipment.fault.resolve',
        entityType: 'incidents.case',
        entityId: faultId,
        changes: { status: 'resolved', resolution: input.resolution, condition },
      });
      return faultById(access, faultId);
    },
    'resolve_pending',
  );
}

/** Incidentes (ADR 0019): del más reciente al más antiguo, dentro del alcance de la persona. */
export function listFaults(pool: pg.Pool, request: QueryRequest, query: z.infer<typeof faultListQuery>): Promise<FaultList> {
  return runReporterQuery(pool, request, async (access) => {
    const after = decodeCursor(query.cursor, 2);
    const rows = await listFaultsQuery.run(
      {
        workspaceId: access.workspace.id,
        statuses: query.status ?? null,
        assetId: query.asset ?? null,
        reportedBy: await faultScope(access),
        afterAt: after?.[0] ?? null,
        afterId: after?.[1] ?? null,
        limit: query.limit + 1,
        timeZone: access.workspace.timeZone,
      },
      access.client,
    );
    const visible = rows.slice(0, query.limit);
    const last = visible.at(-1);
    return {
      items: visible.map(toFault),
      nextCursor: rows.length > query.limit && last ? encodeCursor([last.reported_at.toISOString(), last.id]) : null,
    };
  });
}

/** Las pestañas de Incidentes: cuántos hay en cada paso, con el alcance de la lista. */
export function countFaults(pool: pg.Pool, request: QueryRequest): Promise<FaultCounts> {
  return runReporterQuery(pool, request, async (access) => {
    const [row] = await faultCounts.run({ workspaceId: access.workspace.id, reportedBy: await faultScope(access) }, access.client);
    return { open: Number(row?.open ?? 0), inProgress: Number(row?.in_progress ?? 0), resolved: Number(row?.resolved ?? 0) };
  });
}

/** «Incidentes en 12 meses» del Resumen (ADR 0019): cada mes, la reparación promedio y los días fuera de servicio. */
export function getFaultStats(pool: pg.Pool, request: QueryRequest): Promise<FaultStats> {
  return runManagerQuery(pool, request, async (access) => {
    const rows = await faultStats.run({ workspaceId: access.workspace.id, timeZone: access.workspace.timeZone }, access.client);
    const resolved = rows.reduce((sum, row) => sum + row.resolved, 0);
    const repairSeconds = rows.reduce((sum, row) => sum + Number(row.repair_seconds), 0);
    return {
      months: rows.map((row) => ({ month: row.month, reported: row.reported, resolved: row.resolved })),
      meanRepairSeconds: resolved > 0 ? Math.round(repairSeconds / resolved) : null,
      outOfService: { seconds: Number(rows[0]?.out_of_service_seconds ?? 0), assets: rows[0]?.out_of_service_assets ?? 0 },
    };
  });
}

export function getFault(pool: pg.Pool, request: QueryRequest, faultId: string): Promise<Fault> {
  return runReporterQuery(pool, request, (access) => faultById(access, faultId));
}

/** Equipos activos que se pueden reportar, por nombre o código o por su id, con lo que los identifica. */
async function findReportable(
  access: WorkspaceAccess,
  filter: { q: string; assetId: null } | { q: null; assetId: string },
): Promise<ReportableAsset[]> {
  const rows = await reportableAssets.run({ workspaceId: access.workspace.id, ...filter }, access.client);
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    photoUrl: row.photo_url,
    location: { name: row.location_name, path: row.location_path },
  }));
}

/** Para reportar sin ver el inventario: equipos activos por nombre o código. */
export function listReportableAssets(pool: pg.Pool, request: QueryRequest, q: string): Promise<ReportableAssetList> {
  return runReporterQuery(pool, request, async (access) => ({ items: await findReportable(access, { q, assetId: null }) }));
}

/** El equipo del QR de su etiqueta (ADR 0019, E-01d), para reportarlo: uno dado de baja no se encuentra. */
export function getReportableAsset(pool: pg.Pool, request: QueryRequest, assetId: string): Promise<ReportableAsset> {
  return runReporterQuery(pool, request, async (access) => {
    const [asset] = await findReportable(access, { q: null, assetId });
    if (!asset) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
    return asset;
  });
}
