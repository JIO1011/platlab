import type pg from 'pg';
import type { z } from 'zod';
import type { createExclusionRequest, createPlanRequest, Plan, PlanAssetList, PlanKind, PlanList, updatePlanRequest } from '@platlab/contracts';
import { AppError } from '../../../platform/errors.js';
import { recordAudit, requireEditable, requires, type CommandRequest, type QueryRequest, type WorkspaceAccess } from '../../core/index.js';
import {
  activeAssetType,
  archiveExclusion as archiveExclusionQuery,
  archivePlan as archivePlanQuery,
  archiveReplacedExclusions,
  directoryAsset,
  insertExclusion,
  insertPlan,
  listPlans as listPlansQuery,
  lockPlan,
  planAssets,
  uncoveredAssets,
  updatePlan as updatePlanQuery,
  type IDirectoryAssetResult,
  type IListPlansResult,
} from '../infrastructure/plans.queries.js';
import { PLAN_MANAGE, runCommand, runQuery } from './command.js';

/**
 * Planes (ADR 0020): por tipo de equipo, que cubre todas sus unidades y las nuevas, o por equipo. El plan
 * propio de un equipo, si lo reemplaza, lo excluye del de su tipo en el mismo paso, y archivarlo lo devuelve
 * a él. Los administra el Administrador.
 */

/** Motivo de la exclusión que crea un plan propio. */
const OWN_PLAN = 'Plan propio';

const toPlan = (row: IListPlansResult): Plan => ({
  id: row.id,
  kind: row.kind as Plan['kind'],
  title: row.title,
  assetType: row.asset_type_id && row.type_name ? { id: row.asset_type_id, name: row.type_name } : null,
  asset: row.asset_id && row.asset_code && row.asset_name ? { id: row.asset_id, code: row.asset_code, name: row.asset_name } : null,
  intervalCount: row.interval_count,
  intervalUnit: row.interval_unit as Plan['intervalUnit'],
  startsOn: row.starts_on,
  checklist: row.checklist,
  acceptanceCriteria: row.acceptance_criteria,
  requirement: row.requirement,
  assetCount: row.asset_count,
  nextDueOn: row.next_due_on,
  overdueCount: row.overdue_count,
  exclusions: row.exclusions as Plan['exclusions'],
  archivedAt: row.archived_at?.toISOString() ?? null,
  version: row.version,
});

/** Un plan, también recién archivado: la respuesta de cada comando. */
async function planById(access: WorkspaceAccess, planId: string): Promise<Plan> {
  const [row] = await listPlansQuery.run({ workspaceId: access.workspace.id, timeZone: access.workspace.timeZone, planId }, access.client);
  if (!row) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
  return toPlan(row);
}

/** Un equipo del espacio que no esté dado de baja, por la vista de Equipos. */
async function activeAsset(access: WorkspaceAccess, assetId: string): Promise<IDirectoryAssetResult> {
  const [asset] = await directoryAsset.run({ workspaceId: access.workspace.id, assetId }, access.client);
  if (!asset) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
  if (asset.condition === 'retired') throw new AppError('VALIDATION_FAILED', 'Un equipo dado de baja no entra en un plan');
  return asset;
}

/** El plan de un tipo de equipo, activo y bloqueado: el único que admite exclusiones. */
async function lockTypePlan(access: WorkspaceAccess, planId: string): Promise<{ assetTypeId: string }> {
  const [plan] = await lockPlan.run({ workspaceId: access.workspace.id, planId }, access.client);
  requireEditable(plan);
  if (!plan.asset_type_id) throw new AppError('VALIDATION_FAILED', 'Solo el plan de un tipo de equipo tiene exclusiones');
  return { assetTypeId: plan.asset_type_id };
}

/** Excluye al equipo del plan de su tipo, con el plan propio que lo reemplaza si lo hay; si ya lo estaba, lo dice. */
async function exclude(
  access: WorkspaceAccess,
  exclusion: { planId: string; assetTypeId: string; assetId: string; reason: string; replacedBy: string | null },
): Promise<void> {
  const [excluded] = await insertExclusion.run(
    { workspaceId: access.workspace.id, ...exclusion, createdBy: access.principalId },
    access.client,
  );
  if (!excluded) throw new AppError('VALIDATION_FAILED', 'El equipo ya está excluido de ese plan');
}

