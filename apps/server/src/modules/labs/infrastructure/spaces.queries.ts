/** Types generated for queries found in "src/modules/labs/infrastructure/spaces.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** 'ListSpaces' parameters type */
export interface IListSpacesParams {
  areaId?: string | null | void;
  workspaceId: string;
}

/** 'ListSpaces' return type */
export interface IListSpacesResult {
  abbreviation: string;
  archived_at: Date | null;
  area_archived: boolean;
  area_id: string;
  area_name: string;
  capacity: number;
  group_name: string | null;
  version: number;
  weekly_hours: Json;
}

/** 'ListSpaces' query type */
export interface IListSpacesQuery {
  params: IListSpacesParams;
  result: IListSpacesResult;
}

const listSpacesIR: any = {"usedParamSet":{"workspaceId":true,"areaId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":593,"b":605}]},{"name":"areaId","required":false,"transform":{"type":"scalar"},"locs":[{"a":614,"b":620},{"a":651,"b":657}]}],"statement":"-- Activos primero, por sede o edificio y nombre del área, con si el área se archivó en «Áreas»; con\n-- :areaId, ese espacio (la respuesta de un comando).\nSELECT s.area_id, a.name AS area_name, g.name AS \"group_name?\", (a.archived_at IS NOT NULL) AS \"area_archived!\",\n       s.abbreviation, s.capacity, s.weekly_hours, s.version, s.archived_at\nFROM labs.spaces AS s\nJOIN core.locations AS a ON a.workspace_id = s.workspace_id AND a.id = s.area_id\nLEFT JOIN core.locations AS g ON g.workspace_id = a.workspace_id AND g.id = a.parent_id AND g.kind IN ('site', 'building')\nWHERE s.workspace_id = :workspaceId!\n  AND (:areaId::uuid IS NULL OR s.area_id = :areaId::uuid)\nORDER BY s.archived_at IS NOT NULL, g.name IS NOT NULL, core.fold_text(coalesce(g.name, '')), core.fold_text(a.name), s.area_id"};

/**
 * Query generated from SQL:
 * ```
 * -- Activos primero, por sede o edificio y nombre del área, con si el área se archivó en «Áreas»; con
 * -- :areaId, ese espacio (la respuesta de un comando).
 * SELECT s.area_id, a.name AS area_name, g.name AS "group_name?", (a.archived_at IS NOT NULL) AS "area_archived!",
 *        s.abbreviation, s.capacity, s.weekly_hours, s.version, s.archived_at
 * FROM labs.spaces AS s
 * JOIN core.locations AS a ON a.workspace_id = s.workspace_id AND a.id = s.area_id
 * LEFT JOIN core.locations AS g ON g.workspace_id = a.workspace_id AND g.id = a.parent_id AND g.kind IN ('site', 'building')
 * WHERE s.workspace_id = :workspaceId!
 *   AND (:areaId::uuid IS NULL OR s.area_id = :areaId::uuid)
 * ORDER BY s.archived_at IS NOT NULL, g.name IS NOT NULL, core.fold_text(coalesce(g.name, '')), core.fold_text(a.name), s.area_id
 * ```
 */
export const listSpaces = new PreparedQuery<IListSpacesParams,IListSpacesResult>(listSpacesIR);


/** 'ShareActiveArea' parameters type */
export interface IShareActiveAreaParams {
  areaId: string;
  workspaceId: string;
}

/** 'ShareActiveArea' return type */
export interface IShareActiveAreaResult {
  id: string;
}

/** 'ShareActiveArea' query type */
export interface IShareActiveAreaQuery {
  params: IShareActiveAreaParams;
  result: IShareActiveAreaResult;
}

const shareActiveAreaIR: any = {"usedParamSet":{"workspaceId":true,"areaId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":334,"b":346}]},{"name":"areaId","required":true,"transform":{"type":"scalar"},"locs":[{"a":359,"b":366}]}],"statement":"-- El área activa del Núcleo (ADR 0024: primer nivel bajo la sede o el edificio, o la raíz), bloqueada\n-- compartida hasta el final, como quien coloca algo en ella: no se archiva mientras se habilita. Sin\n-- fila si no es un área, está archivada o es de otro espacio (RLS).\nSELECT l.id\nFROM core.locations AS l\nWHERE l.workspace_id = :workspaceId! AND l.id = :areaId! AND l.archived_at IS NULL\n  AND l.kind NOT IN ('site', 'building')\n  AND EXISTS (\n    SELECT 1 FROM core.location_areas AS la\n    WHERE la.workspace_id = l.workspace_id AND la.location_id = l.id AND la.area_id = l.id\n  )\nFOR SHARE OF l"};

