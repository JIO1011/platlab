import { TASK_CASES } from '@platlab/contracts';
import { hasPermission, type AgendaContribution, type HomeModule, type TaskContribution } from '../../core/index.js';
import { dashboardBelowMinimum, dashboardExpiring, dashboardOverdue } from '../infrastructure/dashboard.queries.js';
import { agendaReturns, returnsPerDay } from '../infrastructure/home.queries.js';
import { RETURN } from './command.js';
import { loanCode } from './loan-views.js';
import { expiringBy, materialsHomeSummary, summaryOf } from './queries.js';

/** Actividad y Calendario (ADR 0026): las devoluciones previstas, todo el día; el préstamo es lo que se abre. */
const materialsAgenda: AgendaContribution = {
  async day(access, date, today) {
    const rows = await agendaReturns.run({ workspaceId: access.workspace.id, date, today }, access.client);
    return rows.map((row) => ({
      type: 'return',
      ref: row.id,
      title: row.borrower_name,
      detail: loanCode(row.number),
      startsAt: null,
      endsAt: null,
      status: row.status === 'closed' ? 'done' : 'upcoming',
      area: null,
    }));
  },
  async counts(access, from, to, today) {
    const rows = await returnsPerDay.run({ workspaceId: access.workspace.id, from, to, today }, access.client);
    return rows.map((row) => ({ date: row.date, type: 'return', count: row.count }));
  },
};

/**
 * Por atender (ADR 0026): los préstamos atrasados, para quien recibe devoluciones; los insumos y materiales bajo su
 * mínimo y los que tienen un lote vencido o por vencer, con las cifras del Resumen. Los casos son las listas de su
 * «Hay que atender», con más filas.
 */
const materialsTasks: TaskContribution = async (access) => {
  const { id: workspaceId, timeZone } = access.workspace;
  const limit = TASK_CASES;
  const summary = await summaryOf(access);
  const receives = await hasPermission(access, RETURN);
  const overdue = receives ? await dashboardOverdue.run({ workspaceId, timeZone, limit }, access.client) : [];
  const expiring = await dashboardExpiring.run({ workspaceId, expiringBy: expiringBy(access), limit }, access.client);
  const below = await dashboardBelowMinimum.run({ workspaceId, limit }, access.client);
  return [
    ...(receives
      ? [
          {
            kind: 'overdueLoans',
            count: summary.overdueLoans,
            tone: 'danger' as const,
            cases: overdue.map((row) => ({ ref: row.id, title: row.borrower_name, detail: loanCode(row.number), date: row.due_on })),
          },
        ]
      : []),
    {
      kind: 'expiring',
      count: summary.expiring,
      tone: 'warning',
      cases: expiring.map((row) => ({ ref: row.id, title: row.name, detail: row.lot ? `Lote ${row.lot}` : null, date: row.expires_on })),
    },
    {
      kind: 'belowMinimum',
      count: summary.belowMinimum,
      tone: 'warning',
      cases: below.map((row) => ({ ref: row.id, title: row.name, detail: null, date: null })),
    },
  ];
};

export const materialsHome: HomeModule = { card: materialsHomeSummary, agenda: materialsAgenda, tasks: materialsTasks };
