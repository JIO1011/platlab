import type pg from 'pg';
import type {
  AssetMaintenance,
  DueList,
  MaintenanceAreaList,
  MaintenanceAsset,
  MaintenanceAssetList,
  MaintenanceSummary,
  NextDueList,
  OpenFault,
  PlanKind,
  WorkResult,
} from '@platlab/contracts';
import { AppError } from '../../../platform/errors.js';
import type { QueryRequest, WorkspaceAccess } from '../../core/index.js';
import { openFaultsOf } from '../../equipment/index.js';
import {
  assetExclusions,
  assetPlans,
  dueCounts,
  findAssets as findAssetsQuery,
  listAreas as listAreasQuery,
  listDue as listDueQuery,
  nextDueByAsset,
} from '../infrastructure/work.queries.js';
import { runQuery, workspaceToday } from './command.js';
import { replacementCount } from './indicators.js';
import { recordsOf } from './records.js';

/** Lo que toca hacer (ADR 0020): se calcula al consultar desde los planes, en la zona del espacio. */

/** Tope de «Por hacer»: más filas se cortan y la respuesta da el total. */
const DUE_LIMIT = 300;
/** Registros que muestra la pestaña Mantenimiento de la ficha. */
const ASSET_RECORDS = 20;

const planRef = (row: { plan_id: string; title: string; kind: string }) => ({ id: row.plan_id, title: row.title, kind: row.kind as PlanKind });
const lastResult = (value: string | null) => value as WorkResult | null;

/** «Por hacer»: primero los no conformes y después lo que vence hasta dentro de 30 días, por fecha. */
export function listDue(pool: pg.Pool, request: QueryRequest): Promise<DueList> {
  return runQuery(pool, request, async (access) => {
    const timeZone = access.workspace.timeZone;
    const today = await workspaceToday(access);
    const rows = await listDueQuery.run({ workspaceId: access.workspace.id, timeZone, limit: DUE_LIMIT }, access.client);
    const total = rows[0]?.total ?? 0;
    return {
      today,
      items: rows.map((row) => ({
        plan: planRef({ plan_id: row.plan_id, title: row.plan_title, kind: row.plan_kind }),
        asset: { id: row.asset_id, code: row.asset_code, name: row.asset_name, area: row.area_name },
        dueOn: row.due_on,
        lastRecord: row.last_record_id && row.last_performed_on ? { id: row.last_record_id, performedOn: row.last_performed_on } : null,
        lastResult: lastResult(row.last_result),
      })),
      total,
      truncated: total > rows.length,
    };
  });
}

/**
 * Las cifras de Por hacer: vencidos o no conformes, cuántos de ellos son no conformes, próximos 30 días, sin
 * plan y, para el Administrador, el aviso «Evaluar reemplazo» (M-01c).
 */
export function getSummary(pool: pg.Pool, request: QueryRequest): Promise<MaintenanceSummary> {
  return runQuery(pool, request, async (access) => {
    const [row] = (await dueCounts.run({ workspaceId: access.workspace.id, timeZone: access.workspace.timeZone }, access.client)) as [
      { today: string; overdue: number; nonconforming: number; next30: number; uncovered: number },
    ];
    return {
      today: row.today,
      overdue: row.overdue,
      nonconforming: row.nonconforming,
      next30: row.next30,
      uncovered: row.uncovered,
      replacement: await replacementCount(access),
    };
  });
}

async function findAssets(
  access: WorkspaceAccess,
  filter: { q?: string | undefined; code?: string | undefined; assetId?: string },
): Promise<MaintenanceAsset[]> {
  const rows = await findAssetsQuery.run(
    { workspaceId: access.workspace.id, q: filter.q ?? null, code: filter.code ?? null, assetId: filter.assetId ?? null },
    access.client,
  );
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    area: row.area_name,
    condition: row.condition as MaintenanceAsset['condition'],
    conservation: row.conservation as MaintenanceAsset['conservation'],
  }));
}

/** «Registrar mantenimiento» por búsqueda o por el código del QR. */
export function searchAssets(pool: pg.Pool, request: QueryRequest, query: { q?: string | undefined; code?: string | undefined }): Promise<MaintenanceAssetList> {
  return runQuery(pool, request, async (access) => ({ items: await findAssets(access, query) }));
}

/**
 * La pestaña Mantenimiento de la ficha y la hoja de registro: sus planes, sus exclusiones, sus últimos registros
 * y, para quien atiende incidentes, los abiertos, que un correctivo puede atender (M-01b).
 */
export function getAssetMaintenance(pool: pg.Pool, request: QueryRequest, assetId: string): Promise<AssetMaintenance> {
  return runQuery(pool, request, async (access) => {
    const [asset] = await findAssets(access, { assetId });
    if (!asset) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
    const filter = { workspaceId: access.workspace.id, assetId };
    const plans = await assetPlans.run(filter, access.client);
    const exclusions = await assetExclusions.run(filter, access.client);
    const openFaults = await openFaultsOf(access, assetId);
    return {
      asset,
      openFaults: openFaults.map((fault) => ({
        id: fault.id,
        faultType: fault.faultType,
        description: fault.description,
        usable: fault.usable,
        status: fault.status as OpenFault['status'],
        reportedAt: fault.reportedAt,
      })),
      plans: plans.map((row) => ({
        plan: planRef(row),
        dueOn: row.due_on,
        lastPerformedOn: row.last_performed_on,
        lastResult: lastResult(row.last_result),
      })),
      exclusions: exclusions.map((row) => ({
        plan: planRef({ plan_id: row.id, title: row.title, kind: row.kind }),
        reason: row.reason,
        createdAt: row.created_at.toISOString(),
      })),
      records: await recordsOf(access, assetId, ASSET_RECORDS),
    };
  });
}

/**
 * La columna «Próximo mantenimiento» del Inventario: de cada equipo con algún plan, su plan no conforme o,
 * si no hay, la fecha más cercana.
 */
export function listNextDue(pool: pg.Pool, request: QueryRequest, assetIds: string[]): Promise<NextDueList> {
  return runQuery(pool, request, async (access) => {
    const rows = await nextDueByAsset.run({ workspaceId: access.workspace.id, assetIds }, access.client);
    return {
      items: rows.map((row) => ({ assetId: row.asset_id, dueOn: row.due_on, plan: planRef(row), lastResult: lastResult(row.last_result) })),
    };
  });
}

/** El filtro de área del Historial (M-01d): las áreas con algún equipo no dado de baja. */
export function listAreas(pool: pg.Pool, request: QueryRequest): Promise<MaintenanceAreaList> {
  return runQuery(pool, request, async (access) => ({
    items: (await listAreasQuery.run({ workspaceId: access.workspace.id }, access.client)).map(({ id, name }) => ({ id, name })),
  }));
}
