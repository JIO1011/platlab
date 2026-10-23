/** Types generated for queries found in "src/modules/labs/infrastructure/periods.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'ListPeriods' parameters type */
export interface IListPeriodsParams {
  periodId?: string | null | void;
  workspaceId: string;
}

/** 'ListPeriods' return type */
export interface IListPeriodsResult {
  archived_at: Date | null;
  code: string;
  ends_on: string;
  id: string;
  starts_on: string;
  version: number;
}

/** 'ListPeriods' query type */
export interface IListPeriodsQuery {
  params: IListPeriodsParams;
  result: IListPeriodsResult;
}

const listPeriodsIR: any = {"usedParamSet":{"workspaceId":true,"periodId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":253,"b":265}]},{"name":"periodId","required":false,"transform":{"type":"scalar"},"locs":[{"a":274,"b":282},{"a":306,"b":314}]}],"statement":"-- Activos por fecha de inicio y después los archivados; con :periodId, ese período (la respuesta de un comando).\nSELECT id, code, starts_on::text AS \"starts_on!\", ends_on::text AS \"ends_on!\", version, archived_at\nFROM labs.periods\nWHERE workspace_id = :workspaceId!\n  AND (:periodId::uuid IS NULL OR id = :periodId::uuid)\nORDER BY archived_at IS NOT NULL, starts_on, id"};

/**
 * Query generated from SQL:
 * ```
 * -- Activos por fecha de inicio y después los archivados; con :periodId, ese período (la respuesta de un comando).
 * SELECT id, code, starts_on::text AS "starts_on!", ends_on::text AS "ends_on!", version, archived_at
 * FROM labs.periods
 * WHERE workspace_id = :workspaceId!
 *   AND (:periodId::uuid IS NULL OR id = :periodId::uuid)
 * ORDER BY archived_at IS NOT NULL, starts_on, id
 * ```
 */
export const listPeriods = new PreparedQuery<IListPeriodsParams,IListPeriodsResult>(listPeriodsIR);


/** 'LockPeriod' parameters type */
export interface ILockPeriodParams {
  periodId: string;
  workspaceId: string;
}

/** 'LockPeriod' return type */
export interface ILockPeriodResult {
  archived_at: Date | null;
  code: string;
  ends_on: string;
  starts_on: string;
  version: number;
}

/** 'LockPeriod' query type */
export interface ILockPeriodQuery {
  params: ILockPeriodParams;
  result: ILockPeriodResult;
}

const lockPeriodIR: any = {"usedParamSet":{"workspaceId":true,"periodId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":216,"b":228}]},{"name":"periodId","required":true,"transform":{"type":"scalar"},"locs":[{"a":239,"b":248}]}],"statement":"-- Lo último del orden de bloqueo (02 §6): el período que se edita o se archiva.\nSELECT code, starts_on::text AS \"starts_on!\", ends_on::text AS \"ends_on!\", archived_at, version\nFROM labs.periods\nWHERE workspace_id = :workspaceId! AND id = :periodId!\nFOR UPDATE"};

/**
 * Query generated from SQL:
 * ```
 * -- Lo último del orden de bloqueo (02 §6): el período que se edita o se archiva.
 * SELECT code, starts_on::text AS "starts_on!", ends_on::text AS "ends_on!", archived_at, version
 * FROM labs.periods
 * WHERE workspace_id = :workspaceId! AND id = :periodId!
 * FOR UPDATE
 * ```
 */
export const lockPeriod = new PreparedQuery<ILockPeriodParams,ILockPeriodResult>(lockPeriodIR);


/** 'InsertPeriod' parameters type */
export interface IInsertPeriodParams {
  code: string;
  createdBy: string;
  endsOn: string;
  startsOn: string;
  workspaceId: string;
}

/** 'InsertPeriod' return type */
export interface IInsertPeriodResult {
  id: string;
}

/** 'InsertPeriod' query type */
export interface IInsertPeriodQuery {
  params: IInsertPeriodParams;
  result: IInsertPeriodResult;
}

