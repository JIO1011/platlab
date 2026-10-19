import type pg from 'pg';
import type { z } from 'zod';
import type {
  dismissReplacementRequest,
  MaintenanceIndicators,
  ReplacementCandidate,
  ReplacementDismissed,
} from '@platlab/contracts';
import { AppError } from '../../../platform/errors.js';
import {
  hasPermission,
  recordAudit,
  requires,
  type CommandRequest,
  type HomeContribution,
  type QueryRequest,
  type WorkspaceAccess,
} from '../../core/index.js';
import { frequentFaultAssets } from '../../equipment/index.js';
import {
  calibrationState,
  compliance as complianceQuery,
  insertReplacementReview,
  monthlyWork,
  recordsPerDay,
  replacementCandidates,
  workCosts,
} from '../infrastructure/indicators.queries.js';
import { directoryAsset } from '../infrastructure/plans.queries.js';
import { dueCounts, workspaceToday } from '../infrastructure/work.queries.js';
import { REVIEW, runCommand, runQuery } from './command.js';

/** «Evaluar reemplazo» (02 §12): la parte del valor de reposición que alcanza lo reparado y los incidentes del periodo. */
const REPAIR_SHARE = '0.5';
const FREQUENT_FAULTS = 3;
/** Meses que un descarte oculta el aviso. */
const REVIEW_MONTHS = 6;
/** Tope de la lista de «Evaluar reemplazo». */
const REPLACEMENT_LIMIT = 100;
/** Días del gráfico de la tarjeta del Inicio. */
const TREND_DAYS = 30;

/** El periodo de Indicadores (M-01c): desde el primer día del mes de hace 11 meses; `today` es ISO (AAAA-MM-DD). */
export function periodStart(today: string): string {
  const [year, month] = today.split('-').map(Number) as [number, number];
  const first = year * 12 + month - 1 - 11;
  return `${Math.floor(first / 12)}-${String((first % 12) + 1).padStart(2, '0')}-01`;
}

async function workspaceDay(access: WorkspaceAccess): Promise<{ today: string; from: string }> {
  const [{ today }] = (await workspaceToday.run({ timeZone: access.workspace.timeZone }, access.client)) as [{ today: string }];
  return { today, from: periodStart(today) };
}

/** Los equipos para «Evaluar reemplazo» del periodo, sin los descartados vigentes. */
async function replacementOf(access: WorkspaceAccess, period: { today: string; from: string }): Promise<ReplacementCandidate[]> {
  const faulty = await frequentFaultAssets(access, period.from, FREQUENT_FAULTS);
  const faults = new Map(faulty.map((entry) => [entry.assetId, entry.faults]));
  const rows = await replacementCandidates.run(
    {
      workspaceId: access.workspace.id,
      ...period,
      repairShare: REPAIR_SHARE,
      faultyAssetIds: [...faults.keys()],
      limit: REPLACEMENT_LIMIT,
    },
    access.client,
  );
  return rows.map((row) => ({
    asset: { id: row.id, code: row.code, name: row.name, area: row.area_name },
    usefulLifeEndedOn: row.life_ended_on,
    repairs: row.repair_cost && row.replacement_value ? { cost: row.repair_cost, replacementValue: row.replacement_value } : null,
    faults: faults.get(row.id) ?? null,
  }));
}

/**
 * Cuántos equipos piden «Evaluar reemplazo», para el aviso de Por hacer: solo para quien lo descarta (el
 * Administrador); null para los demás.
 */
export async function replacementCount(access: WorkspaceAccess): Promise<number | null> {
  if (!(await hasPermission(access, REVIEW))) return null;
  return (await replacementOf(access, await workspaceDay(access))).length;
}