/**
 * Query generated from SQL:
 * ```
 * -- El área activa del Núcleo (ADR 0024: primer nivel bajo la sede o el edificio, o la raíz), bloqueada
 * -- compartida hasta el final, como quien coloca algo en ella: no se archiva mientras se habilita. Sin
 * -- fila si no es un área, está archivada o es de otro espacio (RLS).
 * SELECT l.id
 * FROM core.locations AS l
 * WHERE l.workspace_id = :workspaceId! AND l.id = :areaId! AND l.archived_at IS NULL
 *   AND l.kind NOT IN ('site', 'building')
 *   AND EXISTS (
 *     SELECT 1 FROM core.location_areas AS la
 *     WHERE la.workspace_id = l.workspace_id AND la.location_id = l.id AND la.area_id = l.id
 *   )
 * FOR SHARE OF l
 * ```
 */
export const shareActiveArea = new PreparedQuery<IShareActiveAreaParams,IShareActiveAreaResult>(shareActiveAreaIR);


/** 'LockSpace' parameters type */
export interface ILockSpaceParams {
  areaId: string;
  workspaceId: string;
}

/** 'LockSpace' return type */
export interface ILockSpaceResult {
  abbreviation: string;
  archived_at: Date | null;
  capacity: number;
  version: number;
  weekly_hours: Json;
}

/** 'LockSpace' query type */
export interface ILockSpaceQuery {
  params: ILockSpaceParams;
  result: ILockSpaceResult;
}

const lockSpaceIR: any = {"usedParamSet":{"workspaceId":true,"areaId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":198,"b":210}]},{"name":"areaId","required":true,"transform":{"type":"scalar"},"locs":[{"a":226,"b":233}]}],"statement":"-- Lo último del orden de bloqueo (02 §6): el espacio que se habilita, se edita o se archiva.\nSELECT abbreviation, capacity, weekly_hours, archived_at, version\nFROM labs.spaces\nWHERE workspace_id = :workspaceId! AND area_id = :areaId!\nFOR UPDATE"};

/**
 * Query generated from SQL:
 * ```
 * -- Lo último del orden de bloqueo (02 §6): el espacio que se habilita, se edita o se archiva.
 * SELECT abbreviation, capacity, weekly_hours, archived_at, version
 * FROM labs.spaces
 * WHERE workspace_id = :workspaceId! AND area_id = :areaId!
 * FOR UPDATE
 * ```
 */
export const lockSpace = new PreparedQuery<ILockSpaceParams,ILockSpaceResult>(lockSpaceIR);


/** 'ShareSpace' parameters type */
export interface IShareSpaceParams {
  areaId: string;
  workspaceId: string;
}

/** 'ShareSpace' return type */
export interface IShareSpaceResult {
  archived_at: Date | null;
  version: number;
}

/** 'ShareSpace' query type */
export interface IShareSpaceQuery {
  params: IShareSpaceParams;
  result: IShareSpaceResult;
}

const shareSpaceIR: any = {"usedParamSet":{"workspaceId":true,"areaId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":152,"b":164}]},{"name":"areaId","required":true,"transform":{"type":"scalar"},"locs":[{"a":180,"b":187}]}],"statement":"-- El espacio de un cierre nuevo, bloqueado compartido: no se archiva mientras tanto.\nSELECT archived_at, version\nFROM labs.spaces\nWHERE workspace_id = :workspaceId! AND area_id = :areaId!\nFOR SHARE"};

/**
 * Query generated from SQL:
 * ```
 * -- El espacio de un cierre nuevo, bloqueado compartido: no se archiva mientras tanto.
 * SELECT archived_at, version
 * FROM labs.spaces
 * WHERE workspace_id = :workspaceId! AND area_id = :areaId!
 * FOR SHARE
 * ```
 */
export const shareSpace = new PreparedQuery<IShareSpaceParams,IShareSpaceResult>(shareSpaceIR);


/** 'InsertSpace' parameters type */
export interface IInsertSpaceParams {
  abbreviation: string;
  areaId: string;
  capacity: number;
  createdBy: string;
  weeklyHours: Json;
  workspaceId: string;
}

/** 'InsertSpace' return type */
export interface IInsertSpaceResult {
  area_id: string;
}

/** 'InsertSpace' query type */
export interface IInsertSpaceQuery {
  params: IInsertSpaceParams;
  result: IInsertSpaceResult;
}

