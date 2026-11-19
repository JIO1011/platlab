import { activityStage, type ActivityStage, type AgendaStatus } from '@platlab/contracts';
import { addDays, todayIn } from '../../../platform/dates.js';
import {
  hasPermission,
  type AgendaContribution,
  type HomeContribution,
  type HomeModule,
  type TaskContribution,
  type WorkspaceAccess,
} from '../../core/index.js';
import { agendaBlocks, blocksPerDay, blocksToClose, pendingRequestCounts, requestsSentPerDay } from '../infrastructure/home.queries.js';
import { listActivities } from '../infrastructure/schedule.queries.js';
import { REQUEST_CREATE, REQUEST_REVIEW, REQUEST_VIEW, SCHEDULE_LEAD } from './command.js';
import { blockHolds } from './holds.js';

const TREND_DAYS = 30;
/** Los bloques con «Falta» que importan: los de hoy y los próximos días. */
const SHORT_DAYS = 7;

/** Quien consulta las recibidas ve el laboratorio entero; quien pide, lo suyo (ADR 0023, «Inicio de quien pide»). */
const requesterScope = async (access: WorkspaceAccess) => ((await hasPermission(access, REQUEST_VIEW)) ? null : access.principalId);

/**
 * La tarjeta del Inicio (ADR 0023, «Cierre de Laboratorios» e «Inicio de quien pide»). Quien consulta las recibidas ve
 * el laboratorio entero: lo que espera programarse, lo fuera de plazo y los bloques de los próximos 7 días con algo
 * «Falta». Quien pide ve lo suyo: lo que espera programarse y lo que necesita su atención. El gráfico, las solicitudes
 * enviadas por día (las suyas, para quien pide).
 */
async function labsHomeSummary(access: WorkspaceAccess): Promise<HomeContribution> {
  const workspaceId = access.workspace.id;
  const today = todayIn(access.workspace.timeZone);
  const requesterId = await requesterScope(access);
  const [[counts], points] = await Promise.all([
    pendingRequestCounts.run({ workspaceId, requesterId }, access.client),
    requestsSentPerDay.run({ workspaceId, today, days: TREND_DAYS, timeZone: access.workspace.timeZone, requesterId }, access.client),
  ]);
  // Sin solicitudes en el periodo no hay gráfico: un gráfico vacío no informa (ADR 0011).
  const trend = points.some((point) => point.value > 0) ? { label: `Solicitudes enviadas por día, últimos ${TREND_DAYS} días`, points } : null;
  if (requesterId) return { summary: { pendingRequests: counts?.pending ?? 0, attention: counts?.attention ?? 0 }, activity: [], trend };
  const blocks = await listActivities.run({ workspaceId, activityId: null, from: today, to: addDays(today, SHORT_DAYS - 1) }, access.client);
  const holds = await blockHolds(access, blocks.map((block) => ({ activityId: block.id, requestId: block.request_id, closed: block.stage === 'closed' })));
  const short = blocks.filter((block) => !(holds.get(block.id) ?? []).every((hold) => hold.complete)).length;
  return { summary: { pendingRequests: counts?.pending ?? 0, late: counts?.late ?? 0, short }, activity: [], trend };
}

/** El estado de una práctica en Actividad es el de su bloque (ADR 0026, «Diseño de IN-01»). */
const stageStatus: Record<ActivityStage, AgendaStatus> = { scheduled: 'upcoming', ready: 'upcoming', running: 'in_progress', closed: 'done' };

/** Actividad y Calendario (ADR 0026): los bloques del Cronograma, con el mismo ámbito que la tarjeta. */
const labsAgenda: AgendaContribution = {
  async day(access, date, today) {
    const requesterId = await requesterScope(access);
    const rows = await agendaBlocks.run({ workspaceId: access.workspace.id, date, today, requesterId }, access.client);
    return rows.map((row) => ({
      type: 'practice',
      ref: row.id,
      title: row.title,
      detail: [row.code, row.area_name, row.group].filter(Boolean).join(' · '),
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      status: stageStatus[activityStage.parse(row.stage)],
    }));
  },
  async counts(access, from, to, today) {
    const requesterId = await requesterScope(access);
    const rows = await blocksPerDay.run({ workspaceId: access.workspace.id, from, to, today, requesterId }, access.client);
    return rows.map((row) => ({ date: row.date, type: 'practice', count: row.count }));
  },
};

/**
 * Por atender (ADR 0026): quien lleva los bloques, las prácticas de días pasados sin cerrar; quien revisa, las
 * solicitudes por programar; quien pide, las suyas con cambios pedidos.
 */
const labsTasks: TaskContribution = async (access) => {
  const workspaceId = access.workspace.id;
  const tasks: Awaited<ReturnType<TaskContribution>> = [];
  if (await hasPermission(access, SCHEDULE_LEAD)) {
    const [row] = await blocksToClose.run({ workspaceId, today: todayIn(access.workspace.timeZone) }, access.client);
    tasks.push({ kind: 'toClose', count: row?.count ?? 0, tone: 'danger' });
  }
  if (await hasPermission(access, REQUEST_REVIEW)) {
    const [row] = await pendingRequestCounts.run({ workspaceId, requesterId: null }, access.client);
    tasks.push({ kind: 'toReview', count: row?.pending ?? 0, tone: 'warning' });
  }
  if (await hasPermission(access, REQUEST_CREATE)) {
    const [row] = await pendingRequestCounts.run({ workspaceId, requesterId: access.principalId }, access.client);
    tasks.push({ kind: 'changesRequested', count: row?.attention ?? 0, tone: 'warning' });
  }
  return tasks;
};

export const labsHome: HomeModule = { card: labsHomeSummary, agenda: labsAgenda, tasks: labsTasks };
