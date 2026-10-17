/** Types generated for queries found in "src/modules/equipment/infrastructure/assets.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

export type stringArray = (string)[];

/** 'ListAssetTypes' parameters type */
export interface IListAssetTypesParams {
  workspaceId: string;
}

/** 'ListAssetTypes' return type */
export interface IListAssetTypesResult {
  id: string;
  name: string;
}

/** 'ListAssetTypes' query type */
export interface IListAssetTypesQuery {
  params: IListAssetTypesParams;
  result: IListAssetTypesResult;
}

const listAssetTypesIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":108,"b":120}]}],"statement":"-- En el orden del índice asset_types_name.\nSELECT id, name\nFROM equipment.asset_types\nWHERE workspace_id = :workspaceId! AND archived_at IS NULL\nORDER BY inventory.fold_text(name)"};

/**
 * Query generated from SQL:
 * ```
 * -- En el orden del índice asset_types_name.
 * SELECT id, name
 * FROM equipment.asset_types
 * WHERE workspace_id = :workspaceId! AND archived_at IS NULL
 * ORDER BY inventory.fold_text(name)
 * ```
 */
export const listAssetTypes = new PreparedQuery<IListAssetTypesParams,IListAssetTypesResult>(listAssetTypesIR);


/** 'InsertAssetType' parameters type */
export interface IInsertAssetTypeParams {
  name: string;
  workspaceId: string;
}

/** 'InsertAssetType' return type */
export interface IInsertAssetTypeResult {
  id: string;
  name: string;
}

/** 'InsertAssetType' query type */
export interface IInsertAssetTypeQuery {
  params: IInsertAssetTypeParams;
  result: IInsertAssetTypeResult;
}

const insertAssetTypeIR: any = {"usedParamSet":{"workspaceId":true,"name":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":160,"b":172}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":175,"b":180}]}],"statement":"-- Un nombre activo repetido (asset_types_name) no inserta nada: el comando responde NAME_TAKEN.\nINSERT INTO equipment.asset_types (workspace_id, name)\nVALUES (:workspaceId!, :name!)\nON CONFLICT (workspace_id, inventory.fold_text(name)) WHERE archived_at IS NULL DO NOTHING\nRETURNING id, name"};

/**
 * Query generated from SQL:
 * ```
 * -- Un nombre activo repetido (asset_types_name) no inserta nada: el comando responde NAME_TAKEN.
 * INSERT INTO equipment.asset_types (workspace_id, name)
 * VALUES (:workspaceId!, :name!)
 * ON CONFLICT (workspace_id, inventory.fold_text(name)) WHERE archived_at IS NULL DO NOTHING
 * RETURNING id, name
 * ```
 */
export const insertAssetType = new PreparedQuery<IInsertAssetTypeParams,IInsertAssetTypeResult>(insertAssetTypeIR);


/** 'ActiveTypeNamed' parameters type */
export interface IActiveTypeNamedParams {
  name: string;
  workspaceId: string;
}

/** 'ActiveTypeNamed' return type */
export interface IActiveTypeNamedResult {
  name: string;
}

/** 'ActiveTypeNamed' query type */
export interface IActiveTypeNamedQuery {
  params: IActiveTypeNamedParams;
  result: IActiveTypeNamedResult;
}

const activeTypeNamedIR: any = {"usedParamSet":{"workspaceId":true,"name":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":135,"b":147}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":227,"b":232}]}],"statement":"-- El tipo activo con el mismo nombre plegado, para nombrarlo en el error.\nSELECT name\nFROM equipment.asset_types\nWHERE workspace_id = :workspaceId! AND archived_at IS NULL\n  AND inventory.fold_text(name) = inventory.fold_text(:name!)"};

/**
 * Query generated from SQL:
 * ```
 * -- El tipo activo con el mismo nombre plegado, para nombrarlo en el error.
 * SELECT name
 * FROM equipment.asset_types
 * WHERE workspace_id = :workspaceId! AND archived_at IS NULL
 *   AND inventory.fold_text(name) = inventory.fold_text(:name!)
 * ```
 */
export const activeTypeNamed = new PreparedQuery<IActiveTypeNamedParams,IActiveTypeNamedResult>(activeTypeNamedIR);


/** 'ArchiveAssetType' parameters type */
export interface IArchiveAssetTypeParams {
  typeId: string;
  workspaceId: string;
}

/** 'ArchiveAssetType' return type */
export interface IArchiveAssetTypeResult {
  id: string;
  name: string;
}

/** 'ArchiveAssetType' query type */
export interface IArchiveAssetTypeQuery {
  params: IArchiveAssetTypeParams;
  result: IArchiveAssetTypeResult;
}

const archiveAssetTypeIR: any = {"usedParamSet":{"workspaceId":true,"typeId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":159,"b":171}]},{"name":"typeId","required":true,"transform":{"type":"scalar"},"locs":[{"a":182,"b":189}]}],"statement":"-- Los equipos de un tipo archivado lo conservan; solo deja de ofrecerse en el alta.\nUPDATE equipment.asset_types\nSET archived_at = now()\nWHERE workspace_id = :workspaceId! AND id = :typeId! AND archived_at IS NULL\nRETURNING id, name"};

/**
 * Query generated from SQL:
 * ```
 * -- Los equipos de un tipo archivado lo conservan; solo deja de ofrecerse en el alta.
 * UPDATE equipment.asset_types
 * SET archived_at = now()
 * WHERE workspace_id = :workspaceId! AND id = :typeId! AND archived_at IS NULL
 * RETURNING id, name
 * ```
 */
export const archiveAssetType = new PreparedQuery<IArchiveAssetTypeParams,IArchiveAssetTypeResult>(archiveAssetTypeIR);


/** 'AssetReferences' parameters type */
export interface IAssetReferencesParams {
  locationId?: string | null | void;
  responsibleId?: string | null | void;
  typeId?: string | null | void;
  workspaceId: string;
}

/** 'AssetReferences' return type */
export interface IAssetReferencesResult {
  location_ok: boolean;
  responsible_ok: boolean;
  type_ok: boolean;
}

/** 'AssetReferences' query type */
export interface IAssetReferencesQuery {
  params: IAssetReferencesParams;
  result: IAssetReferencesResult;
}

