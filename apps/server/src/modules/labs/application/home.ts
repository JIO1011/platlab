import { addDays, todayIn } from '../../../platform/dates.js';
import { hasPermission, type HomeContribution, type WorkspaceAccess } from '../../core/index.js';
import { pendingRequestCounts, requestsSentPerDay } from '../infrastructure/home.queries.js';
import { listActivities } from '../infrastructure/schedule.queries.js';
import { REQUEST_VIEW } from './command.js';
import { blockHolds } from './holds.js';

const TREND_DAYS = 30;
/** Los bloques con «Falta» que importan: los de hoy y los próximos días. */
const SHORT_DAYS = 7;

/**
 * La tarjeta del Inicio (ADR 0023, «Cierre de Laboratorios» e «Inicio de quien pide»). Quien consulta las recibidas ve
 * el laboratorio entero: lo que espera programarse, lo fuera de plazo y los bloques de los próximos 7 días con algo
 * «Falta». Quien pide ve lo suyo: lo que espera programarse y lo que necesita su atención. El gráfico, las solicitudes
 * enviadas por día (las suyas, para quien pide).
 */
export async function labsHomeSummary(access: WorkspaceAccess): Promise<HomeContribution> {
  const workspaceId = access.workspace.id;
  const today = todayIn(access.workspace.timeZone);
  const whole = await hasPermission(access, REQUEST_VIEW);
  const requesterId = whole ? null : access.principalId;
  const [[counts], points] = await Promise.all([
    pendingRequestCounts.run({ workspaceId, requesterId }, access.client),
    requestsSentPerDay.run({ workspaceId, today, days: TREND_DAYS, timeZone: access.workspace.timeZone, requesterId }, access.client),
  ]);
  // Sin solicitudes en el periodo no hay gráfico: un gráfico vacío no informa (ADR 0011).
  const trend = points.some((point) => point.value > 0) ? { label: `Solicitudes enviadas por día, últimos ${TREND_DAYS} días`, points } : null;
  if (!whole) return { summary: { pendingRequests: counts?.pending ?? 0, attention: counts?.attention ?? 0 }, activity: [], trend };
  const blocks = await listActivities.run({ workspaceId, activityId: null, from: today, to: addDays(today, SHORT_DAYS - 1) }, access.client);
  const holds = await blockHolds(access, blocks.map((block) => ({ activityId: block.id, requestId: block.request_id, closed: block.stage === 'closed' })));
  const short = blocks.filter((block) => !(holds.get(block.id) ?? []).every((hold) => hold.complete)).length;
  return { summary: { pendingRequests: counts?.pending ?? 0, late: counts?.late ?? 0, short }, activity: [], trend };
}