/** Los activos y la cobertura: los equipos no dados de baja que ningún plan cubre. */
export function listPlans(pool: pg.Pool, request: QueryRequest): Promise<PlanList> {
  return runQuery(pool, request, async (access) => {
    const workspaceId = access.workspace.id;
    const rows = await listPlansQuery.run({ workspaceId, timeZone: access.workspace.timeZone, planId: null }, access.client);
    const uncovered = await uncoveredAssets.run({ workspaceId }, access.client);
    return {
      items: rows.map(toPlan),
      uncovered: { total: uncovered[0]?.total ?? 0, items: uncovered.map(({ id, code, name }) => ({ id, code, name })) },
    };
  });
}

/** GET /plans/:planId/assets: los equipos del plan con «Incluido», su fecha o su motivo (ADR 0020). */
export function listPlanAssets(pool: pg.Pool, request: QueryRequest, planId: string): Promise<PlanAssetList> {
  return runQuery(pool, request, async (access) => {
    await planById(access, planId);
    const rows = await planAssets.run({ workspaceId: access.workspace.id, planId }, access.client);
    return {
      items: rows.map((row) => ({
        asset: { id: row.id, code: row.code, name: row.name, area: row.area_name },
        dueOn: row.due_on,
        lastResult: row.last_result as PlanAssetList['items'][number]['lastResult'],
        exclusion:
          row.reason === null
            ? null
            : {
                reason: row.reason,
                replacedBy: row.replaced_by_id
                  ? { id: row.replaced_by_id, title: row.replaced_by_title!, kind: row.replaced_by_kind as PlanKind }
                  : null,
              },
      })),
    };
  });
}

/** Un plan de un tipo activo o de un equipo; con `replacesPlanId`, el equipo sale del plan de su tipo. */
export function createPlan(pool: pg.Pool, request: CommandRequest, input: z.infer<typeof createPlanRequest>): Promise<Plan> {
  return runCommand(pool, request, 'maintenance.plan.create', input, requires(PLAN_MANAGE), async (access) => {
    const workspaceId = access.workspace.id;
    if (input.assetTypeId) {
      const [type] = await activeAssetType.run({ workspaceId, typeId: input.assetTypeId }, access.client);
      if (!type) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
      if (type.archived_at) throw new AppError('VALIDATION_FAILED', 'El tipo de equipo está archivado');
    }
    const asset = input.assetId ? await activeAsset(access, input.assetId) : null;
    const replaced = input.replacesPlanId ? await lockTypePlan(access, input.replacesPlanId) : null;
    if (replaced && replaced.assetTypeId !== asset?.type_id) {
      throw new AppError('VALIDATION_FAILED', 'El plan reemplazado debe ser del tipo del equipo');
    }
    const [created] = await insertPlan.run(
      {
        workspaceId,
        kind: input.kind,
        title: input.title,
        assetTypeId: input.assetTypeId ?? null,
        assetId: input.assetId ?? null,
        intervalCount: input.intervalCount,
        intervalUnit: input.intervalUnit,
        startsOn: input.startsOn,
        checklist: input.checklist,
        acceptanceCriteria: input.acceptanceCriteria,
        requirement: input.requirement,
        createdBy: access.principalId,
      },
      access.client,
    );
    if (replaced && asset) {
      await exclude(access, {
        planId: input.replacesPlanId!,
        assetTypeId: replaced.assetTypeId,
        assetId: asset.id,
        reason: OWN_PLAN,
        replacedBy: created!.id,
      });
    }
    await recordAudit(access, { action: 'maintenance.plan.create', entityType: 'maintenance.plan', entityId: created!.id, changes: input });
    return planById(access, created!.id);
  });
}

