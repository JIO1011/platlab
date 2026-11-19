import { TASK_CASES } from '@platlab/contracts';
import { todayIn } from '../../../platform/dates.js';
import type { AgendaContribution, HomeModule, TaskContribution } from '../../core/index.js';
import { agendaMaintenance, maintenancePerDay } from '../infrastructure/home.queries.js';
import { dueCounts, listDue } from '../infrastructure/work.queries.js';
import { maintenanceHomeSummary } from './indicators.js';

/**
 * Actividad y Calendario (ADR 0026): todo el día, sin hora, en la fila del área del equipo; el equipo es lo que se abre
 * en Mantenimiento.
 */
const maintenanceAgenda: AgendaContribution = {
  async day(access, date, today) {
    const rows = await agendaMaintenance.run({ workspaceId: access.workspace.id, date, today }, access.client);
    return rows.map((row) => ({
      type: 'maintenance',
      ref: row.asset_id,
      title: row.asset_name,
      detail: [row.asset_code, row.plan_title].filter(Boolean).join(' · '),
      startsAt: null,
      endsAt: null,
      status: row.done ? 'done' : 'upcoming',
      area: row.area_id && row.area_name ? { id: row.area_id, name: row.area_name } : null,
    }));
  },
  async counts(access, from, to, today) {
    const rows = await maintenancePerDay.run({ workspaceId: access.workspace.id, from, to, today }, access.client);
    return rows.map((row) => ({ date: row.date, type: 'maintenance', count: row.count }));
  },
};

/**
 * Por atender (ADR 0026): los vencidos o no conformes, las mismas cifras que «Por hacer». Los casos salen de su lista,
 * que pone primero los no conformes y después por fecha: los vencidos van delante de lo que aún no vence.
 */
const maintenanceTasks: TaskContribution = async (access) => {
  const { id: workspaceId, timeZone } = access.workspace;
  const [counts] = await dueCounts.run({ workspaceId, timeZone }, access.client);
  const today = todayIn(timeZone);
  const due = await listDue.run({ workspaceId, timeZone, limit: TASK_CASES }, access.client);
  const cases = due
    .filter((row) => row.last_result === 'fail' || row.due_on < today)
    .map((row) => {
      const failed = row.last_result === 'fail';
      return {
        ref: row.asset_id,
        title: row.asset_name,
        detail: [row.asset_code, failed ? 'No conforme' : row.plan_title].filter(Boolean).join(' · '),
        date: failed ? null : row.due_on,
      };
    });
  return [{ kind: 'overdue', count: counts?.overdue ?? 0, tone: 'danger', cases }];
};

export const maintenanceHome: HomeModule = { card: maintenanceHomeSummary, agenda: maintenanceAgenda, tasks: maintenanceTasks };
