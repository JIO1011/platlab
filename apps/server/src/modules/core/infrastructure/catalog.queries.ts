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


/** 'ListModuleDefinitions' parameters type */
export type IListModuleDefinitionsParams = void;

/** 'ListModuleDefinitions' return type */
export interface IListModuleDefinitionsResult {
  code: string;
  name: string;
  stage: string;
}

/** 'ListModuleDefinitions' query type */
export interface IListModuleDefinitionsQuery {
  params: IListModuleDefinitionsParams;
  result: IListModuleDefinitionsResult;
}

const listModuleDefinitionsIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT code, name, stage FROM core.module_definitions ORDER BY code"};

/**
 * Query generated from SQL:
 * ```
 * SELECT code, name, stage FROM core.module_definitions ORDER BY code
 * ```
 */
export const listModuleDefinitions = new PreparedQuery<IListModuleDefinitionsParams,IListModuleDefinitionsResult>(listModuleDefinitionsIR);


/** 'ListModuleDependencies' parameters type */
export type IListModuleDependenciesParams = void;

/** 'ListModuleDependencies' return type */
export interface IListModuleDependenciesResult {
  module_code: string;
  requires_code: string;
}

/** 'ListModuleDependencies' query type */
export interface IListModuleDependenciesQuery {
  params: IListModuleDependenciesParams;
  result: IListModuleDependenciesResult;
}

const listModuleDependenciesIR: any = {"usedParamSet":{},"params":[],"statement":"SELECT module_code, requires_code FROM core.module_dependencies ORDER BY module_code, requires_code"};

/**
 * Query generated from SQL:
 * ```
 * SELECT module_code, requires_code FROM core.module_dependencies ORDER BY module_code, requires_code
 * ```
 */
export const listModuleDependencies = new PreparedQuery<IListModuleDependenciesParams,IListModuleDependenciesResult>(listModuleDependenciesIR);