const insertSpaceIR: any = {"usedParamSet":{"workspaceId":true,"areaId":true,"abbreviation":true,"capacity":true,"weeklyHours":true,"createdBy":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":315,"b":327}]},{"name":"areaId","required":true,"transform":{"type":"scalar"},"locs":[{"a":330,"b":337}]},{"name":"abbreviation","required":true,"transform":{"type":"scalar"},"locs":[{"a":340,"b":353}]},{"name":"capacity","required":true,"transform":{"type":"scalar"},"locs":[{"a":356,"b":365}]},{"name":"weeklyHours","required":true,"transform":{"type":"scalar"},"locs":[{"a":368,"b":380}]},{"name":"createdBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":390,"b":400}]}],"statement":"-- Si otra persona habilitó la misma área a la vez, no inserta nada y el comando responde que ya está\n-- habilitada. Una sigla tomada (spaces_abbreviation) falla y el comando responde CODE_TAKEN.\nINSERT INTO labs.spaces (workspace_id, area_id, abbreviation, capacity, weekly_hours, created_by_principal_id)\nVALUES (:workspaceId!, :areaId!, :abbreviation!, :capacity!, :weeklyHours!::jsonb, :createdBy!)\nON CONFLICT (workspace_id, area_id) DO NOTHING\nRETURNING area_id"};

/**
 * Query generated from SQL:
 * ```
 * -- Si otra persona habilitó la misma área a la vez, no inserta nada y el comando responde que ya está
 * -- habilitada. Una sigla tomada (spaces_abbreviation) falla y el comando responde CODE_TAKEN.
 * INSERT INTO labs.spaces (workspace_id, area_id, abbreviation, capacity, weekly_hours, created_by_principal_id)
 * VALUES (:workspaceId!, :areaId!, :abbreviation!, :capacity!, :weeklyHours!::jsonb, :createdBy!)
 * ON CONFLICT (workspace_id, area_id) DO NOTHING
 * RETURNING area_id
 * ```
 */
export const insertSpace = new PreparedQuery<IInsertSpaceParams,IInsertSpaceResult>(insertSpaceIR);


/** 'WriteSpace' parameters type */
export interface IWriteSpaceParams {
  abbreviation: string;
  areaId: string;
  capacity: number;
  weeklyHours: Json;
  workspaceId: string;
}

/** 'WriteSpace' return type */
export type IWriteSpaceResult = void;

/** 'WriteSpace' query type */
export interface IWriteSpaceQuery {
  params: IWriteSpaceParams;
  result: IWriteSpaceResult;
}

const writeSpaceIR: any = {"usedParamSet":{"abbreviation":true,"capacity":true,"weeklyHours":true,"workspaceId":true,"areaId":true},"params":[{"name":"abbreviation","required":true,"transform":{"type":"scalar"},"locs":[{"a":230,"b":243}]},{"name":"capacity","required":true,"transform":{"type":"scalar"},"locs":[{"a":257,"b":266}]},{"name":"weeklyHours","required":true,"transform":{"type":"scalar"},"locs":[{"a":284,"b":296}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":369,"b":381}]},{"name":"areaId","required":true,"transform":{"type":"scalar"},"locs":[{"a":397,"b":404}]}],"statement":"-- Escribe sigla, aforo y horario ya combinados, reactiva si estaba archivado y sube la versión; el\n-- comando lo hace con el espacio bloqueado. Una sigla tomada falla igual que al habilitar.\nUPDATE labs.spaces\nSET abbreviation = :abbreviation!, capacity = :capacity!, weekly_hours = :weeklyHours!::jsonb, archived_at = NULL, version = version + 1\nWHERE workspace_id = :workspaceId! AND area_id = :areaId!"};

/**
 * Query generated from SQL:
 * ```
 * -- Escribe sigla, aforo y horario ya combinados, reactiva si estaba archivado y sube la versión; el
 * -- comando lo hace con el espacio bloqueado. Una sigla tomada falla igual que al habilitar.
 * UPDATE labs.spaces
 * SET abbreviation = :abbreviation!, capacity = :capacity!, weekly_hours = :weeklyHours!::jsonb, archived_at = NULL, version = version + 1
 * WHERE workspace_id = :workspaceId! AND area_id = :areaId!
 * ```
 */
export const writeSpace = new PreparedQuery<IWriteSpaceParams,IWriteSpaceResult>(writeSpaceIR);


/** 'ArchiveSpace' parameters type */
export interface IArchiveSpaceParams {
  areaId: string;
  workspaceId: string;
}

/** 'ArchiveSpace' return type */
export type IArchiveSpaceResult = void;

/** 'ArchiveSpace' query type */
export interface IArchiveSpaceQuery {
  params: IArchiveSpaceParams;
  result: IArchiveSpaceResult;
}

const archiveSpaceIR: any = {"usedParamSet":{"workspaceId":true,"areaId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":135,"b":147}]},{"name":"areaId","required":true,"transform":{"type":"scalar"},"locs":[{"a":163,"b":170}]}],"statement":"-- Deja de agendarse; sus cierres se conservan.\nUPDATE labs.spaces\nSET archived_at = now(), version = version + 1\nWHERE workspace_id = :workspaceId! AND area_id = :areaId!"};

/**
 * Query generated from SQL:
 * ```
 * -- Deja de agendarse; sus cierres se conservan.
 * UPDATE labs.spaces
 * SET archived_at = now(), version = version + 1
 * WHERE workspace_id = :workspaceId! AND area_id = :areaId!
 * ```
 */
export const archiveSpace = new PreparedQuery<IArchiveSpaceParams,IArchiveSpaceResult>(archiveSpaceIR);


