/** Types generated for queries found in "src/modules/maintenance/infrastructure/records.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type NumberOrString = number | string;

export type stringArray = (string)[];

/** 'SharePlan' parameters type */
export interface ISharePlanParams {
  planId: string;
  workspaceId: string;
}

/** 'SharePlan' return type */
export interface ISharePlanResult {
  archived_at: Date | null;
  checklist: stringArray;
  kind: string;
}

/** 'SharePlan' query type */
export interface ISharePlanQuery {
  params: ISharePlanParams;
  result: ISharePlanResult;
}

const sharePlanIR: any = {"usedParamSet":{"workspaceId":true,"planId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":292,"b":304}]},{"name":"planId","required":true,"transform":{"type":"scalar"},"locs":[{"a":315,"b":322}]}],"statement":"-- El plan elegido al registrar, compartido para que nadie lo archive ni lo cambie mientras tanto. Va antes\n-- que el equipo, como en los comandos de planes, que bloquean el plan y después referencian al equipo.\nSELECT kind, checklist, archived_at\nFROM maintenance.plans\nWHERE workspace_id = :workspaceId! AND id = :planId!\nFOR SHARE"};

/**
 * Query generated from SQL:
 * ```
 * -- El plan elegido al registrar, compartido para que nadie lo archive ni lo cambie mientras tanto. Va antes
 * -- que el equipo, como en los comandos de planes, que bloquean el plan y después referencian al equipo.
 * SELECT kind, checklist, archived_at
 * FROM maintenance.plans
 * WHERE workspace_id = :workspaceId! AND id = :planId!
 * FOR SHARE
 * ```
 */
export const sharePlan = new PreparedQuery<ISharePlanParams,ISharePlanResult>(sharePlanIR);


/** 'ShareProvider' parameters type */
export interface IShareProviderParams {
  providerId: string;
  workspaceId: string;
}

/** 'ShareProvider' return type */
export interface IShareProviderResult {
  archived_at: Date | null;
}

/** 'ShareProvider' query type */
export interface IShareProviderQuery {
  params: IShareProviderParams;
  result: IShareProviderResult;
}

const shareProviderIR: any = {"usedParamSet":{"workspaceId":true,"providerId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":158,"b":170}]},{"name":"providerId","required":true,"transform":{"type":"scalar"},"locs":[{"a":181,"b":192}]}],"statement":"-- El proveedor elegido al registrar, compartido para que nadie lo archive mientras tanto.\nSELECT archived_at\nFROM maintenance.providers\nWHERE workspace_id = :workspaceId! AND id = :providerId!\nFOR SHARE"};

/**
 * Query generated from SQL:
 * ```
 * -- El proveedor elegido al registrar, compartido para que nadie lo archive mientras tanto.
 * SELECT archived_at
 * FROM maintenance.providers
 * WHERE workspace_id = :workspaceId! AND id = :providerId!
 * FOR SHARE
 * ```
 */
export const shareProvider = new PreparedQuery<IShareProviderParams,IShareProviderResult>(shareProviderIR);


/** 'InsertRecord' parameters type */
export interface IInsertRecordParams {
  assetId: string;
  checklist: Json;
  conservation?: string | null | void;
  cost?: string | null | void;
  kind: string;
  observations?: string | null | void;
  performedOn: string;
  planId?: string | null | void;
  providerId?: string | null | void;
  recordedBy: string;
  result: string;
  validUntil?: string | null | void;
  workspaceId: string;
}

/** 'InsertRecord' return type */
export interface IInsertRecordResult {
  id: string;
}

/** 'InsertRecord' query type */
export interface IInsertRecordQuery {
  params: IInsertRecordParams;
  result: IInsertRecordResult;
}

