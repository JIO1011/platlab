import { EXPIRING_DAYS, TASK_CASES } from '@platlab/contracts';
import { taskFrom, type HomeModule, type TaskContribution } from '../../core/index.js';
import { belowMinimumCases, containerCases, type IContainerCasesResult } from '../infrastructure/home.queries.js';
import { reagentsHomeSummary } from './queries.js';

/** Un frasco: el reactivo, su código y cuándo vence. */
const containerCase = (row: IContainerCasesResult) => ({
  ref: row.product_id,
  title: row.product_name,
  detail: row.container_code,
  date: row.expires_on,
});

/**
 * Por atender (ADR 0026): frascos vencidos y por vencer, y reactivos bajo su mínimo, con las mismas reglas que las
 * cifras del Resumen. Cada caso abre la ficha del reactivo.
 */
const reagentsTasks: TaskContribution = async (access) => {
  const { id: workspaceId, timeZone } = access.workspace;
  const params = { workspaceId, timeZone, expiringDays: EXPIRING_DAYS, limit: TASK_CASES };
  const expired = await containerCases.run({ ...params, expired: true }, access.client);
  const expiring = await containerCases.run({ ...params, expired: false }, access.client);
  const below = await belowMinimumCases.run({ workspaceId, limit: TASK_CASES }, access.client);
  return [
    taskFrom('expiredContainers', 'danger', expired, containerCase),
    taskFrom('expiringContainers', 'warning', expiring, containerCase),
    taskFrom('belowMinimum', 'warning', below, (row) => ({ ref: row.id, title: row.name, detail: null, date: null })),
  ];
};

export const reagentsHome: HomeModule = { card: reagentsHomeSummary, tasks: reagentsTasks };