/** Indicadores (ADR 0020, M-01c): pocas cifras del periodo, cada una con su lista. */
export function getIndicators(pool: pg.Pool, request: QueryRequest): Promise<MaintenanceIndicators> {
  return runQuery(pool, request, async (access) => {
    const period = await workspaceDay(access);
    const filter = { workspaceId: access.workspace.id, ...period };
    const groups = await complianceQuery.run(filter, access.client);
    const tally = (row: { on_time: number; late: number; pending: number } | undefined) => ({
      onTime: row?.on_time ?? 0,
      late: row?.late ?? 0,
      pending: row?.pending ?? 0,
    });
    const [counts] = await dueCounts.run({ workspaceId: access.workspace.id, timeZone: access.workspace.timeZone }, access.client);
    const [calibrations] = await calibrationState.run(filter, access.client);
    const [costs] = await workCosts.run(filter, access.client);
    const months = await monthlyWork.run(filter, access.client);
    return {
      period: { from: period.from, to: period.today },
      compliance: tally(groups.find((row) => row.total)),
      overdue: counts?.overdue ?? 0,
      calibrations: { current: calibrations?.current ?? 0, total: calibrations?.total ?? 0 },
      costs: { preventive: costs?.preventive ?? '0', corrective: costs?.corrective ?? '0', withoutCost: costs?.without_cost ?? 0 },
      months: months.map((row) => ({ month: row.month, due: row.due, done: row.done, onTime: row.on_time })),
      requirements: groups.flatMap((row) => (!row.total && row.requirement ? [{ requirement: row.requirement, ...tally(row) }] : [])),
      replacement: await replacementOf(access, period),
    };
  });
}

/**
 * «Descartar» de «Evaluar reemplazo» (M-01c): el Administrador oculta el aviso del equipo por 6 meses, con
 * motivo. Dar de baja se hace en Equipos.
 */
export function dismissReplacement(
  pool: pg.Pool,
  request: CommandRequest,
  assetId: string,
  input: z.infer<typeof dismissReplacementRequest>,
): Promise<ReplacementDismissed> {
  return runCommand(pool, request, 'maintenance.replacement.review', { assetId, ...input }, requires(REVIEW), async (access) => {
    const workspaceId = access.workspace.id;
    const [asset] = await directoryAsset.run({ workspaceId, assetId }, access.client);
    if (!asset) throw new AppError('NOT_FOUND', 'Recurso no encontrado');
    if (asset.condition === 'retired') throw new AppError('VALIDATION_FAILED', 'El equipo está dado de baja');
    const { today } = await workspaceDay(access);
    const [review] = (await insertReplacementReview.run(
      { workspaceId, assetId, reason: input.reason, today, months: REVIEW_MONTHS, createdBy: access.principalId },
      access.client,
    )) as [{ dismissed_until: string }];
    await recordAudit(access, {
      action: 'maintenance.replacement.review',
      entityType: 'equipment.asset',
      entityId: assetId,
      changes: { ...input, dismissedUntil: review.dismissed_until },
    });
    return { assetId, dismissedUntil: review.dismissed_until };
  });
}

/**
 * La tarjeta de Mantenimiento en el Inicio (M-01c): los atrasados (vencidos o no conformes) en la píldora, los
 * próximos 30 días, los equipos sin plan y los registros por día de los últimos 30 días.
 */
export async function maintenanceHomeSummary(access: WorkspaceAccess): Promise<HomeContribution> {
  const [counts] = await dueCounts.run({ workspaceId: access.workspace.id, timeZone: access.workspace.timeZone }, access.client);
  const { today } = await workspaceDay(access);
  const points = await recordsPerDay.run({ workspaceId: access.workspace.id, today, days: TREND_DAYS }, access.client);
  return {
    summary: { pendingRequests: counts?.overdue ?? 0, next30: counts?.next30 ?? 0, uncovered: counts?.uncovered ?? 0 },
    activity: [],
    // Sin registros en el periodo no hay gráfico: un gráfico vacío no informa (ADR 0011).
    trend: points.some((point) => point.value > 0) ? { label: `Registros por día, últimos ${TREND_DAYS} días`, points } : null,
  };
}
