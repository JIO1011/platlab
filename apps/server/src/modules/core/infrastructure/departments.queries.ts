/** Types generated for queries found in "src/modules/core/infrastructure/departments.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'ListActiveDepartments' parameters type */
export interface IListActiveDepartmentsParams {
  workspaceId: string;
}

/** 'ListActiveDepartments' return type */
export interface IListActiveDepartmentsResult {
  id: string;
  name: string;
}

/** 'ListActiveDepartments' query type */
export interface IListActiveDepartmentsQuery {
  params: IListActiveDepartmentsParams;
  result: IListActiveDepartmentsResult;
}

const listActiveDepartmentsIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":59,"b":71}]}],"statement":"SELECT id, name\nFROM core.departments\nWHERE workspace_id = :workspaceId! AND archived_at IS NULL\nORDER BY lower(name), id"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, name
 * FROM core.departments
 * WHERE workspace_id = :workspaceId! AND archived_at IS NULL
 * ORDER BY lower(name), id
 * ```
 */
export const listActiveDepartments = new PreparedQuery<IListActiveDepartmentsParams,IListActiveDepartmentsResult>(listActiveDepartmentsIR);


/** 'InsertDepartment' parameters type */
export interface IInsertDepartmentParams {
  name: string;
  workspaceId: string;
}

/** 'InsertDepartment' return type */
export interface IInsertDepartmentResult {
  id: string;
  name: string;
}

/** 'InsertDepartment' query type */
export interface IInsertDepartmentQuery {
  params: IInsertDepartmentParams;
  result: IInsertDepartmentResult;
}

const insertDepartmentIR: any = {"usedParamSet":{"workspaceId":true,"name":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":155,"b":167}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":170,"b":175}]}],"statement":"-- Un nombre activo repetido (departments_name) no inserta nada: el comando responde NAME_TAKEN.\nINSERT INTO core.departments (workspace_id, name)\nVALUES (:workspaceId!, :name!)\nON CONFLICT (workspace_id, lower(name)) WHERE archived_at IS NULL DO NOTHING\nRETURNING id, name"};

/**
 * Query generated from SQL:
 * ```
 * -- Un nombre activo repetido (departments_name) no inserta nada: el comando responde NAME_TAKEN.
 * INSERT INTO core.departments (workspace_id, name)
 * VALUES (:workspaceId!, :name!)
 * ON CONFLICT (workspace_id, lower(name)) WHERE archived_at IS NULL DO NOTHING
 * RETURNING id, name
 * ```
 */
export const insertDepartment = new PreparedQuery<IInsertDepartmentParams,IInsertDepartmentResult>(insertDepartmentIR);


/** 'DepartmentNamed' parameters type */
export interface IDepartmentNamedParams {
  exceptId?: string | null | void;
  name: string;
  workspaceId: string;
}

/** 'DepartmentNamed' return type */
export interface IDepartmentNamedResult {
  name: string;
}

/** 'DepartmentNamed' query type */
export interface IDepartmentNamedQuery {
  params: IDepartmentNamedParams;
  result: IDepartmentNamedResult;
}

const departmentNamedIR: any = {"usedParamSet":{"workspaceId":true,"name":true,"exceptId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":146,"b":158}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":184,"b":189}]},{"name":"exceptId","required":false,"transform":{"type":"scalar"},"locs":[{"a":242,"b":250}]}],"statement":"-- El departamento activo con el mismo nombre, sin mayúsculas, para nombrarlo en el error.\nSELECT name\nFROM core.departments\nWHERE workspace_id = :workspaceId! AND lower(name) = lower(:name!) AND archived_at IS NULL\n  AND id IS DISTINCT FROM :exceptId::uuid"};

/**
 * Query generated from SQL:
 * ```
 * -- El departamento activo con el mismo nombre, sin mayúsculas, para nombrarlo en el error.
 * SELECT name
 * FROM core.departments
 * WHERE workspace_id = :workspaceId! AND lower(name) = lower(:name!) AND archived_at IS NULL
 *   AND id IS DISTINCT FROM :exceptId::uuid
 * ```
 */
export const departmentNamed = new PreparedQuery<IDepartmentNamedParams,IDepartmentNamedResult>(departmentNamedIR);


/** 'LockDepartment' parameters type */
export interface ILockDepartmentParams {
  departmentId: string;
  workspaceId: string;
}

/** 'LockDepartment' return type */
export interface ILockDepartmentResult {
  id: string;
  name: string;
}

/** 'LockDepartment' query type */
export interface ILockDepartmentQuery {
  params: ILockDepartmentParams;
  result: ILockDepartmentResult;
}

const lockDepartmentIR: any = {"usedParamSet":{"workspaceId":true,"departmentId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":202,"b":214}]},{"name":"departmentId","required":true,"transform":{"type":"scalar"},"locs":[{"a":225,"b":238}]}],"statement":"-- El departamento activo del espacio, bloqueado: exclusivo para renombrarlo o archivarlo, compartido para\n-- enlazarlo a un lote o un equipo.\nSELECT id, name\nFROM core.departments\nWHERE workspace_id = :workspaceId! AND id = :departmentId! AND archived_at IS NULL\nFOR UPDATE"};

/**
 * Query generated from SQL:
 * ```
 * -- El departamento activo del espacio, bloqueado: exclusivo para renombrarlo o archivarlo, compartido para
 * -- enlazarlo a un lote o un equipo.
 * SELECT id, name
 * FROM core.departments
 * WHERE workspace_id = :workspaceId! AND id = :departmentId! AND archived_at IS NULL
 * FOR UPDATE
 * ```
 */
export const lockDepartment = new PreparedQuery<ILockDepartmentParams,ILockDepartmentResult>(lockDepartmentIR);


/** 'ShareDepartment' parameters type */
export interface IShareDepartmentParams {
  departmentId: string;
  workspaceId: string;
}

/** 'ShareDepartment' return type */
export interface IShareDepartmentResult {
  id: string;
  name: string;
}

/** 'ShareDepartment' query type */
export interface IShareDepartmentQuery {
  params: IShareDepartmentParams;
  result: IShareDepartmentResult;
}

const shareDepartmentIR: any = {"usedParamSet":{"workspaceId":true,"departmentId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":59,"b":71}]},{"name":"departmentId","required":true,"transform":{"type":"scalar"},"locs":[{"a":82,"b":95}]}],"statement":"SELECT id, name\nFROM core.departments\nWHERE workspace_id = :workspaceId! AND id = :departmentId! AND archived_at IS NULL\nFOR SHARE"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, name
 * FROM core.departments
 * WHERE workspace_id = :workspaceId! AND id = :departmentId! AND archived_at IS NULL
 * FOR SHARE
 * ```
 */
