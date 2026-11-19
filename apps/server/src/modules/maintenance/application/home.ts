import type { AgendaContribution, HomeModule, TaskContribution } from '../../core/index.js';
import { agendaMaintenance, maintenancePerDay } from '../infrastructure/home.queries.js';
import { dueCounts } from '../infrastructure/work.queries.js';
import { maintenanceHomeSummary } from './indicators.js';

/** Actividad y Calendario (ADR 0026): todo el día, sin hora; el equipo es lo que se abre en Mantenimiento. */
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
    }));
  },
  async counts(access, from, to, today) {
    const rows = await maintenancePerDay.run({ workspaceId: access.workspace.id, from, to, today }, access.client);
    return rows.map((row) => ({ date: row.date, type: 'maintenance', count: row.count }));
  },
};

/** Por atender (ADR 0026): los vencidos o no conformes, las mismas cifras que «Por hacer». */
const maintenanceTasks: TaskContribution = async (access) => {
  const [counts] = await dueCounts.run({ workspaceId: access.workspace.id, timeZone: access.workspace.timeZone }, access.client);
  return [{ kind: 'overdue', count: counts?.overdue ?? 0, tone: 'danger' }];
};

export const maintenanceHome: HomeModule = { card: maintenanceHomeSummary, agenda: maintenanceAgenda, tasks: maintenanceTasks };
