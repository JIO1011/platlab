/** Types generated for queries found in "src/modules/labs/infrastructure/closures.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'ListClosures' parameters type */
export interface IListClosuresParams {
  closureId?: string | null | void;
  from?: string | null | void;
  includeVoided?: boolean | null | void;
  to?: string | null | void;
  workspaceId: string;
}

/** 'ListClosures' return type */
export interface IListClosuresResult {
  area_id: string | null;
  area_name: string | null;
  created_at: Date;
  ends_on: string;
  id: string;
  reason: string;
  starts_on: string;
  voided_at: Date | null;
}

/** 'ListClosures' query type */
export interface IListClosuresQuery {
  params: IListClosuresParams;
  result: IListClosuresResult;
}

const listClosuresIR: any = {"usedParamSet":{"workspaceId":true,"closureId":true,"to":true,"from":true,"includeVoided":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":409,"b":421}]},{"name":"closureId","required":false,"transform":{"type":"scalar"},"locs":[{"a":439,"b":448},{"a":619,"b":628}]},{"name":"to","required":false,"transform":{"type":"scalar"},"locs":[{"a":488,"b":490}]},{"name":"from","required":false,"transform":{"type":"scalar"},"locs":[{"a":515,"b":519}]},{"name":"includeVoided","required":false,"transform":{"type":"scalar"},"locs":[{"a":547,"b":560}]}],"statement":"-- Los que tocan el rango [from, to], sin los anulados salvo :includeVoided, por fecha; con :closureId,\n-- ese cierre aunque esté anulado (la respuesta de un comando).\nSELECT c.id, c.area_id, a.name AS \"area_name?\", c.starts_on, c.ends_on, c.reason, c.voided_at, c.created_at\nFROM labs.closures AS c\nLEFT JOIN core.locations AS a ON a.workspace_id = c.workspace_id AND a.id = c.area_id\nWHERE c.workspace_id = :workspaceId!\n  AND CASE WHEN :closureId::uuid IS NULL\n    THEN c.starts_on <= :to::date AND c.ends_on >= :from::date\n      AND (coalesce(:includeVoided::boolean, false) OR c.voided_at IS NULL)\n    ELSE c.id = :closureId::uuid END\nORDER BY c.starts_on, c.ends_on, c.id"};

/**
 * Query generated from SQL:
 * ```
 * -- Los que tocan el rango [from, to], sin los anulados salvo :includeVoided, por fecha; con :closureId,
 * -- ese cierre aunque esté anulado (la respuesta de un comando).
 * SELECT c.id, c.area_id, a.name AS "area_name?", c.starts_on, c.ends_on, c.reason, c.voided_at, c.created_at
 * FROM labs.closures AS c
 * LEFT JOIN core.locations AS a ON a.workspace_id = c.workspace_id AND a.id = c.area_id
 * WHERE c.workspace_id = :workspaceId!
 *   AND CASE WHEN :closureId::uuid IS NULL
 *     THEN c.starts_on <= :to::date AND c.ends_on >= :from::date
 *       AND (coalesce(:includeVoided::boolean, false) OR c.voided_at IS NULL)
 *     ELSE c.id = :closureId::uuid END
 * ORDER BY c.starts_on, c.ends_on, c.id
 * ```
 */
export const listClosures = new PreparedQuery<IListClosuresParams,IListClosuresResult>(listClosuresIR);


/** 'InsertClosure' parameters type */
export interface IInsertClosureParams {
  areaId?: string | null | void;
  createdBy: string;
  endsOn: string;
  reason: string;
  startsOn: string;
  workspaceId: string;
}

/** 'InsertClosure' return type */
export interface IInsertClosureResult {
  id: string;
}

/** 'InsertClosure' query type */
export interface IInsertClosureQuery {
  params: IInsertClosureParams;
  result: IInsertClosureResult;
}

const insertClosureIR: any = {"usedParamSet":{"workspaceId":true,"areaId":true,"startsOn":true,"endsOn":true,"reason":true,"createdBy":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":111,"b":123}]},{"name":"areaId","required":false,"transform":{"type":"scalar"},"locs":[{"a":126,"b":132}]},{"name":"startsOn","required":true,"transform":{"type":"scalar"},"locs":[{"a":135,"b":144}]},{"name":"endsOn","required":true,"transform":{"type":"scalar"},"locs":[{"a":153,"b":160}]},{"name":"reason","required":true,"transform":{"type":"scalar"},"locs":[{"a":169,"b":176}]},{"name":"createdBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":179,"b":189}]}],"statement":"INSERT INTO labs.closures (workspace_id, area_id, starts_on, ends_on, reason, created_by_principal_id)\nVALUES (:workspaceId!, :areaId, :startsOn!::date, :endsOn!::date, :reason!, :createdBy!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO labs.closures (workspace_id, area_id, starts_on, ends_on, reason, created_by_principal_id)
 * VALUES (:workspaceId!, :areaId, :startsOn!::date, :endsOn!::date, :reason!, :createdBy!)
 * RETURNING id
 * ```
 */
export const insertClosure = new PreparedQuery<IInsertClosureParams,IInsertClosureResult>(insertClosureIR);


/** 'LockClosure' parameters type */
export interface ILockClosureParams {
  closureId: string;
  workspaceId: string;
}

/** 'LockClosure' return type */
export interface ILockClosureResult {
  voided_at: Date | null;
}

/** 'LockClosure' query type */
export interface ILockClosureQuery {
  params: ILockClosureParams;
  result: ILockClosureResult;
}

const lockClosureIR: any = {"usedParamSet":{"workspaceId":true,"closureId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":124,"b":136}]},{"name":"closureId","required":true,"transform":{"type":"scalar"},"locs":[{"a":147,"b":157}]}],"statement":"-- Lo último del orden de bloqueo (02 §6): el cierre que se anula.\nSELECT voided_at\nFROM labs.closures\nWHERE workspace_id = :workspaceId! AND id = :closureId!\nFOR UPDATE"};

/**
 * Query generated from SQL:
 * ```
 * -- Lo último del orden de bloqueo (02 §6): el cierre que se anula.
 * SELECT voided_at
 * FROM labs.closures
 * WHERE workspace_id = :workspaceId! AND id = :closureId!
 * FOR UPDATE
 * ```
 */
export const lockClosure = new PreparedQuery<ILockClosureParams,ILockClosureResult>(lockClosureIR);


/** 'VoidClosure' parameters type */
export interface IVoidClosureParams {
  closureId: string;
  voidedBy: string;
  workspaceId: string;
}

/** 'VoidClosure' return type */
export type IVoidClosureResult = void;

/** 'VoidClosure' query type */
export interface IVoidClosureQuery {
  params: IVoidClosureParams;
  result: IVoidClosureResult;
}

const voidClosureIR: any = {"usedParamSet":{"voidedBy":true,"workspaceId":true,"closureId":true},"params":[{"name":"voidedBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":69,"b":78}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":101,"b":113}]},{"name":"closureId","required":true,"transform":{"type":"scalar"},"locs":[{"a":124,"b":134}]}],"statement":"UPDATE labs.closures\nSET voided_at = now(), voided_by_principal_id = :voidedBy!\nWHERE workspace_id = :workspaceId! AND id = :closureId!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE labs.closures
 * SET voided_at = now(), voided_by_principal_id = :voidedBy!
 * WHERE workspace_id = :workspaceId! AND id = :closureId!
 * ```
 */
export const voidClosure = new PreparedQuery<IVoidClosureParams,IVoidClosureResult>(voidClosureIR);


