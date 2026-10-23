import type pg from 'pg';
import type { z } from 'zod';
import { LEAD_DAYS_DEFAULT, type LabsSettings, type updateLabsSettingsRequest } from '@platlab/contracts';
import { recordAudit, requires, type CommandRequest, type QueryRequest } from '../../core/index.js';
import { getSettings as getSettingsQuery, saveSettings } from '../infrastructure/settings.queries.js';
import { runCommand, runQuery, SPACE_MANAGE } from './command.js';

/** Anticipación con que se solicita un espacio (ADR 0023): la fija el Administrador para todo el espacio de trabajo. */

export function getSettings(pool: pg.Pool, request: QueryRequest): Promise<LabsSettings> {
  return runQuery(pool, request, async (access) => {
    const [row] = await getSettingsQuery.run({ workspaceId: access.workspace.id }, access.client);
    return row ? { leadDays: row.lead_days, version: row.version } : { leadDays: LEAD_DAYS_DEFAULT, version: 0 };
  });
}

export function updateSettings(
  pool: pg.Pool,
  request: CommandRequest,
  input: z.infer<typeof updateLabsSettingsRequest>,
): Promise<LabsSettings> {
  return runCommand(pool, request, 'labs.settings.update', input, requires(SPACE_MANAGE), async (access) => {
    const [row] = await saveSettings.run({ workspaceId: access.workspace.id, leadDays: input.leadDays }, access.client);
    await recordAudit(access, { action: 'labs.settings.update', entityType: 'labs.settings', entityId: access.workspace.id, changes: input });
    return { leadDays: row!.lead_days, version: row!.version };
  });
}