const assetReferencesIR: any = {"usedParamSet":{"typeId":true,"workspaceId":true,"locationId":true,"responsibleId":true},"params":[{"name":"typeId","required":false,"transform":{"type":"scalar"},"locs":[{"a":180,"b":186},{"a":302,"b":308}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":279,"b":291},{"a":459,"b":471},{"a":759,"b":771}]},{"name":"locationId","required":false,"transform":{"type":"scalar"},"locs":[{"a":363,"b":373},{"a":482,"b":492}]},{"name":"responsibleId","required":false,"transform":{"type":"scalar"},"locs":[{"a":551,"b":564},{"a":785,"b":798}]}],"statement":"-- Valida en un viaje las referencias de un alta o una edición; un parámetro nulo no se comprueba:\n-- tipo y ubicación activos del espacio, y responsable miembro activo.\nSELECT\n  (:typeId::uuid IS NULL OR EXISTS (\n    SELECT 1 FROM equipment.asset_types\n    WHERE workspace_id = :workspaceId! AND id = :typeId::uuid AND archived_at IS NULL\n  )) AS \"type_ok!\",\n  (:locationId::uuid IS NULL OR EXISTS (\n    SELECT 1 FROM core.locations\n    WHERE workspace_id = :workspaceId! AND id = :locationId::uuid AND archived_at IS NULL\n  )) AS \"location_ok!\",\n  (:responsibleId::uuid IS NULL OR EXISTS (\n    SELECT 1\n    FROM core.principals AS pr\n    JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\n    WHERE pr.workspace_id = :workspaceId! AND pr.id = :responsibleId::uuid AND pr.kind = 'member' AND m.status = 'active'\n  )) AS \"responsible_ok!\""};

/**
 * Query generated from SQL:
 * ```
 * -- Valida en un viaje las referencias de un alta o una edición; un parámetro nulo no se comprueba:
 * -- tipo y ubicación activos del espacio, y responsable miembro activo.
 * SELECT
 *   (:typeId::uuid IS NULL OR EXISTS (
 *     SELECT 1 FROM equipment.asset_types
 *     WHERE workspace_id = :workspaceId! AND id = :typeId::uuid AND archived_at IS NULL
 *   )) AS "type_ok!",
 *   (:locationId::uuid IS NULL OR EXISTS (
 *     SELECT 1 FROM core.locations
 *     WHERE workspace_id = :workspaceId! AND id = :locationId::uuid AND archived_at IS NULL
 *   )) AS "location_ok!",
 *   (:responsibleId::uuid IS NULL OR EXISTS (
 *     SELECT 1
 *     FROM core.principals AS pr
 *     JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
 *     WHERE pr.workspace_id = :workspaceId! AND pr.id = :responsibleId::uuid AND pr.kind = 'member' AND m.status = 'active'
 *   )) AS "responsible_ok!"
 * ```
 */
export const assetReferences = new PreparedQuery<IAssetReferencesParams,IAssetReferencesResult>(assetReferencesIR);


/** 'AssetCodesLike' parameters type */
export interface IAssetCodesLikeParams {
  base: string;
  workspaceId: string;
}

/** 'AssetCodesLike' return type */
export interface IAssetCodesLikeResult {
  code: string;
}

/** 'AssetCodesLike' query type */
export interface IAssetCodesLikeQuery {
  params: IAssetCodesLikeParams;
  result: IAssetCodesLikeResult;
}

const assetCodesLikeIR: any = {"usedParamSet":{"workspaceId":true,"base":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":121,"b":133}]},{"name":"base","required":true,"transform":{"type":"scalar"},"locs":[{"a":160,"b":165},{"a":202,"b":207}]}],"statement":"-- Códigos del espacio iguales al propuesto o con un sufijo «-N».\nSELECT code\nFROM equipment.assets\nWHERE workspace_id = :workspaceId! AND (lower(code) = lower(:base!) OR starts_with(lower(code), lower(:base!) || '-'))"};

/**
 * Query generated from SQL:
 * ```
 * -- Códigos del espacio iguales al propuesto o con un sufijo «-N».
 * SELECT code
 * FROM equipment.assets
 * WHERE workspace_id = :workspaceId! AND (lower(code) = lower(:base!) OR starts_with(lower(code), lower(:base!) || '-'))
 * ```
 */
export const assetCodesLike = new PreparedQuery<IAssetCodesLikeParams,IAssetCodesLikeResult>(assetCodesLikeIR);


/** 'AssetCodeTaken' parameters type */
export interface IAssetCodeTakenParams {
  code: string;
  exceptId: string;
  workspaceId: string;
}

/** 'AssetCodeTaken' return type */
export interface IAssetCodeTakenResult {
  code: string;
}

/** 'AssetCodeTaken' query type */
export interface IAssetCodeTakenQuery {
  params: IAssetCodeTakenParams;
  result: IAssetCodeTakenResult;
}

const assetCodeTakenIR: any = {"usedParamSet":{"workspaceId":true,"code":true,"exceptId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":55,"b":67}]},{"name":"code","required":true,"transform":{"type":"scalar"},"locs":[{"a":93,"b":98}]},{"name":"exceptId","required":true,"transform":{"type":"scalar"},"locs":[{"a":111,"b":120}]}],"statement":"SELECT code\nFROM equipment.assets\nWHERE workspace_id = :workspaceId! AND lower(code) = lower(:code!) AND id <> :exceptId!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT code
 * FROM equipment.assets
 * WHERE workspace_id = :workspaceId! AND lower(code) = lower(:code!) AND id <> :exceptId!
 * ```
 */
export const assetCodeTaken = new PreparedQuery<IAssetCodeTakenParams,IAssetCodeTakenResult>(assetCodeTakenIR);


/** 'ListResponsibles' parameters type */
export interface IListResponsiblesParams {
  workspaceId: string;
}

/** 'ListResponsibles' return type */
export interface IListResponsiblesResult {
  id: string;
  name: string;
}

/** 'ListResponsibles' query type */
export interface IListResponsiblesQuery {
  params: IListResponsiblesParams;
  result: IListResponsiblesResult;
}

const listResponsiblesIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":241,"b":253}]}],"statement":"SELECT pr.id, ident.display_name AS name\nFROM core.principals AS pr\nJOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\nJOIN core.identities AS ident ON ident.id = m.identity_id\nWHERE pr.workspace_id = :workspaceId! AND pr.kind = 'member' AND m.status = 'active'\nORDER BY inventory.fold_text(ident.display_name), pr.id"};

/**
 * Query generated from SQL:
 * ```
 * SELECT pr.id, ident.display_name AS name
 * FROM core.principals AS pr
 * JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
 * JOIN core.identities AS ident ON ident.id = m.identity_id
 * WHERE pr.workspace_id = :workspaceId! AND pr.kind = 'member' AND m.status = 'active'
 * ORDER BY inventory.fold_text(ident.display_name), pr.id
 * ```
 */
export const listResponsibles = new PreparedQuery<IListResponsiblesParams,IListResponsiblesResult>(listResponsiblesIR);


/** 'InsertAsset' parameters type */
export interface IInsertAssetParams {
  acquiredOn?: string | null | void;
  brand?: string | null | void;
  code: string;
  condition: string;
  conservation?: string | null | void;
  createdBy: string;
  locationId: string;
  model?: string | null | void;
  name: string;
  powerSupply?: string | null | void;
  replacementValue?: string | null | void;
  responsibleId?: string | null | void;
  serialNumber?: string | null | void;
  supplier?: string | null | void;
  typeId: string;
  usefulLifeYears?: number | null | void;
  warrantyUntil?: string | null | void;
  workspaceId: string;
}

/** 'InsertAsset' return type */
export interface IInsertAssetResult {
  id: string;
}

/** 'InsertAsset' query type */
export interface IInsertAssetQuery {
  params: IInsertAssetParams;
  result: IInsertAssetResult;
}

const insertAssetIR: any = {"usedParamSet":{"workspaceId":true,"typeId":true,"code":true,"name":true,"brand":true,"model":true,"serialNumber":true,"powerSupply":true,"locationId":true,"responsibleId":true,"condition":true,"conservation":true,"supplier":true,"acquiredOn":true,"warrantyUntil":true,"usefulLifeYears":true,"replacementValue":true,"createdBy":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":378,"b":390}]},{"name":"typeId","required":true,"transform":{"type":"scalar"},"locs":[{"a":393,"b":400}]},{"name":"code","required":true,"transform":{"type":"scalar"},"locs":[{"a":403,"b":408}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":411,"b":416}]},{"name":"brand","required":false,"transform":{"type":"scalar"},"locs":[{"a":419,"b":424}]},{"name":"model","required":false,"transform":{"type":"scalar"},"locs":[{"a":427,"b":432}]},{"name":"serialNumber","required":false,"transform":{"type":"scalar"},"locs":[{"a":435,"b":447}]},{"name":"powerSupply","required":false,"transform":{"type":"scalar"},"locs":[{"a":450,"b":461}]},{"name":"locationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":464,"b":475}]},{"name":"responsibleId","required":false,"transform":{"type":"scalar"},"locs":[{"a":480,"b":493}]},{"name":"condition","required":true,"transform":{"type":"scalar"},"locs":[{"a":496,"b":506}]},{"name":"conservation","required":false,"transform":{"type":"scalar"},"locs":[{"a":509,"b":521}]},{"name":"supplier","required":false,"transform":{"type":"scalar"},"locs":[{"a":524,"b":532}]},{"name":"acquiredOn","required":false,"transform":{"type":"scalar"},"locs":[{"a":535,"b":545}]},{"name":"warrantyUntil","required":false,"transform":{"type":"scalar"},"locs":[{"a":554,"b":567}]},{"name":"usefulLifeYears","required":false,"transform":{"type":"scalar"},"locs":[{"a":578,"b":593}]},{"name":"replacementValue","required":false,"transform":{"type":"scalar"},"locs":[{"a":605,"b":621}]},{"name":"createdBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":633,"b":643}]}],"statement":"-- Un código repetido (assets_code) no inserta nada: el comando responde CODE_TAKEN.\nINSERT INTO equipment.assets (\n  workspace_id, type_id, code, name, brand, model, serial_number, power_supply, location_id,\n  responsible_principal_id, condition, conservation, supplier, acquired_on, warranty_until,\n  useful_life_years, replacement_value, created_by_principal_id\n) VALUES (\n  :workspaceId!, :typeId!, :code!, :name!, :brand, :model, :serialNumber, :powerSupply, :locationId!,\n  :responsibleId, :condition!, :conservation, :supplier, :acquiredOn::date, :warrantyUntil::date,\n  :usefulLifeYears::integer, :replacementValue::numeric, :createdBy!\n)\nON CONFLICT (workspace_id, lower(code)) DO NOTHING\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- Un código repetido (assets_code) no inserta nada: el comando responde CODE_TAKEN.
 * INSERT INTO equipment.assets (
 *   workspace_id, type_id, code, name, brand, model, serial_number, power_supply, location_id,
 *   responsible_principal_id, condition, conservation, supplier, acquired_on, warranty_until,
 *   useful_life_years, replacement_value, created_by_principal_id
 * ) VALUES (
 *   :workspaceId!, :typeId!, :code!, :name!, :brand, :model, :serialNumber, :powerSupply, :locationId!,
 *   :responsibleId, :condition!, :conservation, :supplier, :acquiredOn::date, :warrantyUntil::date,
 *   :usefulLifeYears::integer, :replacementValue::numeric, :createdBy!
 * )
 * ON CONFLICT (workspace_id, lower(code)) DO NOTHING
 * RETURNING id
 * ```
 */
export const insertAsset = new PreparedQuery<IInsertAssetParams,IInsertAssetResult>(insertAssetIR);


/** 'LockAsset' parameters type */
export interface ILockAssetParams {
  assetId: string;
  workspaceId: string;
}

/** 'LockAsset' return type */
export interface ILockAssetResult {
  acquired_on: string | null;
  brand: string | null;
  code: string;
  condition: string;
  conservation: string | null;
  id: string;
  location_id: string;
  model: string | null;
  name: string;
  photo_id: string | null;
  power_supply: string | null;
  replacement_value: string | null;
  responsible_principal_id: string | null;
  serial_number: string | null;
  supplier: string | null;
  type_id: string;
  useful_life_years: number | null;
  warranty_until: string | null;
}

/** 'LockAsset' query type */
export interface ILockAssetQuery {
  params: ILockAssetParams;
  result: ILockAssetResult;
}

const lockAssetIR: any = {"usedParamSet":{"workspaceId":true,"assetId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":410,"b":422}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":433,"b":441}]}],"statement":"-- Lo último del orden de bloqueo (02 §6): el equipo, después de espacio, derecho y membresía.\nSELECT id, code, name, type_id, brand, model, serial_number, power_supply, location_id,\n       responsible_principal_id, condition, conservation, supplier, acquired_on, warranty_until,\n       useful_life_years, trim_scale(replacement_value) AS replacement_value, photo_id\nFROM equipment.assets\nWHERE workspace_id = :workspaceId! AND id = :assetId!\nFOR UPDATE"};

/**
 * Query generated from SQL:
 * ```
 * -- Lo último del orden de bloqueo (02 §6): el equipo, después de espacio, derecho y membresía.
 * SELECT id, code, name, type_id, brand, model, serial_number, power_supply, location_id,
 *        responsible_principal_id, condition, conservation, supplier, acquired_on, warranty_until,
 *        useful_life_years, trim_scale(replacement_value) AS replacement_value, photo_id
 * FROM equipment.assets
 * WHERE workspace_id = :workspaceId! AND id = :assetId!
 * FOR UPDATE
 * ```
 */
export const lockAsset = new PreparedQuery<ILockAssetParams,ILockAssetResult>(lockAssetIR);


/** 'UpdateAssetFields' parameters type */
export interface IUpdateAssetFieldsParams {
  acquiredOn?: string | null | void;
  assetId: string;
  brand?: string | null | void;
  code: string;
  conservation?: string | null | void;
  model?: string | null | void;
  name: string;
  powerSupply?: string | null | void;
  replacementValue?: string | null | void;
  responsibleId?: string | null | void;
  serialNumber?: string | null | void;
  supplier?: string | null | void;
  typeId: string;
  usefulLifeYears?: number | null | void;
  warrantyUntil?: string | null | void;
  workspaceId: string;
}

/** 'UpdateAssetFields' return type */
export interface IUpdateAssetFieldsResult {
  id: string;
}

/** 'UpdateAssetFields' query type */
export interface IUpdateAssetFieldsQuery {
  params: IUpdateAssetFieldsParams;
  result: IUpdateAssetFieldsResult;
}

const updateAssetFieldsIR: any = {"usedParamSet":{"typeId":true,"code":true,"name":true,"brand":true,"model":true,"serialNumber":true,"powerSupply":true,"responsibleId":true,"conservation":true,"supplier":true,"acquiredOn":true,"warrantyUntil":true,"usefulLifeYears":true,"replacementValue":true,"workspaceId":true,"assetId":true},"params":[{"name":"typeId","required":true,"transform":{"type":"scalar"},"locs":[{"a":117,"b":124}]},{"name":"code","required":true,"transform":{"type":"scalar"},"locs":[{"a":134,"b":139}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":149,"b":154}]},{"name":"brand","required":false,"transform":{"type":"scalar"},"locs":[{"a":165,"b":170}]},{"name":"model","required":false,"transform":{"type":"scalar"},"locs":[{"a":181,"b":186}]},{"name":"serialNumber","required":false,"transform":{"type":"scalar"},"locs":[{"a":209,"b":221}]},{"name":"powerSupply","required":false,"transform":{"type":"scalar"},"locs":[{"a":239,"b":250}]},{"name":"responsibleId","required":false,"transform":{"type":"scalar"},"locs":[{"a":280,"b":293}]},{"name":"conservation","required":false,"transform":{"type":"scalar"},"locs":[{"a":315,"b":327}]},{"name":"supplier","required":false,"transform":{"type":"scalar"},"locs":[{"a":341,"b":349}]},{"name":"acquiredOn","required":false,"transform":{"type":"scalar"},"locs":[{"a":366,"b":376}]},{"name":"warrantyUntil","required":false,"transform":{"type":"scalar"},"locs":[{"a":406,"b":419}]},{"name":"usefulLifeYears","required":false,"transform":{"type":"scalar"},"locs":[{"a":448,"b":463}]},{"name":"replacementValue","required":false,"transform":{"type":"scalar"},"locs":[{"a":499,"b":515}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":570,"b":582}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":593,"b":601}]}],"statement":"-- Escribe la ficha ya combinada; el comando la edita con el equipo bloqueado.\nUPDATE equipment.assets\nSET type_id = :typeId!, code = :code!, name = :name!, brand = :brand, model = :model,\n    serial_number = :serialNumber, power_supply = :powerSupply, responsible_principal_id = :responsibleId,\n    conservation = :conservation, supplier = :supplier, acquired_on = :acquiredOn::date,\n    warranty_until = :warrantyUntil::date, useful_life_years = :usefulLifeYears::integer,\n    replacement_value = :replacementValue::numeric, version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :assetId!\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- Escribe la ficha ya combinada; el comando la edita con el equipo bloqueado.
 * UPDATE equipment.assets
 * SET type_id = :typeId!, code = :code!, name = :name!, brand = :brand, model = :model,
 *     serial_number = :serialNumber, power_supply = :powerSupply, responsible_principal_id = :responsibleId,
 *     conservation = :conservation, supplier = :supplier, acquired_on = :acquiredOn::date,
 *     warranty_until = :warrantyUntil::date, useful_life_years = :usefulLifeYears::integer,
 *     replacement_value = :replacementValue::numeric, version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :assetId!
 * RETURNING id
 * ```
 */
export const updateAssetFields = new PreparedQuery<IUpdateAssetFieldsParams,IUpdateAssetFieldsResult>(updateAssetFieldsIR);


/** 'ChangeAssetCondition' parameters type */
export interface IChangeAssetConditionParams {
  actorId: string;
  assetId: string;
  caseId?: string | null | void;
  fromCondition: string;
  reason: string;
  result?: string | null | void;
  toCondition: string;
  workspaceId: string;
}

/** 'ChangeAssetCondition' return type */
export interface IChangeAssetConditionResult {
  id: string;
}

/** 'ChangeAssetCondition' query type */
export interface IChangeAssetConditionQuery {
  params: IChangeAssetConditionParams;
  result: IChangeAssetConditionResult;
}

const changeAssetConditionIR: any = {"usedParamSet":{"workspaceId":true,"assetId":true,"fromCondition":true,"toCondition":true,"reason":true,"result":true,"actorId":true,"caseId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":341,"b":353},{"a":600,"b":612}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":356,"b":364}]},{"name":"fromCondition","required":true,"transform":{"type":"scalar"},"locs":[{"a":367,"b":381}]},{"name":"toCondition","required":true,"transform":{"type":"scalar"},"locs":[{"a":384,"b":396}]},{"name":"reason","required":true,"transform":{"type":"scalar"},"locs":[{"a":399,"b":406}]},{"name":"result","required":false,"transform":{"type":"scalar"},"locs":[{"a":409,"b":415}]},{"name":"actorId","required":true,"transform":{"type":"scalar"},"locs":[{"a":418,"b":426}]},{"name":"caseId","required":false,"transform":{"type":"scalar"},"locs":[{"a":429,"b":435}]}],"statement":"-- Una sentencia: la fila del historial y la condición del equipo, ya bloqueado por el comando. Con\n-- :caseId, la falla que causó el cambio (reportarla o resolverla).\nWITH change AS (\n  INSERT INTO equipment.condition_changes\n    (workspace_id, asset_id, from_condition, to_condition, reason, result, actor_principal_id, case_id)\n  VALUES (:workspaceId!, :assetId!, :fromCondition!, :toCondition!, :reason!, :result, :actorId!, :caseId)\n  RETURNING asset_id, to_condition\n)\nUPDATE equipment.assets AS a\nSET condition = change.to_condition, version = a.version + 1\nFROM change\nWHERE a.workspace_id = :workspaceId! AND a.id = change.asset_id\nRETURNING a.id"};

/**
 * Query generated from SQL:
 * ```
 * -- Una sentencia: la fila del historial y la condición del equipo, ya bloqueado por el comando. Con
 * -- :caseId, la falla que causó el cambio (reportarla o resolverla).
 * WITH change AS (
 *   INSERT INTO equipment.condition_changes
 *     (workspace_id, asset_id, from_condition, to_condition, reason, result, actor_principal_id, case_id)
 *   VALUES (:workspaceId!, :assetId!, :fromCondition!, :toCondition!, :reason!, :result, :actorId!, :caseId)
 *   RETURNING asset_id, to_condition
 * )
 * UPDATE equipment.assets AS a
 * SET condition = change.to_condition, version = a.version + 1
 * FROM change
 * WHERE a.workspace_id = :workspaceId! AND a.id = change.asset_id
 * RETURNING a.id
 * ```
 */
export const changeAssetCondition = new PreparedQuery<IChangeAssetConditionParams,IChangeAssetConditionResult>(changeAssetConditionIR);


/** 'MoveAsset' parameters type */
export interface IMoveAssetParams {
  actorId: string;
  assetId: string;
  fromLocationId: string;
  note?: string | null | void;
  toLocationId: string;
  workspaceId: string;
}

/** 'MoveAsset' return type */
export interface IMoveAssetResult {
  id: string;
}

/** 'MoveAsset' query type */
export interface IMoveAssetQuery {
  params: IMoveAssetParams;
  result: IMoveAssetResult;
}

const moveAssetIR: any = {"usedParamSet":{"workspaceId":true,"toLocationId":true,"assetId":true,"fromLocationId":true,"note":true,"actorId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":265,"b":277},{"a":481,"b":493},{"a":765,"b":777}]},{"name":"toLocationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":288,"b":301}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":502,"b":510}]},{"name":"fromLocationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":519,"b":534}]},{"name":"note","required":false,"transform":{"type":"scalar"},"locs":[{"a":554,"b":558}]},{"name":"actorId","required":true,"transform":{"type":"scalar"},"locs":[{"a":567,"b":575}]}],"statement":"-- Una sentencia: el destino debe ser una ubicación activa del espacio; deja el traslado en el\n-- historial y mueve el equipo, ya bloqueado por el comando. Sin fila, el destino no es válido.\nWITH target AS (\n  SELECT id\n  FROM core.locations\n  WHERE workspace_id = :workspaceId! AND id = :toLocationId! AND archived_at IS NULL\n), change AS (\n  INSERT INTO equipment.location_changes\n    (workspace_id, asset_id, from_location_id, to_location_id, note, actor_principal_id)\n  SELECT :workspaceId!::uuid, :assetId!::uuid, :fromLocationId!::uuid, target.id, :note::text, :actorId!::uuid\n  FROM target\n  RETURNING asset_id, to_location_id\n)\nUPDATE equipment.assets AS a\nSET location_id = change.to_location_id, version = a.version + 1\nFROM change\nWHERE a.workspace_id = :workspaceId! AND a.id = change.asset_id\nRETURNING a.id"};

/**
 * Query generated from SQL:
 * ```
 * -- Una sentencia: el destino debe ser una ubicación activa del espacio; deja el traslado en el
 * -- historial y mueve el equipo, ya bloqueado por el comando. Sin fila, el destino no es válido.
 * WITH target AS (
 *   SELECT id
 *   FROM core.locations
 *   WHERE workspace_id = :workspaceId! AND id = :toLocationId! AND archived_at IS NULL
 * ), change AS (
 *   INSERT INTO equipment.location_changes
 *     (workspace_id, asset_id, from_location_id, to_location_id, note, actor_principal_id)
 *   SELECT :workspaceId!::uuid, :assetId!::uuid, :fromLocationId!::uuid, target.id, :note::text, :actorId!::uuid
 *   FROM target
 *   RETURNING asset_id, to_location_id
 * )
 * UPDATE equipment.assets AS a
 * SET location_id = change.to_location_id, version = a.version + 1
 * FROM change
 * WHERE a.workspace_id = :workspaceId! AND a.id = change.asset_id
 * RETURNING a.id
 * ```
 */
export const moveAsset = new PreparedQuery<IMoveAssetParams,IMoveAssetResult>(moveAssetIR);


/** 'InsertAssetPhoto' parameters type */
export interface IInsertAssetPhotoParams {
  assetId: string;
  byteSize: number;
  contentType: string;
  id: string;
  objectPath: string;
  sha256: string;
  uploadedBy: string;
  url: string;
  workspaceId: string;
}

/** 'InsertAssetPhoto' return type */
export interface IInsertAssetPhotoResult {
  id: string;
}

/** 'InsertAssetPhoto' query type */
export interface IInsertAssetPhotoQuery {
  params: IInsertAssetPhotoParams;
  result: IInsertAssetPhotoResult;
}

const insertAssetPhotoIR: any = {"usedParamSet":{"workspaceId":true,"id":true,"assetId":true,"objectPath":true,"url":true,"contentType":true,"byteSize":true,"sha256":true,"uploadedBy":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":218,"b":230}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":233,"b":236}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":239,"b":247}]},{"name":"objectPath","required":true,"transform":{"type":"scalar"},"locs":[{"a":250,"b":261}]},{"name":"url","required":true,"transform":{"type":"scalar"},"locs":[{"a":264,"b":268}]},{"name":"contentType","required":true,"transform":{"type":"scalar"},"locs":[{"a":271,"b":283}]},{"name":"byteSize","required":true,"transform":{"type":"scalar"},"locs":[{"a":286,"b":295}]},{"name":"sha256","required":true,"transform":{"type":"scalar"},"locs":[{"a":298,"b":305}]},{"name":"uploadedBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":308,"b":319}]}],"statement":"-- Una foto subida (ADR 0019): fila nueva, nunca reemplaza otra.\nINSERT INTO equipment.asset_photos\n  (workspace_id, id, asset_id, object_path, url, content_type, byte_size, sha256, uploaded_by_principal_id)\nVALUES\n  (:workspaceId!, :id!, :assetId!, :objectPath!, :url!, :contentType!, :byteSize!, :sha256!, :uploadedBy!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- Una foto subida (ADR 0019): fila nueva, nunca reemplaza otra.
 * INSERT INTO equipment.asset_photos
 *   (workspace_id, id, asset_id, object_path, url, content_type, byte_size, sha256, uploaded_by_principal_id)
 * VALUES
 *   (:workspaceId!, :id!, :assetId!, :objectPath!, :url!, :contentType!, :byteSize!, :sha256!, :uploadedBy!)
 * RETURNING id
 * ```
 */
export const insertAssetPhoto = new PreparedQuery<IInsertAssetPhotoParams,IInsertAssetPhotoResult>(insertAssetPhotoIR);


/** 'PointAssetPhoto' parameters type */
export interface IPointAssetPhotoParams {
  assetId: string;
  photoId: string;
  workspaceId: string;
}

/** 'PointAssetPhoto' return type */
export interface IPointAssetPhotoResult {
  id: string;
}

/** 'PointAssetPhoto' query type */
export interface IPointAssetPhotoQuery {
  params: IPointAssetPhotoParams;
  result: IPointAssetPhotoResult;
}

const pointAssetPhotoIR: any = {"usedParamSet":{"photoId":true,"workspaceId":true,"assetId":true},"params":[{"name":"photoId","required":true,"transform":{"type":"scalar"},"locs":[{"a":117,"b":125}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":171,"b":183}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":194,"b":202}]}],"statement":"-- La foto pasa a ser la vigente; la anterior queda en el historial de fotos.\nUPDATE equipment.assets\nSET photo_id = :photoId!, version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :assetId!\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- La foto pasa a ser la vigente; la anterior queda en el historial de fotos.
 * UPDATE equipment.assets
 * SET photo_id = :photoId!, version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :assetId!
 * RETURNING id
 * ```
 */
export const pointAssetPhoto = new PreparedQuery<IPointAssetPhotoParams,IPointAssetPhotoResult>(pointAssetPhotoIR);


/** 'ListAssets' parameters type */
export interface IListAssetsParams {
  afterCode?: string | null | void;
  assetId?: string | null | void;
  conditions?: stringArray | null | void;
  conservations?: stringArray | null | void;
  limit: NumberOrString;
  locationIds?: stringArray | null | void;
  q?: string | null | void;
  responsibleIds?: stringArray | null | void;
  today?: string | null | void;
  typeIds?: stringArray | null | void;
  usefulLives?: stringArray | null | void;
  warranties?: stringArray | null | void;
  warrantyHorizon?: string | null | void;
  withoutConservation?: boolean | null | void;
  withoutResponsible?: boolean | null | void;
  workspaceId: string;
}

/** 'ListAssets' return type */
export interface IListAssetsResult {
  acquired_on: string | null;
  availability: string;
  brand: string | null;
  code: string;
  condition: string;
  conservation: string | null;
  created_at: Date;
  id: string;
  location_area_id: string;
  location_code: string;
  location_id: string;
  location_name: string;
  location_path: stringArray;
  model: string | null;
  name: string;
  photo_url: string | null;
  power_supply: string | null;
  replacement_value: string | null;
  responsible_name: string | null;
  responsible_principal_id: string | null;
  serial_number: string | null;
  sort_code: string;
  supplier: string | null;
  type_id: string;
  type_name: string;
  useful_life_years: number | null;
  warranty_until: string | null;
}

/** 'ListAssets' query type */
export interface IListAssetsQuery {
  params: IListAssetsParams;
  result: IListAssetsResult;
}

const listAssetsIR: any = {"usedParamSet":{"q":true,"workspaceId":true,"locationIds":true,"assetId":true,"conditions":true,"typeIds":true,"responsibleIds":true,"withoutResponsible":true,"conservations":true,"withoutConservation":true,"warranties":true,"today":true,"warrantyHorizon":true,"usefulLives":true,"afterCode":true,"limit":true},"params":[{"name":"q","required":false,"transform":{"type":"scalar"},"locs":[{"a":783,"b":784}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":976,"b":988},{"a":1157,"b":1169},{"a":1553,"b":1565},{"a":3185,"b":3197},{"a":3405,"b":3417},{"a":4595,"b":4607},{"a":4679,"b":4691},{"a":4824,"b":4836},{"a":4928,"b":4940},{"a":5206,"b":5218}]},{"name":"locationIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":1006,"b":1017},{"a":1892,"b":1903}]},{"name":"assetId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1576,"b":1583},{"a":1609,"b":1616},{"a":1691,"b":1698}]},{"name":"conditions","required":false,"transform":{"type":"scalar"},"locs":[{"a":1644,"b":1654},{"a":1784,"b":1794}]},{"name":"typeIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":1819,"b":1826},{"a":1864,"b":1871}]},{"name":"responsibleIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":1974,"b":1988},{"a":2106,"b":2120}]},{"name":"withoutResponsible","required":false,"transform":{"type":"scalar"},"locs":[{"a":2023,"b":2041},{"a":2153,"b":2171}]},{"name":"conservations","required":false,"transform":{"type":"scalar"},"locs":[{"a":2240,"b":2253},{"a":2360,"b":2373}]},{"name":"withoutConservation","required":false,"transform":{"type":"scalar"},"locs":[{"a":2288,"b":2307},{"a":2406,"b":2425}]},{"name":"warranties","required":false,"transform":{"type":"scalar"},"locs":[{"a":2482,"b":2492},{"a":2610,"b":2620}]},{"name":"today","required":false,"transform":{"type":"scalar"},"locs":[{"a":2565,"b":2570},{"a":2746,"b":2751}]},{"name":"warrantyHorizon","required":false,"transform":{"type":"scalar"},"locs":[{"a":2579,"b":2594}]},{"name":"usefulLives","required":false,"transform":{"type":"scalar"},"locs":[{"a":2641,"b":2652},{"a":2767,"b":2778}]},{"name":"afterCode","required":false,"transform":{"type":"scalar"},"locs":[{"a":2869,"b":2878},{"a":2913,"b":2922}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":2964,"b":2970}]}],"statement":"-- Primero la página, del índice assets_code (espacio y código en minúsculas, que también es el\n-- cursor), y después, solo para sus filas, tipo, ubicación con sus niveles y responsable. Con\n-- :assetId, la ficha de un equipo (también dado de baja). Sin :conditions, los dados de baja no\n-- aparecen. :locationIds incluye sus niveles inferiores. Responsable y estado físico admiten «sin dato»\n-- (:withoutResponsible, :withoutConservation); garantía y vida útil se miden a :today (E-01c). :q busca en\n-- search_text, plegado al escribir; `\\`, `%` y `_` se escapan con `\\` (chr(92), porque PgTyped no admite\n-- `\\` en un literal). assetTotals repite estos filtros: un cambio aquí va también allí.\nWITH RECURSIVE search AS (\n  SELECT '%' || replace(replace(replace(inventory.fold_text(:q::text),\n           chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern\n), scope AS (\n  SELECT l.id\n  FROM core.locations AS l\n  WHERE l.workspace_id = :workspaceId! AND l.id = ANY (:locationIds::uuid[])\n  UNION\n  SELECT child.id\n  FROM core.locations AS child\n  JOIN scope ON child.parent_id = scope.id\n  WHERE child.workspace_id = :workspaceId!\n), page AS (\n  SELECT a.id, a.code, a.name, a.type_id, a.brand, a.model, a.serial_number, a.power_supply, a.location_id,\n         a.responsible_principal_id, a.condition, a.conservation, a.supplier, a.acquired_on, a.warranty_until,\n         a.useful_life_years, a.replacement_value, a.photo_id, a.created_at\n  FROM equipment.assets AS a\n  CROSS JOIN search\n  WHERE a.workspace_id = :workspaceId!\n    AND (:assetId::uuid IS NULL OR a.id = :assetId::uuid)\n    AND (CASE WHEN :conditions::text[] IS NULL\n              THEN :assetId::uuid IS NOT NULL OR a.condition <> 'retired'\n              ELSE a.condition = ANY (:conditions::text[]) END)\n    AND (:typeIds::uuid[] IS NULL OR a.type_id = ANY (:typeIds::uuid[]))\n    AND (:locationIds::uuid[] IS NULL OR a.location_id IN (SELECT id FROM scope))\n    AND (:responsibleIds::uuid[] IS NULL AND NOT coalesce(:withoutResponsible::boolean, false)\n         OR a.responsible_principal_id = ANY (:responsibleIds::uuid[])\n         OR (coalesce(:withoutResponsible::boolean, false) AND a.responsible_principal_id IS NULL))\n    AND (:conservations::text[] IS NULL AND NOT coalesce(:withoutConservation::boolean, false)\n         OR a.conservation = ANY (:conservations::text[])\n         OR (coalesce(:withoutConservation::boolean, false) AND a.conservation IS NULL))\n    AND (:warranties::text[] IS NULL\n         OR equipment.warranty_state(a.warranty_until, :today::date, :warrantyHorizon::date) = ANY (:warranties::text[]))\n    AND (:usefulLives::text[] IS NULL\n         OR equipment.useful_life_state(a.acquired_on, a.useful_life_years, :today::date) = ANY (:usefulLives::text[]))\n    AND (search.pattern IS NULL OR a.search_text LIKE search.pattern)\n    AND (:afterCode::text IS NULL OR lower(a.code) > :afterCode::text)\n  ORDER BY lower(a.code)\n  LIMIT :limit!\n), up AS (\n  -- Niveles de cada ubicación de la página, hasta 6 hacia la raíz.\n  SELECT loc.id AS location_id, loc.parent_id, loc.kind, loc.name, 0 AS depth\n  FROM core.locations AS loc\n  WHERE loc.workspace_id = :workspaceId! AND loc.id IN (SELECT location_id FROM page)\n  UNION ALL\n  SELECT up.location_id, parent.parent_id, parent.kind, parent.name, up.depth + 1\n  FROM up\n  JOIN core.locations AS parent ON parent.workspace_id = :workspaceId! AND parent.id = up.parent_id\n  WHERE up.depth < 5\n), paths AS (\n  -- Desde el primer nivel bajo la sede (sin ella, salvo que sea la propia).\n  SELECT location_id, array_agg(name ORDER BY depth DESC) FILTER (WHERE depth = 0 OR kind <> 'site') AS path\n  FROM up\n  GROUP BY location_id\n)\nSELECT\n  p.id,\n  p.code,\n  lower(p.code) AS \"sort_code!\",\n  p.name,\n  t.id AS type_id,\n  t.name AS type_name,\n  p.brand,\n  p.model,\n  p.serial_number,\n  p.power_supply,\n  loc.id AS location_id,\n  loc.code AS location_code,\n  loc.name AS location_name,\n  paths.path AS \"location_path!\",\n  area.area_id AS \"location_area_id!\",\n  p.responsible_principal_id,\n  ident.display_name AS \"responsible_name?\",\n  p.condition,\n  p.conservation,\n  -- Disponibilidad calculada (ADR 0019): préstamo, mantenimiento y reservas llegan con su entrega.\n  CASE WHEN p.condition IN ('operational', 'restricted') THEN 'available' ELSE 'unavailable' END AS \"availability!\",\n  p.supplier,\n  p.acquired_on,\n  p.warranty_until,\n  p.useful_life_years,\n  trim_scale(p.replacement_value) AS replacement_value,\n  photo.url AS \"photo_url?\",\n  p.created_at\nFROM page AS p\nJOIN equipment.asset_types AS t ON t.workspace_id = :workspaceId! AND t.id = p.type_id\nJOIN core.locations AS loc ON loc.workspace_id = :workspaceId! AND loc.id = p.location_id\nJOIN paths ON paths.location_id = p.location_id\nJOIN core.location_areas AS area ON area.workspace_id = :workspaceId! AND area.location_id = p.location_id\nLEFT JOIN core.principals AS pr ON pr.workspace_id = :workspaceId! AND pr.id = p.responsible_principal_id\nLEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\nLEFT JOIN core.identities AS ident ON ident.id = m.identity_id\nLEFT JOIN equipment.asset_photos AS photo ON photo.workspace_id = :workspaceId! AND photo.id = p.photo_id\nORDER BY lower(p.code)"};

/**
 * Query generated from SQL:
 * ```
 * -- Primero la página, del índice assets_code (espacio y código en minúsculas, que también es el
 * -- cursor), y después, solo para sus filas, tipo, ubicación con sus niveles y responsable. Con
 * -- :assetId, la ficha de un equipo (también dado de baja). Sin :conditions, los dados de baja no
 * -- aparecen. :locationIds incluye sus niveles inferiores. Responsable y estado físico admiten «sin dato»
 * -- (:withoutResponsible, :withoutConservation); garantía y vida útil se miden a :today (E-01c). :q busca en
 * -- search_text, plegado al escribir; `\`, `%` y `_` se escapan con `\` (chr(92), porque PgTyped no admite
 * -- `\` en un literal). assetTotals repite estos filtros: un cambio aquí va también allí.
 * WITH RECURSIVE search AS (
 *   SELECT '%' || replace(replace(replace(inventory.fold_text(:q::text),
 *            chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern
 * ), scope AS (
 *   SELECT l.id
 *   FROM core.locations AS l
 *   WHERE l.workspace_id = :workspaceId! AND l.id = ANY (:locationIds::uuid[])
 *   UNION
 *   SELECT child.id
 *   FROM core.locations AS child
 *   JOIN scope ON child.parent_id = scope.id
 *   WHERE child.workspace_id = :workspaceId!
 * ), page AS (
 *   SELECT a.id, a.code, a.name, a.type_id, a.brand, a.model, a.serial_number, a.power_supply, a.location_id,
 *          a.responsible_principal_id, a.condition, a.conservation, a.supplier, a.acquired_on, a.warranty_until,
 *          a.useful_life_years, a.replacement_value, a.photo_id, a.created_at
 *   FROM equipment.assets AS a
 *   CROSS JOIN search
 *   WHERE a.workspace_id = :workspaceId!
 *     AND (:assetId::uuid IS NULL OR a.id = :assetId::uuid)
 *     AND (CASE WHEN :conditions::text[] IS NULL
 *               THEN :assetId::uuid IS NOT NULL OR a.condition <> 'retired'
 *               ELSE a.condition = ANY (:conditions::text[]) END)
 *     AND (:typeIds::uuid[] IS NULL OR a.type_id = ANY (:typeIds::uuid[]))
 *     AND (:locationIds::uuid[] IS NULL OR a.location_id IN (SELECT id FROM scope))
 *     AND (:responsibleIds::uuid[] IS NULL AND NOT coalesce(:withoutResponsible::boolean, false)
 *          OR a.responsible_principal_id = ANY (:responsibleIds::uuid[])
 *          OR (coalesce(:withoutResponsible::boolean, false) AND a.responsible_principal_id IS NULL))
 *     AND (:conservations::text[] IS NULL AND NOT coalesce(:withoutConservation::boolean, false)
 *          OR a.conservation = ANY (:conservations::text[])
 *          OR (coalesce(:withoutConservation::boolean, false) AND a.conservation IS NULL))
 *     AND (:warranties::text[] IS NULL
 *          OR equipment.warranty_state(a.warranty_until, :today::date, :warrantyHorizon::date) = ANY (:warranties::text[]))
 *     AND (:usefulLives::text[] IS NULL
 *          OR equipment.useful_life_state(a.acquired_on, a.useful_life_years, :today::date) = ANY (:usefulLives::text[]))
 *     AND (search.pattern IS NULL OR a.search_text LIKE search.pattern)
 *     AND (:afterCode::text IS NULL OR lower(a.code) > :afterCode::text)
 *   ORDER BY lower(a.code)
 *   LIMIT :limit!
 * ), up AS (
 *   -- Niveles de cada ubicación de la página, hasta 6 hacia la raíz.
 *   SELECT loc.id AS location_id, loc.parent_id, loc.kind, loc.name, 0 AS depth
 *   FROM core.locations AS loc
 *   WHERE loc.workspace_id = :workspaceId! AND loc.id IN (SELECT location_id FROM page)
 *   UNION ALL
 *   SELECT up.location_id, parent.parent_id, parent.kind, parent.name, up.depth + 1
 *   FROM up
 *   JOIN core.locations AS parent ON parent.workspace_id = :workspaceId! AND parent.id = up.parent_id
 *   WHERE up.depth < 5
 * ), paths AS (
 *   -- Desde el primer nivel bajo la sede (sin ella, salvo que sea la propia).
 *   SELECT location_id, array_agg(name ORDER BY depth DESC) FILTER (WHERE depth = 0 OR kind <> 'site') AS path
 *   FROM up
 *   GROUP BY location_id
 * )
 * SELECT
 *   p.id,
 *   p.code,
 *   lower(p.code) AS "sort_code!",
 *   p.name,
 *   t.id AS type_id,
 *   t.name AS type_name,
 *   p.brand,
 *   p.model,
 *   p.serial_number,
 *   p.power_supply,
 *   loc.id AS location_id,
 *   loc.code AS location_code,
 *   loc.name AS location_name,
 *   paths.path AS "location_path!",
 *   area.area_id AS "location_area_id!",
 *   p.responsible_principal_id,
 *   ident.display_name AS "responsible_name?",
 *   p.condition,
 *   p.conservation,
 *   -- Disponibilidad calculada (ADR 0019): préstamo, mantenimiento y reservas llegan con su entrega.
 *   CASE WHEN p.condition IN ('operational', 'restricted') THEN 'available' ELSE 'unavailable' END AS "availability!",
 *   p.supplier,
 *   p.acquired_on,
 *   p.warranty_until,
 *   p.useful_life_years,
 *   trim_scale(p.replacement_value) AS replacement_value,
 *   photo.url AS "photo_url?",
 *   p.created_at
 * FROM page AS p
 * JOIN equipment.asset_types AS t ON t.workspace_id = :workspaceId! AND t.id = p.type_id
 * JOIN core.locations AS loc ON loc.workspace_id = :workspaceId! AND loc.id = p.location_id
 * JOIN paths ON paths.location_id = p.location_id
 * JOIN core.location_areas AS area ON area.workspace_id = :workspaceId! AND area.location_id = p.location_id
 * LEFT JOIN core.principals AS pr ON pr.workspace_id = :workspaceId! AND pr.id = p.responsible_principal_id
 * LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
 * LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
 * LEFT JOIN equipment.asset_photos AS photo ON photo.workspace_id = :workspaceId! AND photo.id = p.photo_id
 * ORDER BY lower(p.code)
 * ```
 */
export const listAssets = new PreparedQuery<IListAssetsParams,IListAssetsResult>(listAssetsIR);


/** 'InsertConservationChange' parameters type */
export interface IInsertConservationChangeParams {
  actorId: string;
  assetId: string;
  fromConservation?: string | null | void;
  toConservation?: string | null | void;
  workspaceId: string;
}

/** 'InsertConservationChange' return type */
export type IInsertConservationChangeResult = void;

/** 'InsertConservationChange' query type */
export interface IInsertConservationChangeQuery {
  params: IInsertConservationChangeParams;
  result: IInsertConservationChangeResult;
}

const insertConservationChangeIR: any = {"usedParamSet":{"workspaceId":true,"assetId":true,"fromConservation":true,"toConservation":true,"actorId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":227,"b":239}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":242,"b":250}]},{"name":"fromConservation","required":false,"transform":{"type":"scalar"},"locs":[{"a":253,"b":269}]},{"name":"toConservation","required":false,"transform":{"type":"scalar"},"locs":[{"a":272,"b":286}]},{"name":"actorId","required":true,"transform":{"type":"scalar"},"locs":[{"a":289,"b":297}]}],"statement":"-- El estado físico cambiado desde la ficha queda en el historial (E-01c); nulo es «sin dato».\nINSERT INTO equipment.conservation_changes (workspace_id, asset_id, from_conservation, to_conservation, actor_principal_id)\nVALUES (:workspaceId!, :assetId!, :fromConservation, :toConservation, :actorId!)"};

/**
 * Query generated from SQL:
 * ```
 * -- El estado físico cambiado desde la ficha queda en el historial (E-01c); nulo es «sin dato».
 * INSERT INTO equipment.conservation_changes (workspace_id, asset_id, from_conservation, to_conservation, actor_principal_id)
 * VALUES (:workspaceId!, :assetId!, :fromConservation, :toConservation, :actorId!)
 * ```
 */
export const insertConservationChange = new PreparedQuery<IInsertConservationChangeParams,IInsertConservationChangeResult>(insertConservationChangeIR);


/** 'AssetTotals' parameters type */
export interface IAssetTotalsParams {
  conditions?: stringArray | null | void;
  conservations?: stringArray | null | void;
  locationIds?: stringArray | null | void;
  q?: string | null | void;
  responsibleIds?: stringArray | null | void;
  today?: string | null | void;
  typeIds?: stringArray | null | void;
  usefulLives?: stringArray | null | void;
  warranties?: stringArray | null | void;
  warrantyHorizon?: string | null | void;
  withoutConservation?: boolean | null | void;
  withoutResponsible?: boolean | null | void;
  workspaceId: string;
}

/** 'AssetTotals' return type */
export interface IAssetTotalsResult {
  count: number;
  replacement_value: string;
  useful_life_reached: number;
  warranty_expiring: number;
  with_replacement_value: number;
  without_responsible: number;
}

/** 'AssetTotals' query type */
export interface IAssetTotalsQuery {
  params: IAssetTotalsParams;
  result: IAssetTotalsResult;
}

const assetTotalsIR: any = {"usedParamSet":{"q":true,"workspaceId":true,"locationIds":true,"today":true,"warrantyHorizon":true,"conditions":true,"typeIds":true,"responsibleIds":true,"withoutResponsible":true,"conservations":true,"withoutConservation":true,"warranties":true,"usefulLives":true},"params":[{"name":"q","required":false,"transform":{"type":"scalar"},"locs":[{"a":339,"b":340}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":532,"b":544},{"a":713,"b":725},{"a":1449,"b":1461}]},{"name":"locationIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":562,"b":573},{"a":1686,"b":1697}]},{"name":"today","required":false,"transform":{"type":"scalar"},"locs":[{"a":1113,"b":1118},{"a":1311,"b":1316},{"a":2359,"b":2364},{"a":2540,"b":2545}]},{"name":"warrantyHorizon","required":false,"transform":{"type":"scalar"},"locs":[{"a":1127,"b":1142},{"a":2373,"b":2388}]},{"name":"conditions","required":false,"transform":{"type":"scalar"},"locs":[{"a":1482,"b":1492},{"a":1578,"b":1588}]},{"name":"typeIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":1613,"b":1620},{"a":1658,"b":1665}]},{"name":"responsibleIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":1768,"b":1782},{"a":1900,"b":1914}]},{"name":"withoutResponsible","required":false,"transform":{"type":"scalar"},"locs":[{"a":1817,"b":1835},{"a":1947,"b":1965}]},{"name":"conservations","required":false,"transform":{"type":"scalar"},"locs":[{"a":2034,"b":2047},{"a":2154,"b":2167}]},{"name":"withoutConservation","required":false,"transform":{"type":"scalar"},"locs":[{"a":2082,"b":2101},{"a":2200,"b":2219}]},{"name":"warranties","required":false,"transform":{"type":"scalar"},"locs":[{"a":2276,"b":2286},{"a":2404,"b":2414}]},{"name":"usefulLives","required":false,"transform":{"type":"scalar"},"locs":[{"a":2435,"b":2446},{"a":2561,"b":2572}]}],"statement":"-- Indicadores del Informe (E-01c) con los mismos filtros que listAssets, sin paginar: cuántos equipos,\n-- su valor de reposición sumado (exacto) y cuántos lo tienen, sin responsable, con la garantía por vencer\n-- y con la vida útil cumplida a :today.\nWITH RECURSIVE search AS (\n  SELECT '%' || replace(replace(replace(inventory.fold_text(:q::text),\n           chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern\n), scope AS (\n  SELECT l.id\n  FROM core.locations AS l\n  WHERE l.workspace_id = :workspaceId! AND l.id = ANY (:locationIds::uuid[])\n  UNION\n  SELECT child.id\n  FROM core.locations AS child\n  JOIN scope ON child.parent_id = scope.id\n  WHERE child.workspace_id = :workspaceId!\n)\nSELECT count(*)::integer AS \"count!\",\n       trim_scale(coalesce(sum(a.replacement_value), 0))::text AS \"replacement_value!\",\n       count(a.replacement_value)::integer AS \"with_replacement_value!\",\n       count(*) FILTER (WHERE a.responsible_principal_id IS NULL)::integer AS \"without_responsible!\",\n       count(*) FILTER (\n         WHERE equipment.warranty_state(a.warranty_until, :today::date, :warrantyHorizon::date) = 'expiring'\n       )::integer AS \"warranty_expiring!\",\n       count(*) FILTER (\n         WHERE equipment.useful_life_state(a.acquired_on, a.useful_life_years, :today::date) = 'reached'\n       )::integer AS \"useful_life_reached!\"\nFROM equipment.assets AS a\nCROSS JOIN search\nWHERE a.workspace_id = :workspaceId!\n    AND (CASE WHEN :conditions::text[] IS NULL THEN a.condition <> 'retired'\n              ELSE a.condition = ANY (:conditions::text[]) END)\n    AND (:typeIds::uuid[] IS NULL OR a.type_id = ANY (:typeIds::uuid[]))\n    AND (:locationIds::uuid[] IS NULL OR a.location_id IN (SELECT id FROM scope))\n    AND (:responsibleIds::uuid[] IS NULL AND NOT coalesce(:withoutResponsible::boolean, false)\n         OR a.responsible_principal_id = ANY (:responsibleIds::uuid[])\n         OR (coalesce(:withoutResponsible::boolean, false) AND a.responsible_principal_id IS NULL))\n    AND (:conservations::text[] IS NULL AND NOT coalesce(:withoutConservation::boolean, false)\n         OR a.conservation = ANY (:conservations::text[])\n         OR (coalesce(:withoutConservation::boolean, false) AND a.conservation IS NULL))\n    AND (:warranties::text[] IS NULL\n         OR equipment.warranty_state(a.warranty_until, :today::date, :warrantyHorizon::date) = ANY (:warranties::text[]))\n    AND (:usefulLives::text[] IS NULL\n         OR equipment.useful_life_state(a.acquired_on, a.useful_life_years, :today::date) = ANY (:usefulLives::text[]))\n    AND (search.pattern IS NULL OR a.search_text LIKE search.pattern)"};

/**
 * Query generated from SQL:
 * ```
 * -- Indicadores del Informe (E-01c) con los mismos filtros que listAssets, sin paginar: cuántos equipos,
 * -- su valor de reposición sumado (exacto) y cuántos lo tienen, sin responsable, con la garantía por vencer
 * -- y con la vida útil cumplida a :today.
 * WITH RECURSIVE search AS (
 *   SELECT '%' || replace(replace(replace(inventory.fold_text(:q::text),
 *            chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern
 * ), scope AS (
 *   SELECT l.id
 *   FROM core.locations AS l
 *   WHERE l.workspace_id = :workspaceId! AND l.id = ANY (:locationIds::uuid[])
 *   UNION
 *   SELECT child.id
 *   FROM core.locations AS child
 *   JOIN scope ON child.parent_id = scope.id
 *   WHERE child.workspace_id = :workspaceId!
 * )
 * SELECT count(*)::integer AS "count!",
 *        trim_scale(coalesce(sum(a.replacement_value), 0))::text AS "replacement_value!",
 *        count(a.replacement_value)::integer AS "with_replacement_value!",
 *        count(*) FILTER (WHERE a.responsible_principal_id IS NULL)::integer AS "without_responsible!",
 *        count(*) FILTER (
 *          WHERE equipment.warranty_state(a.warranty_until, :today::date, :warrantyHorizon::date) = 'expiring'
 *        )::integer AS "warranty_expiring!",
 *        count(*) FILTER (
 *          WHERE equipment.useful_life_state(a.acquired_on, a.useful_life_years, :today::date) = 'reached'
 *        )::integer AS "useful_life_reached!"
 * FROM equipment.assets AS a
 * CROSS JOIN search
 * WHERE a.workspace_id = :workspaceId!
 *     AND (CASE WHEN :conditions::text[] IS NULL THEN a.condition <> 'retired'
 *               ELSE a.condition = ANY (:conditions::text[]) END)
 *     AND (:typeIds::uuid[] IS NULL OR a.type_id = ANY (:typeIds::uuid[]))
 *     AND (:locationIds::uuid[] IS NULL OR a.location_id IN (SELECT id FROM scope))
 *     AND (:responsibleIds::uuid[] IS NULL AND NOT coalesce(:withoutResponsible::boolean, false)
 *          OR a.responsible_principal_id = ANY (:responsibleIds::uuid[])
 *          OR (coalesce(:withoutResponsible::boolean, false) AND a.responsible_principal_id IS NULL))
 *     AND (:conservations::text[] IS NULL AND NOT coalesce(:withoutConservation::boolean, false)
 *          OR a.conservation = ANY (:conservations::text[])
 *          OR (coalesce(:withoutConservation::boolean, false) AND a.conservation IS NULL))
 *     AND (:warranties::text[] IS NULL
 *          OR equipment.warranty_state(a.warranty_until, :today::date, :warrantyHorizon::date) = ANY (:warranties::text[]))
 *     AND (:usefulLives::text[] IS NULL
 *          OR equipment.useful_life_state(a.acquired_on, a.useful_life_years, :today::date) = ANY (:usefulLives::text[]))
 *     AND (search.pattern IS NULL OR a.search_text LIKE search.pattern)
 * ```
 */
export const assetTotals = new PreparedQuery<IAssetTotalsParams,IAssetTotalsResult>(assetTotalsIR);


/** 'ListAssetHistory' parameters type */
export interface IListAssetHistoryParams {
  assetId: string;
  limit: NumberOrString;
  workspaceId: string;
}

/** 'ListAssetHistory' return type */
export interface IListAssetHistoryResult {
  actor: string | null;
  from_value: string | null;
  kind: string;
  note: string | null;
  occurred_at: Date;
  reason: string | null;
  result: string | null;
  to_value: string | null;
}

/** 'ListAssetHistory' query type */
export interface IListAssetHistoryQuery {
  params: IListAssetHistoryParams;
  result: IListAssetHistoryResult;
}

const listAssetHistoryIR: any = {"usedParamSet":{"workspaceId":true,"assetId":true,"limit":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":638,"b":650},{"a":886,"b":898},{"a":1144,"b":1156},{"a":1585,"b":1597},{"a":1918,"b":1930}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":663,"b":671},{"a":917,"b":925},{"a":1175,"b":1183},{"a":1616,"b":1624}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":1687,"b":1693}]}],"statement":"-- Alta, cambios de estado y de estado físico, y traslados de un equipo, del más reciente al más antiguo: primero los\n-- últimos :limit hechos (índices por equipo y fecha) y después, solo para ellos, quién actuó.\nWITH events AS (\n  SELECT 'created' AS kind, a.created_at AS occurred_at, a.created_by_principal_id AS actor_id,\n         NULL::text AS from_value, NULL::text AS to_value, NULL::text AS reason, NULL::text AS result,\n         NULL::text AS note, a.id AS event_id,\n         -- En un empate de fecha, el alta va última: es el primer hecho del equipo.\n         1 AS tie_rank\n  FROM equipment.assets AS a\n  WHERE a.workspace_id = :workspaceId! AND a.id = :assetId!\n  UNION ALL\n  SELECT 'condition', c.occurred_at, c.actor_principal_id, c.from_condition, c.to_condition, c.reason,\n         c.result, NULL, c.id, 0\n  FROM equipment.condition_changes AS c\n  WHERE c.workspace_id = :workspaceId! AND c.asset_id = :assetId!\n  UNION ALL\n  SELECT 'conservation', k.occurred_at, k.actor_principal_id, k.from_conservation, k.to_conservation, NULL, NULL,\n         NULL, k.id, 0\n  FROM equipment.conservation_changes AS k\n  WHERE k.workspace_id = :workspaceId! AND k.asset_id = :assetId!\n  UNION ALL\n  SELECT 'transfer', t.occurred_at, t.actor_principal_id, origin.name, target.name, NULL, NULL, t.note, t.id, 0\n  FROM equipment.location_changes AS t\n  JOIN core.locations AS origin ON origin.workspace_id = t.workspace_id AND origin.id = t.from_location_id\n  JOIN core.locations AS target ON target.workspace_id = t.workspace_id AND target.id = t.to_location_id\n  WHERE t.workspace_id = :workspaceId! AND t.asset_id = :assetId!\n  ORDER BY occurred_at DESC, tie_rank, event_id DESC\n  LIMIT :limit!\n)\nSELECT e.kind AS \"kind!\", e.occurred_at AS \"occurred_at!\", ident.display_name AS \"actor?\",\n       e.from_value, e.to_value, e.reason, e.result, e.note\nFROM events AS e\nLEFT JOIN core.principals AS pr ON pr.workspace_id = :workspaceId! AND pr.id = e.actor_id\nLEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\nLEFT JOIN core.identities AS ident ON ident.id = m.identity_id\nORDER BY e.occurred_at DESC, e.tie_rank, e.event_id DESC"};

/**
 * Query generated from SQL:
 * ```
 * -- Alta, cambios de estado y de estado físico, y traslados de un equipo, del más reciente al más antiguo: primero los
 * -- últimos :limit hechos (índices por equipo y fecha) y después, solo para ellos, quién actuó.
 * WITH events AS (
 *   SELECT 'created' AS kind, a.created_at AS occurred_at, a.created_by_principal_id AS actor_id,
 *          NULL::text AS from_value, NULL::text AS to_value, NULL::text AS reason, NULL::text AS result,
 *          NULL::text AS note, a.id AS event_id,
 *          -- En un empate de fecha, el alta va última: es el primer hecho del equipo.
 *          1 AS tie_rank
 *   FROM equipment.assets AS a
 *   WHERE a.workspace_id = :workspaceId! AND a.id = :assetId!
 *   UNION ALL
 *   SELECT 'condition', c.occurred_at, c.actor_principal_id, c.from_condition, c.to_condition, c.reason,
 *          c.result, NULL, c.id, 0
 *   FROM equipment.condition_changes AS c
 *   WHERE c.workspace_id = :workspaceId! AND c.asset_id = :assetId!
 *   UNION ALL
 *   SELECT 'conservation', k.occurred_at, k.actor_principal_id, k.from_conservation, k.to_conservation, NULL, NULL,
 *          NULL, k.id, 0
 *   FROM equipment.conservation_changes AS k
 *   WHERE k.workspace_id = :workspaceId! AND k.asset_id = :assetId!
 *   UNION ALL
 *   SELECT 'transfer', t.occurred_at, t.actor_principal_id, origin.name, target.name, NULL, NULL, t.note, t.id, 0
 *   FROM equipment.location_changes AS t
 *   JOIN core.locations AS origin ON origin.workspace_id = t.workspace_id AND origin.id = t.from_location_id
 *   JOIN core.locations AS target ON target.workspace_id = t.workspace_id AND target.id = t.to_location_id
 *   WHERE t.workspace_id = :workspaceId! AND t.asset_id = :assetId!
 *   ORDER BY occurred_at DESC, tie_rank, event_id DESC
 *   LIMIT :limit!
 * )
 * SELECT e.kind AS "kind!", e.occurred_at AS "occurred_at!", ident.display_name AS "actor?",
 *        e.from_value, e.to_value, e.reason, e.result, e.note
 * FROM events AS e
 * LEFT JOIN core.principals AS pr ON pr.workspace_id = :workspaceId! AND pr.id = e.actor_id
 * LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
 * LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
 * ORDER BY e.occurred_at DESC, e.tie_rank, e.event_id DESC
 * ```
 */
export const listAssetHistory = new PreparedQuery<IListAssetHistoryParams,IListAssetHistoryResult>(listAssetHistoryIR);


/** 'EquipmentSummary' parameters type */
export interface IEquipmentSummaryParams {
  principalId: string;
  workspaceId: string;
}

/** 'EquipmentSummary' return type */
export interface IEquipmentSummaryResult {
  assets: string;
  faulted: string;
  my_open_faults: string;
  open_faults: string;
  operational: string;
  restricted: string;
  unattended_faults: string;
}

/** 'EquipmentSummary' query type */
export interface IEquipmentSummaryQuery {
  params: IEquipmentSummaryParams;
  result: IEquipmentSummaryResult;
}

const equipmentSummaryIR: any = {"usedParamSet":{"workspaceId":true,"principalId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":575,"b":587},{"a":752,"b":764},{"a":917,"b":929},{"a":1120,"b":1132}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1041,"b":1053}]}],"statement":"-- Cifras del Resumen y de la tarjeta de Inicio: equipos sin los dados de baja (índice assets_condition)\n-- y fallas no resueltas (índice cases_status): todas, las que nadie atiende y las que reportó :principalId.\nSELECT count(*) FILTER (WHERE condition <> 'retired') AS \"assets!\",\n       count(*) FILTER (WHERE condition = 'operational') AS \"operational!\",\n       count(*) FILTER (WHERE condition = 'restricted') AS \"restricted!\",\n       count(*) FILTER (WHERE condition = 'faulted') AS \"faulted!\",\n       (SELECT count(*) FROM incidents.cases\n         WHERE workspace_id = :workspaceId! AND module_code = 'equipment' AND status IN ('open', 'in_progress')) AS \"open_faults!\",\n       (SELECT count(*) FROM incidents.cases\n         WHERE workspace_id = :workspaceId! AND module_code = 'equipment' AND status = 'open') AS \"unattended_faults!\",\n       (SELECT count(*) FROM incidents.cases\n         WHERE workspace_id = :workspaceId! AND module_code = 'equipment' AND status IN ('open', 'in_progress')\n           AND reported_by_principal_id = :principalId!) AS \"my_open_faults!\"\nFROM equipment.assets\nWHERE workspace_id = :workspaceId!"};

/**
 * Query generated from SQL:
 * ```
 * -- Cifras del Resumen y de la tarjeta de Inicio: equipos sin los dados de baja (índice assets_condition)
 * -- y fallas no resueltas (índice cases_status): todas, las que nadie atiende y las que reportó :principalId.
 * SELECT count(*) FILTER (WHERE condition <> 'retired') AS "assets!",
 *        count(*) FILTER (WHERE condition = 'operational') AS "operational!",
 *        count(*) FILTER (WHERE condition = 'restricted') AS "restricted!",
 *        count(*) FILTER (WHERE condition = 'faulted') AS "faulted!",
 *        (SELECT count(*) FROM incidents.cases
 *          WHERE workspace_id = :workspaceId! AND module_code = 'equipment' AND status IN ('open', 'in_progress')) AS "open_faults!",
 *        (SELECT count(*) FROM incidents.cases
 *          WHERE workspace_id = :workspaceId! AND module_code = 'equipment' AND status = 'open') AS "unattended_faults!",
 *        (SELECT count(*) FROM incidents.cases
 *          WHERE workspace_id = :workspaceId! AND module_code = 'equipment' AND status IN ('open', 'in_progress')
 *            AND reported_by_principal_id = :principalId!) AS "my_open_faults!"
 * FROM equipment.assets
 * WHERE workspace_id = :workspaceId!
 * ```
 */
export const equipmentSummary = new PreparedQuery<IEquipmentSummaryParams,IEquipmentSummaryResult>(equipmentSummaryIR);


