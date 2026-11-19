import { TASK_CASES } from '@platlab/contracts';
import { dayIn } from '../../../platform/dates.js';
import type { HomeModule, TaskContribution } from '../../core/index.js';
import { equipmentSummary } from '../infrastructure/assets.queries.js';
import { listFaults } from '../infrastructure/faults.queries.js';
import { equipmentHomeSummary } from './queries.js';

/**
 * Por atender (ADR 0026): las fallas que nadie atiende, para quien las atiende (el manifiesto exige ese permiso), con
 * las más recientes como en Incidentes.
 */
const equipmentTasks: TaskContribution = async (access) => {
  const { id: workspaceId, timeZone } = access.workspace;
  const [row] = await equipmentSummary.run({ workspaceId, principalId: access.principalId }, access.client);
  const faults = await listFaults.run(
    { workspaceId, faultId: null, statuses: ['open'], assetId: null, reportedBy: null, afterAt: null, afterId: null, limit: TASK_CASES, timeZone },
    access.client,
  );
  return [
    {
      kind: 'unattendedFaults',
      count: Number(row?.unattended_faults ?? 0),
      tone: 'warning',
      cases: faults.map((fault) => ({
        ref: fault.id,
        title: fault.asset_name,
        detail: [fault.asset_code, fault.description].filter(Boolean).join(' · '),
        date: dayIn(fault.reported_at, timeZone),
      })),
    },
  ];
};

export const equipmentHome: HomeModule = { card: equipmentHomeSummary, tasks: equipmentTasks };