const insertRecordIR: any = {"usedParamSet":{"workspaceId":true,"assetId":true,"planId":true,"kind":true,"performedOn":true,"providerId":true,"result":true,"observations":true,"checklist":true,"cost":true,"validUntil":true,"conservation":true,"recordedBy":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":303,"b":315}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":318,"b":326}]},{"name":"planId","required":false,"transform":{"type":"scalar"},"locs":[{"a":329,"b":335}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":338,"b":343}]},{"name":"performedOn","required":true,"transform":{"type":"scalar"},"locs":[{"a":346,"b":358}]},{"name":"providerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":367,"b":377}]},{"name":"result","required":true,"transform":{"type":"scalar"},"locs":[{"a":380,"b":387}]},{"name":"observations","required":false,"transform":{"type":"scalar"},"locs":[{"a":390,"b":402}]},{"name":"checklist","required":true,"transform":{"type":"scalar"},"locs":[{"a":407,"b":417}]},{"name":"cost","required":false,"transform":{"type":"scalar"},"locs":[{"a":427,"b":431}]},{"name":"validUntil","required":false,"transform":{"type":"scalar"},"locs":[{"a":443,"b":453}]},{"name":"conservation","required":false,"transform":{"type":"scalar"},"locs":[{"a":462,"b":474}]},{"name":"recordedBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":477,"b":488}]}],"statement":"-- La lista marcada llega como texto JSON (pg enviaría un arreglo como arreglo de PostgreSQL).\nINSERT INTO maintenance.records (\n  workspace_id, asset_id, plan_id, kind, performed_on, provider_id, result, observations, checklist, cost,\n  valid_until, conservation, recorded_by_principal_id\n)\nVALUES (\n  :workspaceId!, :assetId!, :planId, :kind!, :performedOn!::date, :providerId, :result!, :observations,\n  :checklist!::jsonb, :cost::numeric, :validUntil::date, :conservation, :recordedBy!\n)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- La lista marcada llega como texto JSON (pg enviaría un arreglo como arreglo de PostgreSQL).
 * INSERT INTO maintenance.records (
 *   workspace_id, asset_id, plan_id, kind, performed_on, provider_id, result, observations, checklist, cost,
 *   valid_until, conservation, recorded_by_principal_id
 * )
 * VALUES (
 *   :workspaceId!, :assetId!, :planId, :kind!, :performedOn!::date, :providerId, :result!, :observations,
 *   :checklist!::jsonb, :cost::numeric, :validUntil::date, :conservation, :recordedBy!
 * )
 * RETURNING id
 * ```
 */
export const insertRecord = new PreparedQuery<IInsertRecordParams,IInsertRecordResult>(insertRecordIR);


/** 'NextDueOn' parameters type */
export interface INextDueOnParams {
  assetId: string;
  planId: string;
  workspaceId: string;
}

/** 'NextDueOn' return type */
export interface INextDueOnResult {
  due_on: string;
}

/** 'NextDueOn' query type */
export interface INextDueOnQuery {
  params: INextDueOnParams;
  result: INextDueOnResult;
}

const nextDueOnIR: any = {"usedParamSet":{"workspaceId":true,"planId":true,"assetId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":167,"b":179}]},{"name":"planId","required":true,"transform":{"type":"scalar"},"locs":[{"a":195,"b":202}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":219,"b":227}]}],"statement":"-- La próxima fecha del plan para el equipo (plan_assets); sin fila, el plan no lo cubre.\nSELECT due_on AS \"due_on!\"\nFROM maintenance.plan_assets\nWHERE workspace_id = :workspaceId! AND plan_id = :planId! AND asset_id = :assetId!"};

/**
 * Query generated from SQL:
 * ```
 * -- La próxima fecha del plan para el equipo (plan_assets); sin fila, el plan no lo cubre.
 * SELECT due_on AS "due_on!"
 * FROM maintenance.plan_assets
 * WHERE workspace_id = :workspaceId! AND plan_id = :planId! AND asset_id = :assetId!
 * ```
 */
export const nextDueOn = new PreparedQuery<INextDueOnParams,INextDueOnResult>(nextDueOnIR);


/** 'ListRecords' parameters type */
export interface IListRecordsParams {
  afterAt?: DateOrString | null | void;
  afterId?: string | null | void;
  afterOn?: string | null | void;
  assetId?: string | null | void;
  limit: NumberOrString;
  recordId?: string | null | void;
  workspaceId: string;
}

/** 'ListRecords' return type */
export interface IListRecordsResult {
  asset_code: string;
  asset_id: string;
  asset_name: string;
  certificate_byte_size: number | null;
  certificate_uploaded_at: Date | null;
  certificate_url: string | null;
  checklist: Json;
  conservation: string | null;
  cost: string | null;
  id: string;
  kind: string;
  observations: string | null;
  performed_on: string;
  plan_id: string | null;
  plan_title: string | null;
  provider_id: string | null;
  provider_name: string | null;
  recorded_at: Date;
  recorded_by_name: string | null;
  recorded_key: string;
  result: string;
  valid_until: string | null;
}

/** 'ListRecords' query type */
export interface IListRecordsQuery {
  params: IListRecordsParams;
  result: IListRecordsResult;
}

const listRecordsIR: any = {"usedParamSet":{"workspaceId":true,"recordId":true,"assetId":true,"afterOn":true,"afterAt":true,"afterId":true,"limit":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1505,"b":1517}]},{"name":"recordId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1526,"b":1534},{"a":1560,"b":1568}]},{"name":"assetId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1584,"b":1591},{"a":1623,"b":1630}]},{"name":"afterOn","required":false,"transform":{"type":"scalar"},"locs":[{"a":1646,"b":1653},{"a":1720,"b":1727}]},{"name":"afterAt","required":false,"transform":{"type":"scalar"},"locs":[{"a":1736,"b":1743}]},{"name":"afterId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1759,"b":1766}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":1842,"b":1848}]}],"statement":"-- Del más reciente al más antiguo: por la fecha del trabajo y después por cuándo se registró. Con\n-- :recordId, uno; con :assetId, los de un equipo (índice records_asset). Con el equipo, el plan, el\n-- proveedor, quién registró y el certificado. `recorded_key` lleva la hora exacta para el cursor.\nSELECT\n  r.id, r.asset_id, a.code AS \"asset_code!\", a.name AS \"asset_name!\", r.plan_id, p.title AS \"plan_title?\",\n  r.kind, r.performed_on, r.provider_id, pv.name AS \"provider_name?\", r.result, r.observations, r.checklist,\n  trim_scale(r.cost) AS cost, r.valid_until, r.conservation, ident.display_name AS \"recorded_by_name?\",\n  r.recorded_at, r.recorded_at::text AS \"recorded_key!\",\n  c.url AS \"certificate_url?\", c.byte_size AS \"certificate_byte_size?\", c.uploaded_at AS \"certificate_uploaded_at?\"\nFROM maintenance.records AS r\nJOIN equipment.asset_directory AS a ON a.workspace_id = r.workspace_id AND a.id = r.asset_id\nLEFT JOIN maintenance.plans AS p ON p.workspace_id = r.workspace_id AND p.id = r.plan_id\nLEFT JOIN maintenance.providers AS pv ON pv.workspace_id = r.workspace_id AND pv.id = r.provider_id\nLEFT JOIN maintenance.record_certificates AS c ON c.workspace_id = r.workspace_id AND c.record_id = r.id\nLEFT JOIN core.principals AS pr ON pr.workspace_id = r.workspace_id AND pr.id = r.recorded_by_principal_id\nLEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\nLEFT JOIN core.identities AS ident ON ident.id = m.identity_id\nWHERE r.workspace_id = :workspaceId!\n  AND (:recordId::uuid IS NULL OR r.id = :recordId::uuid)\n  AND (:assetId::uuid IS NULL OR r.asset_id = :assetId::uuid)\n  AND (:afterOn::date IS NULL\n       OR (r.performed_on, r.recorded_at, r.id) < (:afterOn::date, :afterAt::timestamptz, :afterId::uuid))\nORDER BY r.performed_on DESC, r.recorded_at DESC, r.id DESC\nLIMIT :limit!"};

/**
 * Query generated from SQL:
 * ```
 * -- Del más reciente al más antiguo: por la fecha del trabajo y después por cuándo se registró. Con
 * -- :recordId, uno; con :assetId, los de un equipo (índice records_asset). Con el equipo, el plan, el
 * -- proveedor, quién registró y el certificado. `recorded_key` lleva la hora exacta para el cursor.
 * SELECT
 *   r.id, r.asset_id, a.code AS "asset_code!", a.name AS "asset_name!", r.plan_id, p.title AS "plan_title?",
 *   r.kind, r.performed_on, r.provider_id, pv.name AS "provider_name?", r.result, r.observations, r.checklist,
 *   trim_scale(r.cost) AS cost, r.valid_until, r.conservation, ident.display_name AS "recorded_by_name?",
 *   r.recorded_at, r.recorded_at::text AS "recorded_key!",
 *   c.url AS "certificate_url?", c.byte_size AS "certificate_byte_size?", c.uploaded_at AS "certificate_uploaded_at?"
 * FROM maintenance.records AS r
 * JOIN equipment.asset_directory AS a ON a.workspace_id = r.workspace_id AND a.id = r.asset_id
 * LEFT JOIN maintenance.plans AS p ON p.workspace_id = r.workspace_id AND p.id = r.plan_id
 * LEFT JOIN maintenance.providers AS pv ON pv.workspace_id = r.workspace_id AND pv.id = r.provider_id
 * LEFT JOIN maintenance.record_certificates AS c ON c.workspace_id = r.workspace_id AND c.record_id = r.id
 * LEFT JOIN core.principals AS pr ON pr.workspace_id = r.workspace_id AND pr.id = r.recorded_by_principal_id
 * LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
 * LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
 * WHERE r.workspace_id = :workspaceId!
 *   AND (:recordId::uuid IS NULL OR r.id = :recordId::uuid)
 *   AND (:assetId::uuid IS NULL OR r.asset_id = :assetId::uuid)
 *   AND (:afterOn::date IS NULL
 *        OR (r.performed_on, r.recorded_at, r.id) < (:afterOn::date, :afterAt::timestamptz, :afterId::uuid))
 * ORDER BY r.performed_on DESC, r.recorded_at DESC, r.id DESC
 * LIMIT :limit!
 * ```
 */
export const listRecords = new PreparedQuery<IListRecordsParams,IListRecordsResult>(listRecordsIR);


/** 'RecordExists' parameters type */
export interface IRecordExistsParams {
  recordId: string;
  workspaceId: string;
}

/** 'RecordExists' return type */
export interface IRecordExistsResult {
  id: string;
}

/** 'RecordExists' query type */
export interface IRecordExistsQuery {
  params: IRecordExistsParams;
  result: IRecordExistsResult;
}

const recordExistsIR: any = {"usedParamSet":{"workspaceId":true,"recordId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":118,"b":130}]},{"name":"recordId","required":true,"transform":{"type":"scalar"},"locs":[{"a":141,"b":150}]}],"statement":"-- Antes de subir un certificado: el registro es del espacio.\nSELECT id FROM maintenance.records WHERE workspace_id = :workspaceId! AND id = :recordId!"};

/**
 * Query generated from SQL:
 * ```
 * -- Antes de subir un certificado: el registro es del espacio.
 * SELECT id FROM maintenance.records WHERE workspace_id = :workspaceId! AND id = :recordId!
 * ```
 */
export const recordExists = new PreparedQuery<IRecordExistsParams,IRecordExistsResult>(recordExistsIR);


/** 'InsertCertificate' parameters type */
export interface IInsertCertificateParams {
  byteSize: number;
  id: string;
  objectPath: string;
  recordId: string;
  sha256: string;
  uploadedBy: string;
  url: string;
  workspaceId: string;
}

/** 'InsertCertificate' return type */
export interface IInsertCertificateResult {
  id: string;
}

/** 'InsertCertificate' query type */
export interface IInsertCertificateQuery {
  params: IInsertCertificateParams;
  result: IInsertCertificateResult;
}

const insertCertificateIR: any = {"usedParamSet":{"id":true,"workspaceId":true,"recordId":true,"objectPath":true,"url":true,"byteSize":true,"sha256":true,"uploadedBy":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":271,"b":274}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":277,"b":289}]},{"name":"recordId","required":true,"transform":{"type":"scalar"},"locs":[{"a":292,"b":301}]},{"name":"objectPath","required":true,"transform":{"type":"scalar"},"locs":[{"a":304,"b":315}]},{"name":"url","required":true,"transform":{"type":"scalar"},"locs":[{"a":318,"b":322}]},{"name":"byteSize","required":true,"transform":{"type":"scalar"},"locs":[{"a":325,"b":334}]},{"name":"sha256","required":true,"transform":{"type":"scalar"},"locs":[{"a":337,"b":344}]},{"name":"uploadedBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":347,"b":358}]}],"statement":"-- Un registro con certificado (record_certificates único por registro) no inserta nada: el comando\n-- responde CONFLICT.\nINSERT INTO maintenance.record_certificates (\n  id, workspace_id, record_id, object_path, url, byte_size, sha256, uploaded_by_principal_id\n)\nVALUES (:id!, :workspaceId!, :recordId!, :objectPath!, :url!, :byteSize!, :sha256!, :uploadedBy!)\nON CONFLICT (workspace_id, record_id) DO NOTHING\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- Un registro con certificado (record_certificates único por registro) no inserta nada: el comando
 * -- responde CONFLICT.
 * INSERT INTO maintenance.record_certificates (
 *   id, workspace_id, record_id, object_path, url, byte_size, sha256, uploaded_by_principal_id
 * )
 * VALUES (:id!, :workspaceId!, :recordId!, :objectPath!, :url!, :byteSize!, :sha256!, :uploadedBy!)
 * ON CONFLICT (workspace_id, record_id) DO NOTHING
 * RETURNING id
 * ```
 */
export const insertCertificate = new PreparedQuery<IInsertCertificateParams,IInsertCertificateResult>(insertCertificateIR);


