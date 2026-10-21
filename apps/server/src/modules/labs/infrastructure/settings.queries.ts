/** Types generated for queries found in "src/modules/labs/infrastructure/settings.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetSettings' parameters type */
export interface IGetSettingsParams {
  workspaceId: string;
}

/** 'GetSettings' return type */
export interface IGetSettingsResult {
  lead_days: number;
  version: number;
}

/** 'GetSettings' query type */
export interface IGetSettingsQuery {
  params: IGetSettingsParams;
  result: IGetSettingsResult;
}

const getSettingsIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":128,"b":140}]}],"statement":"-- Sin fila, el comando responde la anticipación por defecto.\nSELECT lead_days, version\nFROM labs.settings\nWHERE workspace_id = :workspaceId!"};

/**
 * Query generated from SQL:
 * ```
 * -- Sin fila, el comando responde la anticipación por defecto.
 * SELECT lead_days, version
 * FROM labs.settings
 * WHERE workspace_id = :workspaceId!
 * ```
 */
export const getSettings = new PreparedQuery<IGetSettingsParams,IGetSettingsResult>(getSettingsIR);


/** 'SaveSettings' parameters type */
export interface ISaveSettingsParams {
  leadDays: number;
  workspaceId: string;
}

/** 'SaveSettings' return type */
export interface ISaveSettingsResult {
  lead_days: number;
  version: number;
}

/** 'SaveSettings' query type */
export interface ISaveSettingsQuery {
  params: ISaveSettingsParams;
  result: ISaveSettingsResult;
}

const saveSettingsIR: any = {"usedParamSet":{"workspaceId":true,"leadDays":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":180,"b":192}]},{"name":"leadDays","required":true,"transform":{"type":"scalar"},"locs":[{"a":195,"b":204}]}],"statement":"-- Lo último del orden de bloqueo (02 §6): la fila de ajustes, que se crea la primera vez y después sube\n-- su versión.\nINSERT INTO labs.settings (workspace_id, lead_days)\nVALUES (:workspaceId!, :leadDays!)\nON CONFLICT (workspace_id) DO UPDATE\nSET lead_days = excluded.lead_days, version = labs.settings.version + 1\nRETURNING lead_days, version"};

/**
 * Query generated from SQL:
 * ```
 * -- Lo último del orden de bloqueo (02 §6): la fila de ajustes, que se crea la primera vez y después sube
 * -- su versión.
 * INSERT INTO labs.settings (workspace_id, lead_days)
 * VALUES (:workspaceId!, :leadDays!)
 * ON CONFLICT (workspace_id) DO UPDATE
 * SET lead_days = excluded.lead_days, version = labs.settings.version + 1
 * RETURNING lead_days, version
 * ```
 */
export const saveSettings = new PreparedQuery<ISaveSettingsParams,ISaveSettingsResult>(saveSettingsIR);


