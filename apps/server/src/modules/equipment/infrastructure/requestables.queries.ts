/** Types generated for queries found in "src/modules/equipment/infrastructure/requestables.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type stringArray = (string)[];

/** 'RequestableAssetTypes' parameters type */
export interface IRequestableAssetTypesParams {
  typeIds?: stringArray | null | void;
  workspaceId: string;
}

/** 'RequestableAssetTypes' return type */
export interface IRequestableAssetTypesResult {
  available: number;
  id: string;
  name: string;
}

/** 'RequestableAssetTypes' query type */
export interface IRequestableAssetTypesQuery {
  params: IRequestableAssetTypesParams;
  result: IRequestableAssetTypesResult;
}

const requestableAssetTypesIR: any = {"usedParamSet":{"workspaceId":true,"typeIds":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":349,"b":361}]},{"name":"typeIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":380,"b":387},{"a":426,"b":433}]}],"statement":"-- Con :typeIds, esos (aunque estén archivados, para validar una solicitud guardada); si no, los activos.\nSELECT\n  t.id,\n  t.name,\n  (SELECT count(*) FROM equipment.assets AS a\n    WHERE a.workspace_id = t.workspace_id AND a.type_id = t.id AND a.condition = 'operational')::int AS \"available!\"\nFROM equipment.asset_types AS t\nWHERE t.workspace_id = :workspaceId!\n  AND (CASE WHEN :typeIds::uuid[] IS NOT NULL THEN t.id = ANY (:typeIds::uuid[]) ELSE t.archived_at IS NULL END)\nORDER BY inventory.fold_text(t.name), t.id"};

/**
 * Query generated from SQL:
 * ```
 * -- Con :typeIds, esos (aunque estén archivados, para validar una solicitud guardada); si no, los activos.
 * SELECT
 *   t.id,
 *   t.name,
 *   (SELECT count(*) FROM equipment.assets AS a
 *     WHERE a.workspace_id = t.workspace_id AND a.type_id = t.id AND a.condition = 'operational')::int AS "available!"
 * FROM equipment.asset_types AS t
 * WHERE t.workspace_id = :workspaceId!
 *   AND (CASE WHEN :typeIds::uuid[] IS NOT NULL THEN t.id = ANY (:typeIds::uuid[]) ELSE t.archived_at IS NULL END)
 * ORDER BY inventory.fold_text(t.name), t.id
 * ```
 */
export const requestableAssetTypes = new PreparedQuery<IRequestableAssetTypesParams,IRequestableAssetTypesResult>(requestableAssetTypesIR);


/** 'OperationalAssetsOfTypes' parameters type */
export interface IOperationalAssetsOfTypesParams {
  typeIds: stringArray;
  workspaceId: string;
}

/** 'OperationalAssetsOfTypes' return type */
export interface IOperationalAssetsOfTypesResult {
  code: string;
  id: string;
  name: string;
  type_id: string;
}

/** 'OperationalAssetsOfTypes' query type */
export interface IOperationalAssetsOfTypesQuery {
  params: IOperationalAssetsOfTypesParams;
  result: IOperationalAssetsOfTypesResult;
}

const operationalAssetsOfTypesIR: any = {"usedParamSet":{"workspaceId":true,"typeIds":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":197,"b":209}]},{"name":"typeIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":232,"b":240}]}],"statement":"-- Los equipos operativos de esos tipos, para que Laboratorios aparte los libres en la franja de un bloque.\nSELECT a.id, a.type_id, a.code, a.name\nFROM equipment.assets AS a\nWHERE a.workspace_id = :workspaceId! AND a.type_id = ANY (:typeIds!::uuid[]) AND a.condition = 'operational'\nORDER BY a.type_id, a.code, a.id"};

/**
 * Query generated from SQL:
 * ```
 * -- Los equipos operativos de esos tipos, para que Laboratorios aparte los libres en la franja de un bloque.
 * SELECT a.id, a.type_id, a.code, a.name
 * FROM equipment.assets AS a
 * WHERE a.workspace_id = :workspaceId! AND a.type_id = ANY (:typeIds!::uuid[]) AND a.condition = 'operational'
 * ORDER BY a.type_id, a.code, a.id
 * ```
 */
export const operationalAssetsOfTypes = new PreparedQuery<IOperationalAssetsOfTypesParams,IOperationalAssetsOfTypesResult>(operationalAssetsOfTypesIR);


/** 'AssetCodes' parameters type */
export interface IAssetCodesParams {
  assetIds: stringArray;
  workspaceId: string;
}

/** 'AssetCodes' return type */
export interface IAssetCodesResult {
  code: string;
  id: string;
}

/** 'AssetCodes' query type */
export interface IAssetCodesQuery {
  params: IAssetCodesParams;
  result: IAssetCodesResult;
}

const assetCodesIR: any = {"usedParamSet":{"workspaceId":true,"assetIds":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":59,"b":71}]},{"name":"assetIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":87,"b":96}]}],"statement":"SELECT id, code\nFROM equipment.assets\nWHERE workspace_id = :workspaceId! AND id = ANY (:assetIds!::uuid[])"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id, code
 * FROM equipment.assets
 * WHERE workspace_id = :workspaceId! AND id = ANY (:assetIds!::uuid[])
 * ```
 */
export const assetCodes = new PreparedQuery<IAssetCodesParams,IAssetCodesResult>(assetCodesIR);


