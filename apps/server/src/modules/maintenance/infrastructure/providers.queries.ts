/** Types generated for queries found in "src/modules/maintenance/infrastructure/providers.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'ListProviders' parameters type */
export interface IListProvidersParams {
  providerId?: string | null | void;
  workspaceId: string;
}

/** 'ListProviders' return type */
export interface IListProvidersResult {
  archived_at: Date | null;
  contact: string | null;
  id: string;
  name: string;
  version: number;
}

/** 'ListProviders' query type */
export interface IListProvidersQuery {
  params: IListProvidersParams;
  result: IListProvidersResult;
}

const listProvidersIR: any = {"usedParamSet":{"workspaceId":true,"providerId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":243,"b":255}]},{"name":"providerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":273,"b":283},{"a":334,"b":344}]}],"statement":"-- Los activos en orden alfabético, sin tildes ni mayúsculas; con :providerId, ese proveedor aunque esté\n-- archivado (la respuesta de un comando).\nSELECT id, name, contact, archived_at, version\nFROM maintenance.providers\nWHERE workspace_id = :workspaceId!\n  AND CASE WHEN :providerId::uuid IS NULL THEN archived_at IS NULL ELSE id = :providerId::uuid END\nORDER BY core.fold_text(name), id"};

/**
 * Query generated from SQL:
 * ```
 * -- Los activos en orden alfabético, sin tildes ni mayúsculas; con :providerId, ese proveedor aunque esté
 * -- archivado (la respuesta de un comando).
 * SELECT id, name, contact, archived_at, version
 * FROM maintenance.providers
 * WHERE workspace_id = :workspaceId!
 *   AND CASE WHEN :providerId::uuid IS NULL THEN archived_at IS NULL ELSE id = :providerId::uuid END
 * ORDER BY core.fold_text(name), id
 * ```
 */
export const listProviders = new PreparedQuery<IListProvidersParams,IListProvidersResult>(listProvidersIR);


/** 'InsertProvider' parameters type */
export interface IInsertProviderParams {
  contact?: string | null | void;
  name: string;
  workspaceId: string;
}

/** 'InsertProvider' return type */
export interface IInsertProviderResult {
  id: string;
}

/** 'InsertProvider' query type */
export interface IInsertProviderQuery {
  params: IInsertProviderParams;
  result: IInsertProviderResult;
}

const insertProviderIR: any = {"usedParamSet":{"workspaceId":true,"name":true,"contact":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":158,"b":170}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":173,"b":178}]},{"name":"contact","required":false,"transform":{"type":"scalar"},"locs":[{"a":181,"b":188}]}],"statement":"-- Un nombre activo repetido (providers_name) falla y el comando responde NAME_TAKEN.\nINSERT INTO maintenance.providers (workspace_id, name, contact)\nVALUES (:workspaceId!, :name!, :contact)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- Un nombre activo repetido (providers_name) falla y el comando responde NAME_TAKEN.
 * INSERT INTO maintenance.providers (workspace_id, name, contact)
 * VALUES (:workspaceId!, :name!, :contact)
 * RETURNING id
 * ```
 */
export const insertProvider = new PreparedQuery<IInsertProviderParams,IInsertProviderResult>(insertProviderIR);


/** 'LockProvider' parameters type */
export interface ILockProviderParams {
  providerId: string;
  workspaceId: string;
}

/** 'LockProvider' return type */
export interface ILockProviderResult {
  archived_at: Date | null;
  contact: string | null;
  name: string;
  version: number;
}

/** 'LockProvider' query type */
export interface ILockProviderQuery {
  params: ILockProviderParams;
  result: ILockProviderResult;
}

const lockProviderIR: any = {"usedParamSet":{"workspaceId":true,"providerId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":174,"b":186}]},{"name":"providerId","required":true,"transform":{"type":"scalar"},"locs":[{"a":197,"b":208}]}],"statement":"-- Lo último del orden de bloqueo (02 §6): el proveedor que se edita o se archiva.\nSELECT name, contact, archived_at, version\nFROM maintenance.providers\nWHERE workspace_id = :workspaceId! AND id = :providerId!\nFOR UPDATE"};

/**
 * Query generated from SQL:
 * ```
 * -- Lo último del orden de bloqueo (02 §6): el proveedor que se edita o se archiva.
 * SELECT name, contact, archived_at, version
 * FROM maintenance.providers
 * WHERE workspace_id = :workspaceId! AND id = :providerId!
 * FOR UPDATE
 * ```
 */
export const lockProvider = new PreparedQuery<ILockProviderParams,ILockProviderResult>(lockProviderIR);


/** 'UpdateProvider' parameters type */
export interface IUpdateProviderParams {
  contact?: string | null | void;
  name: string;
  providerId: string;
  workspaceId: string;
}

/** 'UpdateProvider' return type */
export type IUpdateProviderResult = void;

/** 'UpdateProvider' query type */
export interface IUpdateProviderQuery {
  params: IUpdateProviderParams;
  result: IUpdateProviderResult;
}

const updateProviderIR: any = {"usedParamSet":{"name":true,"contact":true,"workspaceId":true,"providerId":true},"params":[{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":140,"b":145}]},{"name":"contact","required":false,"transform":{"type":"scalar"},"locs":[{"a":158,"b":165}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":211,"b":223}]},{"name":"providerId","required":true,"transform":{"type":"scalar"},"locs":[{"a":234,"b":245}]}],"statement":"-- Escribe la ficha ya combinada y sube la versión; el comando la edita con el proveedor bloqueado.\nUPDATE maintenance.providers\nSET name = :name!, contact = :contact, version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :providerId!"};

/**
 * Query generated from SQL:
 * ```
 * -- Escribe la ficha ya combinada y sube la versión; el comando la edita con el proveedor bloqueado.
 * UPDATE maintenance.providers
 * SET name = :name!, contact = :contact, version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :providerId!
 * ```
 */
export const updateProvider = new PreparedQuery<IUpdateProviderParams,IUpdateProviderResult>(updateProviderIR);


/** 'ArchiveProvider' parameters type */
export interface IArchiveProviderParams {
  providerId: string;
  workspaceId: string;
}

/** 'ArchiveProvider' return type */
export type IArchiveProviderResult = void;

/** 'ArchiveProvider' query type */
export interface IArchiveProviderQuery {
  params: IArchiveProviderParams;
  result: IArchiveProviderResult;
}

const archiveProviderIR: any = {"usedParamSet":{"workspaceId":true,"providerId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":179,"b":191}]},{"name":"providerId","required":true,"transform":{"type":"scalar"},"locs":[{"a":202,"b":213}]}],"statement":"-- Los registros hechos con él lo conservan; solo deja de ofrecerse al registrar.\nUPDATE maintenance.providers\nSET archived_at = now(), version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :providerId!"};

/**
 * Query generated from SQL:
 * ```
 * -- Los registros hechos con él lo conservan; solo deja de ofrecerse al registrar.
 * UPDATE maintenance.providers
 * SET archived_at = now(), version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :providerId!
 * ```
 */
export const archiveProvider = new PreparedQuery<IArchiveProviderParams,IArchiveProviderResult>(archiveProviderIR);


