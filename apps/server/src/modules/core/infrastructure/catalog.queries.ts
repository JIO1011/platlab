/** Types generated for queries found in "src/modules/core/infrastructure/catalog.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'ListRoles' parameters type */
export type IListRolesParams = void;

/** 'ListRoles' return type */
export interface IListRolesResult {
  code: string;
}

/** 'ListRoles' query type */
export interface IListRolesQuery {
  params: IListRolesParams;
  result: IListRolesResult;
}

const listRolesIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT code FROM core.roles ORDER BY code"};

/**
 * Query generated from SQL:
 * ```
 * SELECT code FROM core.roles ORDER BY code
 * ```
 */
export const listRoles = new PreparedQuery<IListRolesParams,IListRolesResult>(listRolesIR);


/** 'ListPermissions' parameters type */
export type IListPermissionsParams = void;

/** 'ListPermissions' return type */
export interface IListPermissionsResult {
  code: string;
  module_code: string;
}

/** 'ListPermissions' query type */
export interface IListPermissionsQuery {
  params: IListPermissionsParams;
  result: IListPermissionsResult;
}

const listPermissionsIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT code, module_code FROM core.permissions ORDER BY code"};

/**
 * Query generated from SQL:
 * ```
 * SELECT code, module_code FROM core.permissions ORDER BY code
 * ```
 */
export const listPermissions = new PreparedQuery<IListPermissionsParams,IListPermissionsResult>(listPermissionsIR);


/** 'ListRolePermissions' parameters type */
export type IListRolePermissionsParams = void;

/** 'ListRolePermissions' return type */
export interface IListRolePermissionsResult {
  permission_code: string;
  role_code: string;
}

/** 'ListRolePermissions' query type */
export interface IListRolePermissionsQuery {
  params: IListRolePermissionsParams;
  result: IListRolePermissionsResult;
}

const listRolePermissionsIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT role_code, permission_code FROM core.role_permissions ORDER BY role_code, permission_code"};

/**
 * Query generated from SQL:
 * ```
 * SELECT role_code, permission_code FROM core.role_permissions ORDER BY role_code, permission_code
 * ```
 */
export const listRolePermissions = new PreparedQuery<IListRolePermissionsParams,IListRolePermissionsResult>(listRolePermissionsIR);