/** Cambia solo lo que llega, con la versión que la persona vio; el tipo de trabajo y el alcance no cambian. */
export function updatePlan(
  pool: pg.Pool,
  request: CommandRequest,
  planId: string,
  { expectedVersion, ...changes }: z.infer<typeof updatePlanRequest>,
): Promise<Plan> {
  return runCommand(pool, request, 'maintenance.plan.update', { planId, expectedVersion, ...changes }, requires(PLAN_MANAGE), async (access) => {
    const [current] = await lockPlan.run({ workspaceId: access.workspace.id, planId }, access.client);
    requireEditable(current, expectedVersion);
    await updatePlanQuery.run(
      {
        workspaceId: access.workspace.id,
        planId,
        title: changes.title ?? current.title,
        intervalCount: changes.intervalCount ?? current.interval_count,
        intervalUnit: changes.intervalUnit ?? current.interval_unit,
        startsOn: changes.startsOn ?? current.starts_on,
        checklist: changes.checklist ?? current.checklist,
        acceptanceCriteria: changes.acceptanceCriteria === undefined ? current.acceptance_criteria : changes.acceptanceCriteria,
        requirement: changes.requirement === undefined ? current.requirement : changes.requirement,
      },
      access.client,
    );
    await recordAudit(access, { action: 'maintenance.plan.update', entityType: 'maintenance.plan', entityId: planId, changes });
    return planById(access, planId);
  });
}

/**
 * Deja de cubrir equipos; los registros hechos con él lo conservan. Un plan propio que reemplazaba al de su
 * tipo archiva esa exclusión en el mismo paso: el equipo vuelve al plan del tipo.
 */
export function archivePlan(pool: pg.Pool, request: CommandRequest, planId: string): Promise<Plan> {
  return runCommand(pool, request, 'maintenance.plan.archive', { planId }, requires(PLAN_MANAGE), async (access) => {
    const [current] = await lockPlan.run({ workspaceId: access.workspace.id, planId }, access.client);
    requireEditable(current);
    await archivePlanQuery.run({ workspaceId: access.workspace.id, planId }, access.client);
    await recordAudit(access, { action: 'maintenance.plan.archive', entityType: 'maintenance.plan', entityId: planId, changes: { archived: true } });
    const restored = await archiveReplacedExclusions.run({ workspaceId: access.workspace.id, planId }, access.client);
    for (const exclusion of restored) {
      await recordAudit(access, {
        action: 'maintenance.plan.include',
        entityType: 'maintenance.plan',
        entityId: exclusion.plan_id,
        changes: { assetId: exclusion.asset_id, replacedByPlanId: planId },
      });
    }
    return planById(access, planId);
  });
}

/** Excluye del plan de su tipo a un equipo de ese tipo, con motivo. */
export function addExclusion(
  pool: pg.Pool,
  request: CommandRequest,
  planId: string,
  input: z.infer<typeof createExclusionRequest>,
): Promise<Plan> {
  return runCommand(pool, request, 'maintenance.plan.exclude', { planId, ...input }, requires(PLAN_MANAGE), async (access) => {
    const { assetTypeId } = await lockTypePlan(access, planId);
    const asset = await activeAsset(access, input.assetId);
    if (asset.type_id !== assetTypeId) throw new AppError('VALIDATION_FAILED', 'El equipo no es del tipo del plan');
    await exclude(access, { planId, assetTypeId, assetId: asset.id, reason: input.reason, replacedBy: null });
    await recordAudit(access, { action: 'maintenance.plan.exclude', entityType: 'maintenance.plan', entityId: planId, changes: input });
    return planById(access, planId);
  });
}

/** Archiva la exclusión vigente: el equipo vuelve a quedar cubierto por el plan de su tipo. */
export function archiveExclusion(pool: pg.Pool, request: CommandRequest, planId: string, assetId: string): Promise<Plan> {
  return runCommand(pool, request, 'maintenance.plan.include', { planId, assetId }, requires(PLAN_MANAGE), async (access) => {
    await lockTypePlan(access, planId);
    const [archived] = await archiveExclusionQuery.run({ workspaceId: access.workspace.id, planId, assetId }, access.client);
    if (!archived) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
    await recordAudit(access, { action: 'maintenance.plan.include', entityType: 'maintenance.plan', entityId: planId, changes: { assetId } });
    return planById(access, planId);
  });
}