const insertPeriodIR: any = {"usedParamSet":{"workspaceId":true,"code":true,"startsOn":true,"endsOn":true,"createdBy":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":287,"b":299}]},{"name":"code","required":true,"transform":{"type":"scalar"},"locs":[{"a":302,"b":307}]},{"name":"startsOn","required":true,"transform":{"type":"scalar"},"locs":[{"a":310,"b":319}]},{"name":"endsOn","required":true,"transform":{"type":"scalar"},"locs":[{"a":328,"b":335}]},{"name":"createdBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":344,"b":354}]}],"statement":"-- Un código activo repetido (periods_active_code) o fechas que se cruzan con otro activo\n-- (periods_no_overlap) fallan, también si otra persona escribió a la vez; el comando lo explica.\nINSERT INTO labs.periods (workspace_id, code, starts_on, ends_on, created_by_principal_id)\nVALUES (:workspaceId!, :code!, :startsOn!::date, :endsOn!::date, :createdBy!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- Un código activo repetido (periods_active_code) o fechas que se cruzan con otro activo
 * -- (periods_no_overlap) fallan, también si otra persona escribió a la vez; el comando lo explica.
 * INSERT INTO labs.periods (workspace_id, code, starts_on, ends_on, created_by_principal_id)
 * VALUES (:workspaceId!, :code!, :startsOn!::date, :endsOn!::date, :createdBy!)
 * RETURNING id
 * ```
 */
export const insertPeriod = new PreparedQuery<IInsertPeriodParams,IInsertPeriodResult>(insertPeriodIR);


/** 'WritePeriod' parameters type */
export interface IWritePeriodParams {
  code: string;
  endsOn: string;
  periodId: string;
  startsOn: string;
  workspaceId: string;
}

/** 'WritePeriod' return type */
export type IWritePeriodResult = void;

/** 'WritePeriod' query type */
export interface IWritePeriodQuery {
  params: IWritePeriodParams;
  result: IWritePeriodResult;
}

const writePeriodIR: any = {"usedParamSet":{"code":true,"startsOn":true,"endsOn":true,"workspaceId":true,"periodId":true},"params":[{"name":"code","required":true,"transform":{"type":"scalar"},"locs":[{"a":130,"b":135}]},{"name":"startsOn","required":true,"transform":{"type":"scalar"},"locs":[{"a":150,"b":159}]},{"name":"endsOn","required":true,"transform":{"type":"scalar"},"locs":[{"a":178,"b":185}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":237,"b":249}]},{"name":"periodId","required":true,"transform":{"type":"scalar"},"locs":[{"a":260,"b":269}]}],"statement":"-- Escribe código y fechas ya combinados y sube la versión; las mismas restricciones que al crear.\nUPDATE labs.periods\nSET code = :code!, starts_on = :startsOn!::date, ends_on = :endsOn!::date, version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :periodId!"};

/**
 * Query generated from SQL:
 * ```
 * -- Escribe código y fechas ya combinados y sube la versión; las mismas restricciones que al crear.
 * UPDATE labs.periods
 * SET code = :code!, starts_on = :startsOn!::date, ends_on = :endsOn!::date, version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :periodId!
 * ```
 */
export const writePeriod = new PreparedQuery<IWritePeriodParams,IWritePeriodResult>(writePeriodIR);


/** 'ArchivePeriod' parameters type */
export interface IArchivePeriodParams {
  periodId: string;
  workspaceId: string;
}

/** 'ArchivePeriod' return type */
export type IArchivePeriodResult = void;

/** 'ArchivePeriod' query type */
export interface IArchivePeriodQuery {
  params: IArchivePeriodParams;
  result: IArchivePeriodResult;
}

const archivePeriodIR: any = {"usedParamSet":{"workspaceId":true,"periodId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":147,"b":159}]},{"name":"periodId","required":true,"transform":{"type":"scalar"},"locs":[{"a":170,"b":179}]}],"statement":"-- Deja de agendarse en él; libera su código y sus fechas.\nUPDATE labs.periods\nSET archived_at = now(), version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :periodId!"};

/**
 * Query generated from SQL:
 * ```
 * -- Deja de agendarse en él; libera su código y sus fechas.
 * UPDATE labs.periods
 * SET archived_at = now(), version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :periodId!
 * ```
 */
export const archivePeriod = new PreparedQuery<IArchivePeriodParams,IArchivePeriodResult>(archivePeriodIR);