export const shareDepartment = new PreparedQuery<IShareDepartmentParams,IShareDepartmentResult>(shareDepartmentIR);


/** 'SetDepartmentName' parameters type */
export interface ISetDepartmentNameParams {
  departmentId: string;
  name: string;
  workspaceId: string;
}

/** 'SetDepartmentName' return type */
export type ISetDepartmentNameResult = void;

/** 'SetDepartmentName' query type */
export interface ISetDepartmentNameQuery {
  params: ISetDepartmentNameParams;
  result: ISetDepartmentNameResult;
}

const setDepartmentNameIR: any = {"usedParamSet":{"name":true,"workspaceId":true,"departmentId":true},"params":[{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":35,"b":40}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":63,"b":75}]},{"name":"departmentId","required":true,"transform":{"type":"scalar"},"locs":[{"a":86,"b":99}]}],"statement":"UPDATE core.departments\nSET name = :name!\nWHERE workspace_id = :workspaceId! AND id = :departmentId!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE core.departments
 * SET name = :name!
 * WHERE workspace_id = :workspaceId! AND id = :departmentId!
 * ```
 */
export const setDepartmentName = new PreparedQuery<ISetDepartmentNameParams,ISetDepartmentNameResult>(setDepartmentNameIR);


/** 'ArchiveDepartment' parameters type */
export interface IArchiveDepartmentParams {
  departmentId: string;
  workspaceId: string;
}

/** 'ArchiveDepartment' return type */
export interface IArchiveDepartmentResult {
  id: string;
}

/** 'ArchiveDepartment' query type */
export interface IArchiveDepartmentQuery {
  params: IArchiveDepartmentParams;
  result: IArchiveDepartmentResult;
}

const archiveDepartmentIR: any = {"usedParamSet":{"workspaceId":true,"departmentId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":69,"b":81}]},{"name":"departmentId","required":true,"transform":{"type":"scalar"},"locs":[{"a":92,"b":105}]}],"statement":"UPDATE core.departments\nSET archived_at = now()\nWHERE workspace_id = :workspaceId! AND id = :departmentId! AND archived_at IS NULL\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE core.departments
 * SET archived_at = now()
 * WHERE workspace_id = :workspaceId! AND id = :departmentId! AND archived_at IS NULL
 * RETURNING id
 * ```
 */
export const archiveDepartment = new PreparedQuery<IArchiveDepartmentParams,IArchiveDepartmentResult>(archiveDepartmentIR);


