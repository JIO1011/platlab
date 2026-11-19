import { activityStage, TASK_CASES, type ActivityStage, type AgendaStatus } from '@platlab/contracts';
import { addDays, todayIn } from '../../../platform/dates.js';
import {
  hasPermission,
  taskFrom,
  type AgendaContribution,
  type HomeContribution,
  type HomeModule,
  type TaskContribution,
  type WorkspaceAccess,
} from '../../core/index.js';
import {
  agendaAreas,
  agendaBlocks,
  blocksPerDay,
  blocksToClose,
  pendingRequestCounts,
  requestCases,
  requestsSentPerDay,
  type IRequestCasesResult,
} from '../infrastructure/home.queries.js';
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

/**
 * Actividad y Calendario (ADR 0026): los bloques del Cronograma, con el mismo ámbito que la tarjeta. Cada bloque va en
 * la fila de su área, y las áreas con horario se dibujan aunque estén libres.
 */
const labsAgenda: AgendaContribution = {
  async day(access, date, today) {
    const requesterId = await requesterScope(access);
    const rows = await agendaBlocks.run({ workspaceId: access.workspace.id, date, today, requesterId }, access.client);
    return rows.map((row) => ({
      type: 'practice',
      ref: row.id,
      title: row.title,
      detail: [row.code, row.group].filter(Boolean).join(' · '),
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      status: stageStatus[activityStage.parse(row.stage)],
      area: row.area_name ? { id: row.area_id, name: row.area_name } : null,
    }));
  },
  async areas(access) {
    return agendaAreas.run({ workspaceId: access.workspace.id }, access.client);
  },
  async counts(access, from, to, today) {
    const requesterId = await requesterScope(access);
    const rows = await blocksPerDay.run({ workspaceId: access.workspace.id, from, to, today, requesterId }, access.client);
    return rows.map((row) => ({ date: row.date, type: 'practice', count: row.count }));
  },
};

/** Un caso de solicitud: su título, el docente y si llegó fuera de plazo. */
const requestCase = (row: IRequestCasesResult) => ({
  ref: row.id,
  title: row.title,
  detail: [row.teacher_name, row.late ? 'Fuera de plazo' : null].filter(Boolean).join(' · ') || null,
  date: row.date,
});

/**
 * Por atender (ADR 0026): quien lleva los bloques, las prácticas de días pasados sin cerrar; quien revisa, las
 * solicitudes por programar; quien pide, las suyas con cambios pedidos. Cada fila con sus primeros casos.
 */
const labsTasks: TaskContribution = async (access) => {
  const workspaceId = access.workspace.id;
  const { timeZone } = access.workspace;
  const limit = TASK_CASES;
  const tasks: Awaited<ReturnType<TaskContribution>> = [];
  if (await hasPermission(access, SCHEDULE_LEAD)) {
    const rows = await blocksToClose.run({ workspaceId, today: todayIn(timeZone), limit }, access.client);
    tasks.push(
      taskFrom('toClose', 'danger', rows, (row) => ({
        ref: row.id,
        title: row.title,
        detail: [row.code, row.area_name].filter(Boolean).join(' · '),
        date: row.date,
      })),
    );
  }
  if (await hasPermission(access, REQUEST_REVIEW)) {
    const rows = await requestCases.run({ workspaceId, status: 'submitted', requesterId: null, timeZone, limit }, access.client);
    tasks.push(taskFrom('toReview', 'warning', rows, requestCase));
  }
  if (await hasPermission(access, REQUEST_CREATE)) {
    const rows = await requestCases.run({ workspaceId, status: 'changes_requested', requesterId: access.principalId, timeZone, limit }, access.client);
    tasks.push(taskFrom('changesRequested', 'warning', rows, requestCase));
  }
  return tasks;
};

export const labsHome: HomeModule = { card: labsHomeSummary, agenda: labsAgenda, tasks: labsTasks };
