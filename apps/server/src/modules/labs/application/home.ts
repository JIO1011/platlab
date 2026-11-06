import { addDays, todayIn } from '../../../platform/dates.js';
import type { HomeContribution, WorkspaceAccess } from '../../core/index.js';
import { pendingRequestCounts, requestsSentPerDay } from '../infrastructure/home.queries.js';
import { listActivities } from '../infrastructure/schedule.queries.js';
import { blockHolds } from './holds.js';

const TREND_DAYS = 30;
/** Los bloques con «Falta» que importan: los de hoy y los próximos días. */
const SHORT_DAYS = 7;

/**
 * La tarjeta del Inicio (ADR 0023, «Cierre de Laboratorios»): lo que espera programarse (lo pendiente del Administrador),
 * lo fuera de plazo entre ello y los bloques de los próximos 7 días con algo «Falta»; el gráfico, las solicitudes
 * enviadas por día.
 */
export async function labsHomeSummary(access: WorkspaceAccess): Promise<HomeContribution> {
  const workspaceId = access.workspace.id;
  const today = todayIn(access.workspace.timeZone);
  const [[counts], blocks, points] = await Promise.all([
    pendingRequestCounts.run({ workspaceId }, access.client),
    listActivities.run({ workspaceId, activityId: null, from: today, to: addDays(today, SHORT_DAYS - 1) }, access.client),
    requestsSentPerDay.run({ workspaceId, today, days: TREND_DAYS, timeZone: access.workspace.timeZone }, access.client),
  ]);
  const holds = await blockHolds(access, blocks.map((block) => ({ activityId: block.id, requestId: block.request_id, closed: block.stage === 'closed' })));
  const short = blocks.filter((block) => !(holds.get(block.id) ?? []).every((hold) => hold.complete)).length;
  return {
    summary: { pendingRequests: counts?.pending ?? 0, late: counts?.late ?? 0, short },
    activity: [],
    // Sin solicitudes en el periodo no hay gráfico: un gráfico vacío no informa (ADR 0011).
    trend: points.some((point) => point.value > 0) ? { label: `Solicitudes enviadas por día, últimos ${TREND_DAYS} días`, points } : null,
  };
}
