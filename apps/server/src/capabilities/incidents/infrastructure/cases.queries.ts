/** Types generated for queries found in "src/capabilities/incidents/infrastructure/cases.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'InsertCase' parameters type */
export interface IInsertCaseParams {
  assetId?: string | null | void;
  description: string;
  faultType: string;
  moduleCode: string;
  reportedBy: string;
  usable: boolean;
  workspaceId: string;
}

/** 'InsertCase' return type */
export interface IInsertCaseResult {
  id: string;
}

/** 'InsertCase' query type */
export interface IInsertCaseQuery {
  params: IInsertCaseParams;
  result: IInsertCaseResult;
}

const insertCaseIR: any = {"usedParamSet":{"workspaceId":true,"moduleCode":true,"assetId":true,"faultType":true,"description":true,"usable":true,"reportedBy":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":135,"b":147}]},{"name":"moduleCode","required":true,"transform":{"type":"scalar"},"locs":[{"a":150,"b":161}]},{"name":"assetId","required":false,"transform":{"type":"scalar"},"locs":[{"a":164,"b":171}]},{"name":"faultType","required":true,"transform":{"type":"scalar"},"locs":[{"a":174,"b":184}]},{"name":"description","required":true,"transform":{"type":"scalar"},"locs":[{"a":187,"b":199}]},{"name":"usable","required":true,"transform":{"type":"scalar"},"locs":[{"a":202,"b":209}]},{"name":"reportedBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":212,"b":223}]}],"statement":"INSERT INTO incidents.cases\n  (workspace_id, module_code, asset_id, fault_type, description, usable, reported_by_principal_id)\nVALUES (:workspaceId!, :moduleCode!, :assetId, :faultType!, :description!, :usable!, :reportedBy!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO incidents.cases
 *   (workspace_id, module_code, asset_id, fault_type, description, usable, reported_by_principal_id)
 * VALUES (:workspaceId!, :moduleCode!, :assetId, :faultType!, :description!, :usable!, :reportedBy!)
 * RETURNING id
 * ```
 */
export const insertCase = new PreparedQuery<IInsertCaseParams,IInsertCaseResult>(insertCaseIR);


/** 'LockCase' parameters type */
export interface ILockCaseParams {
  caseId: string;
  moduleCode: string;
  workspaceId: string;
}

/** 'LockCase' return type */
export interface ILockCaseResult {
  asset_id: string | null;
  id: string;
  status: string;
}

/** 'LockCase' query type */
export interface ILockCaseQuery {
  params: ILockCaseParams;
  result: ILockCaseResult;
}

const lockCaseIR: any = {"usedParamSet":{"workspaceId":true,"caseId":true,"moduleCode":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":146,"b":158}]},{"name":"caseId","required":true,"transform":{"type":"scalar"},"locs":[{"a":169,"b":176}]},{"name":"moduleCode","required":true,"transform":{"type":"scalar"},"locs":[{"a":196,"b":207}]}],"statement":"-- La falla del módulo que la pide, bloqueada antes que su recurso (02 §6).\nSELECT id, status, asset_id\nFROM incidents.cases\nWHERE workspace_id = :workspaceId! AND id = :caseId! AND module_code = :moduleCode!\nFOR UPDATE"};

/**
 * Query generated from SQL:
 * ```
 * -- La falla del módulo que la pide, bloqueada antes que su recurso (02 §6).
 * SELECT id, status, asset_id
 * FROM incidents.cases
 * WHERE workspace_id = :workspaceId! AND id = :caseId! AND module_code = :moduleCode!
 * FOR UPDATE
 * ```
 */
export const lockCase = new PreparedQuery<ILockCaseParams,ILockCaseResult>(lockCaseIR);


/** 'AttendCase' parameters type */
export interface IAttendCaseParams {
  actorId: string;
  caseId: string;
  workspaceId: string;
}

/** 'AttendCase' return type */
export interface IAttendCaseResult {
  id: string;
}

/** 'AttendCase' query type */
export interface IAttendCaseQuery {
  params: IAttendCaseParams;
  result: IAttendCaseResult;
}

const attendCaseIR: any = {"usedParamSet":{"actorId":true,"workspaceId":true,"caseId":true},"params":[{"name":"actorId","required":true,"transform":{"type":"scalar"},"locs":[{"a":78,"b":86}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":153,"b":165}]},{"name":"caseId","required":true,"transform":{"type":"scalar"},"locs":[{"a":176,"b":183}]}],"statement":"UPDATE incidents.cases\nSET status = 'in_progress', attended_by_principal_id = :actorId!, attended_at = now(), version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :caseId! AND status = 'open'\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE incidents.cases
 * SET status = 'in_progress', attended_by_principal_id = :actorId!, attended_at = now(), version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :caseId! AND status = 'open'
 * RETURNING id
 * ```
 */
export const attendCase = new PreparedQuery<IAttendCaseParams,IAttendCaseResult>(attendCaseIR);


/** 'ResolveCase' parameters type */
export interface IResolveCaseParams {
  actorId: string;
  caseId: string;
  resolution: string;
  workspaceId: string;
}

/** 'ResolveCase' return type */
export interface IResolveCaseResult {
  id: string;
}

/** 'ResolveCase' query type */
export interface IResolveCaseQuery {
  params: IResolveCaseParams;
  result: IResolveCaseResult;
}

const resolveCaseIR: any = {"usedParamSet":{"resolution":true,"actorId":true,"workspaceId":true,"caseId":true},"params":[{"name":"resolution","required":true,"transform":{"type":"scalar"},"locs":[{"a":133,"b":144}]},{"name":"actorId","required":true,"transform":{"type":"scalar"},"locs":[{"a":174,"b":182},{"a":272,"b":280}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":375,"b":387}]},{"name":"caseId","required":true,"transform":{"type":"scalar"},"locs":[{"a":398,"b":405}]}],"statement":"-- Resolver una falla abierta la da por atendida por quien la resuelve.\nUPDATE incidents.cases\nSET status = 'resolved', resolution = :resolution!, resolved_by_principal_id = :actorId!, resolved_at = now(),\n    attended_by_principal_id = coalesce(attended_by_principal_id, :actorId!),\n    attended_at = coalesce(attended_at, now()), version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :caseId! AND status IN ('open', 'in_progress')\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- Resolver una falla abierta la da por atendida por quien la resuelve.
 * UPDATE incidents.cases
 * SET status = 'resolved', resolution = :resolution!, resolved_by_principal_id = :actorId!, resolved_at = now(),
 *     attended_by_principal_id = coalesce(attended_by_principal_id, :actorId!),
 *     attended_at = coalesce(attended_at, now()), version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :caseId! AND status IN ('open', 'in_progress')
 * RETURNING id
 * ```
 */
export const resolveCase = new PreparedQuery<IResolveCaseParams,IResolveCaseResult>(resolveCaseIR);


/** 'CloseCase' parameters type */
export interface ICloseCaseParams {
  actorId: string;
  caseId: string;
  workspaceId: string;
}

/** 'CloseCase' return type */
export interface ICloseCaseResult {
  id: string;
}

/** 'CloseCase' query type */
export interface ICloseCaseQuery {
  params: ICloseCaseParams;
  result: ICloseCaseResult;
}

const closeCaseIR: any = {"usedParamSet":{"actorId":true,"workspaceId":true,"caseId":true},"params":[{"name":"actorId","required":true,"transform":{"type":"scalar"},"locs":[{"a":71,"b":79}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":144,"b":156}]},{"name":"caseId","required":true,"transform":{"type":"scalar"},"locs":[{"a":167,"b":174}]}],"statement":"UPDATE incidents.cases\nSET status = 'closed', closed_by_principal_id = :actorId!, closed_at = now(), version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :caseId! AND status = 'resolved'\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE incidents.cases
 * SET status = 'closed', closed_by_principal_id = :actorId!, closed_at = now(), version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :caseId! AND status = 'resolved'
 * RETURNING id
 * ```
 */
export const closeCase = new PreparedQuery<ICloseCaseParams,ICloseCaseResult>(closeCaseIR);


