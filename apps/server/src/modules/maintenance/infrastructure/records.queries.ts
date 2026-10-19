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
  acceptance_criteria: string | null;
  archived_at: Date | null;
  checklist: stringArray;
  kind: string;
  version: number;
}

/** 'SharePlan' query type */
export interface ISharePlanQuery {
  params: ISharePlanParams;
  result: ISharePlanResult;
}

const sharePlanIR: any = {"usedParamSet":{"workspaceId":true,"planId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":322,"b":334}]},{"name":"planId","required":true,"transform":{"type":"scalar"},"locs":[{"a":345,"b":352}]}],"statement":"-- El plan elegido al registrar, compartido para que nadie lo archive ni lo cambie mientras tanto. Va antes\n-- que el equipo, como en los comandos de planes, que bloquean el plan y después referencian al equipo.\nSELECT kind, checklist, acceptance_criteria, archived_at, version\nFROM maintenance.plans\nWHERE workspace_id = :workspaceId! AND id = :planId!\nFOR SHARE"};

/**
 * Query generated from SQL:
 * ```
 * -- El plan elegido al registrar, compartido para que nadie lo archive ni lo cambie mientras tanto. Va antes
 * -- que el equipo, como en los comandos de planes, que bloquean el plan y después referencian al equipo.
 * SELECT kind, checklist, acceptance_criteria, archived_at, version
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
  acceptanceCriteria?: string | null | void;
  assetId: string;
  checklist: Json;
  correctsRecordId?: string | null | void;
  cost?: string | null | void;
  dueOn?: string | null | void;
  faultId?: string | null | void;
  kind: string;
  observations?: string | null | void;
  performedOn: string;
  planId?: string | null | void;
  planVersion?: number | null | void;
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

const insertRecordIR: any = {"usedParamSet":{"workspaceId":true,"assetId":true,"planId":true,"planVersion":true,"acceptanceCriteria":true,"kind":true,"performedOn":true,"dueOn":true,"providerId":true,"result":true,"observations":true,"checklist":true,"cost":true,"validUntil":true,"recordedBy":true,"faultId":true,"correctsRecordId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":546,"b":558}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":561,"b":569}]},{"name":"planId","required":false,"transform":{"type":"scalar"},"locs":[{"a":572,"b":578}]},{"name":"planVersion","required":false,"transform":{"type":"scalar"},"locs":[{"a":581,"b":592}]},{"name":"acceptanceCriteria","required":false,"transform":{"type":"scalar"},"locs":[{"a":595,"b":613}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":616,"b":621}]},{"name":"performedOn","required":true,"transform":{"type":"scalar"},"locs":[{"a":624,"b":636}]},{"name":"dueOn","required":false,"transform":{"type":"scalar"},"locs":[{"a":645,"b":650}]},{"name":"providerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":661,"b":671}]},{"name":"result","required":true,"transform":{"type":"scalar"},"locs":[{"a":674,"b":681}]},{"name":"observations","required":false,"transform":{"type":"scalar"},"locs":[{"a":684,"b":696}]},{"name":"checklist","required":true,"transform":{"type":"scalar"},"locs":[{"a":699,"b":709}]},{"name":"cost","required":false,"transform":{"type":"scalar"},"locs":[{"a":719,"b":723}]},{"name":"validUntil","required":false,"transform":{"type":"scalar"},"locs":[{"a":735,"b":745}]},{"name":"recordedBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":754,"b":765}]},{"name":"faultId","required":false,"transform":{"type":"scalar"},"locs":[{"a":770,"b":777}]},{"name":"correctsRecordId","required":false,"transform":{"type":"scalar"},"locs":[{"a":780,"b":796}]}],"statement":"-- La lista marcada llega como texto JSON (pg enviaría un arreglo como arreglo de PostgreSQL). Con plan,\n-- la versión con que se llenó, la copia de su criterio de aceptación y la fecha que tocaba; un correctivo,\n-- el incidente que atiende; una corrección, el registro anulado.\nINSERT INTO maintenance.records (\n  workspace_id, asset_id, plan_id, plan_version, acceptance_criteria, kind, performed_on, due_on, provider_id,\n  result, observations, checklist, cost, valid_until, recorded_by_principal_id, fault_id, corrects_record_id\n)\nVALUES (\n  :workspaceId!, :assetId!, :planId, :planVersion, :acceptanceCriteria, :kind!, :performedOn!::date, :dueOn::date,\n  :providerId, :result!, :observations, :checklist!::jsonb, :cost::numeric, :validUntil::date, :recordedBy!,\n  :faultId, :correctsRecordId\n)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- La lista marcada llega como texto JSON (pg enviaría un arreglo como arreglo de PostgreSQL). Con plan,
 * -- la versión con que se llenó, la copia de su criterio de aceptación y la fecha que tocaba; un correctivo,
 * -- el incidente que atiende; una corrección, el registro anulado.
 * INSERT INTO maintenance.records (
 *   workspace_id, asset_id, plan_id, plan_version, acceptance_criteria, kind, performed_on, due_on, provider_id,
 *   result, observations, checklist, cost, valid_until, recorded_by_principal_id, fault_id, corrects_record_id
 * )
 * VALUES (
 *   :workspaceId!, :assetId!, :planId, :planVersion, :acceptanceCriteria, :kind!, :performedOn!::date, :dueOn::date,
 *   :providerId, :result!, :observations, :checklist!::jsonb, :cost::numeric, :validUntil::date, :recordedBy!,
 *   :faultId, :correctsRecordId
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
  last_performed_on: string | null;
  last_result: string | null;
}

/** 'NextDueOn' query type */
export interface INextDueOnQuery {
  params: INextDueOnParams;
  result: INextDueOnResult;
}

const nextDueOnIR: any = {"usedParamSet":{"workspaceId":true,"planId":true,"assetId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":223,"b":235}]},{"name":"planId","required":true,"transform":{"type":"scalar"},"locs":[{"a":251,"b":258}]},{"name":"assetId","required":true,"transform":{"type":"scalar"},"locs":[{"a":275,"b":283}]}],"statement":"-- La próxima fecha del plan para el equipo (plan_assets), con su último registro; sin fila, el plan no lo cubre.\nSELECT due_on AS \"due_on!\", last_performed_on, last_result\nFROM maintenance.plan_assets\nWHERE workspace_id = :workspaceId! AND plan_id = :planId! AND asset_id = :assetId!"};

/**
 * Query generated from SQL:
 * ```
 * -- La próxima fecha del plan para el equipo (plan_assets), con su último registro; sin fila, el plan no lo cubre.
 * SELECT due_on AS "due_on!", last_performed_on, last_result
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
  areaIds?: stringArray | null | void;
  assetId?: string | null | void;
  from?: string | null | void;
  internal?: boolean | null | void;
  kinds?: stringArray | null | void;
  limit: NumberOrString;
  providerIds?: stringArray | null | void;
  recordId?: string | null | void;
  results?: stringArray | null | void;
  to?: string | null | void;
  workspaceId: string;
}

/** 'ListRecords' return type */
export interface IListRecordsResult {
  acceptance_criteria: string | null;
  area_name: string | null;
  asset_code: string;
  asset_id: string;
  asset_name: string;
  certificate_byte_size: number | null;
  certificate_uploaded_at: Date | null;
  certificate_url: string | null;
  checklist: Json;
  corrected_by_id: string | null;
  corrected_by_performed_on: string | null;
  corrects_performed_on: string | null;
  corrects_record_id: string | null;
  cost: string | null;
  due_on: string | null;
  fault_id: string | null;
  id: string;
  kind: string;
  observations: string | null;
  performed_on: string;
  plan_id: string | null;
  plan_requirement: string | null;
  plan_title: string | null;
  provider_id: string | null;
  provider_name: string | null;
  recorded_at: Date;
  recorded_by_name: string | null;
  recorded_key: string;
  result: string;
  valid_until: string | null;
  void_reason: string | null;
  voided_at: Date | null;
  voided_by_name: string | null;
}

/** 'ListRecords' query type */
export interface IListRecordsQuery {
  params: IListRecordsParams;
  result: IListRecordsResult;
}

const listRecordsIR: any = {"usedParamSet":{"workspaceId":true,"recordId":true,"assetId":true,"from":true,"to":true,"kinds":true,"results":true,"areaIds":true,"providerIds":true,"internal":true,"afterOn":true,"afterAt":true,"afterId":true,"limit":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":2848,"b":2860}]},{"name":"recordId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2869,"b":2877},{"a":2903,"b":2911}]},{"name":"assetId","required":false,"transform":{"type":"scalar"},"locs":[{"a":2927,"b":2934},{"a":2966,"b":2973}]},{"name":"from","required":false,"transform":{"type":"scalar"},"locs":[{"a":2989,"b":2993},{"a":3030,"b":3034}]},{"name":"to","required":false,"transform":{"type":"scalar"},"locs":[{"a":3050,"b":3052},{"a":3089,"b":3091}]},{"name":"kinds","required":false,"transform":{"type":"scalar"},"locs":[{"a":3107,"b":3112},{"a":3147,"b":3152}]},{"name":"results","required":false,"transform":{"type":"scalar"},"locs":[{"a":3171,"b":3178},{"a":3215,"b":3222}]},{"name":"areaIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":3241,"b":3248},{"a":3287,"b":3294}]},{"name":"providerIds","required":false,"transform":{"type":"scalar"},"locs":[{"a":3313,"b":3324},{"a":3417,"b":3428}]},{"name":"internal","required":false,"transform":{"type":"scalar"},"locs":[{"a":3359,"b":3367},{"a":3458,"b":3466}]},{"name":"afterOn","required":false,"transform":{"type":"scalar"},"locs":[{"a":3519,"b":3526},{"a":3593,"b":3600}]},{"name":"afterAt","required":false,"transform":{"type":"scalar"},"locs":[{"a":3609,"b":3616}]},{"name":"afterId","required":false,"transform":{"type":"scalar"},"locs":[{"a":3632,"b":3639}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":3715,"b":3721}]}],"statement":"-- Del más reciente al más antiguo: por la fecha del trabajo y después por cuándo se registró. Con\n-- :recordId, uno; con :assetId, los de un equipo (índice records_asset). Con el equipo y su área, el plan, el\n-- proveedor, quién registró, el certificado y, si se anuló o corrige a otro, quién, cuándo y cuál. Los\n-- anulados siguen a la vista. `recorded_key` lleva la hora exacta para el cursor. Filtros del Historial\n-- (M-01d): periodo por la fecha del trabajo, tipos, resultados, áreas del equipo hoy y proveedores, con\n-- :internal para el trabajo sin proveedor.\nSELECT\n  r.id, r.asset_id, a.code AS \"asset_code!\", a.name AS \"asset_name!\", area.name AS \"area_name?\",\n  r.plan_id, p.title AS \"plan_title?\", p.requirement AS \"plan_requirement?\",\n  r.kind, r.performed_on, r.due_on, r.provider_id, pv.name AS \"provider_name?\", r.result, r.observations, r.checklist,\n  trim_scale(r.cost) AS cost, r.valid_until, r.acceptance_criteria, ident.display_name AS \"recorded_by_name?\",\n  r.recorded_at, r.recorded_at::text AS \"recorded_key!\",\n  c.url AS \"certificate_url?\", c.byte_size AS \"certificate_byte_size?\", c.uploaded_at AS \"certificate_uploaded_at?\",\n  r.fault_id, r.corrects_record_id, corrected.performed_on AS \"corrects_performed_on?\",\n  r.voided_at, r.void_reason, voider.display_name AS \"voided_by_name?\",\n  correction.id AS \"corrected_by_id?\", correction.performed_on AS \"corrected_by_performed_on?\"\nFROM maintenance.records AS r\nJOIN equipment.asset_directory AS a ON a.workspace_id = r.workspace_id AND a.id = r.asset_id\nLEFT JOIN core.location_areas AS la ON la.workspace_id = a.workspace_id AND la.location_id = a.location_id\nLEFT JOIN core.locations AS area ON area.workspace_id = la.workspace_id AND area.id = la.area_id\nLEFT JOIN maintenance.plans AS p ON p.workspace_id = r.workspace_id AND p.id = r.plan_id\nLEFT JOIN maintenance.providers AS pv ON pv.workspace_id = r.workspace_id AND pv.id = r.provider_id\nLEFT JOIN maintenance.record_certificates AS c ON c.workspace_id = r.workspace_id AND c.record_id = r.id\nLEFT JOIN core.principals AS pr ON pr.workspace_id = r.workspace_id AND pr.id = r.recorded_by_principal_id\nLEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\nLEFT JOIN core.identities AS ident ON ident.id = m.identity_id\nLEFT JOIN maintenance.records AS corrected ON corrected.workspace_id = r.workspace_id AND corrected.id = r.corrects_record_id\nLEFT JOIN maintenance.records AS correction ON correction.workspace_id = r.workspace_id AND correction.corrects_record_id = r.id\nLEFT JOIN core.principals AS vpr ON vpr.workspace_id = r.workspace_id AND vpr.id = r.voided_by_principal_id\nLEFT JOIN core.memberships AS vm ON vm.workspace_id = vpr.workspace_id AND vm.id = vpr.membership_id\nLEFT JOIN core.identities AS voider ON voider.id = vm.identity_id\nWHERE r.workspace_id = :workspaceId!\n  AND (:recordId::uuid IS NULL OR r.id = :recordId::uuid)\n  AND (:assetId::uuid IS NULL OR r.asset_id = :assetId::uuid)\n  AND (:from::date IS NULL OR r.performed_on >= :from::date)\n  AND (:to::date IS NULL OR r.performed_on <= :to::date)\n  AND (:kinds::text[] IS NULL OR r.kind = ANY (:kinds::text[]))\n  AND (:results::text[] IS NULL OR r.result = ANY (:results::text[]))\n  AND (:areaIds::uuid[] IS NULL OR la.area_id = ANY (:areaIds::uuid[]))\n  AND (:providerIds::uuid[] IS NULL AND NOT coalesce(:internal::boolean, false)\n       OR r.provider_id = ANY (:providerIds::uuid[])\n       OR coalesce(:internal::boolean, false) AND r.provider_id IS NULL)\n  AND (:afterOn::date IS NULL\n       OR (r.performed_on, r.recorded_at, r.id) < (:afterOn::date, :afterAt::timestamptz, :afterId::uuid))\nORDER BY r.performed_on DESC, r.recorded_at DESC, r.id DESC\nLIMIT :limit!"};

/**
 * Query generated from SQL:
 * ```
 * -- Del más reciente al más antiguo: por la fecha del trabajo y después por cuándo se registró. Con
 * -- :recordId, uno; con :assetId, los de un equipo (índice records_asset). Con el equipo y su área, el plan, el
 * -- proveedor, quién registró, el certificado y, si se anuló o corrige a otro, quién, cuándo y cuál. Los
 * -- anulados siguen a la vista. `recorded_key` lleva la hora exacta para el cursor. Filtros del Historial
 * -- (M-01d): periodo por la fecha del trabajo, tipos, resultados, áreas del equipo hoy y proveedores, con
 * -- :internal para el trabajo sin proveedor.
 * SELECT
 *   r.id, r.asset_id, a.code AS "asset_code!", a.name AS "asset_name!", area.name AS "area_name?",
 *   r.plan_id, p.title AS "plan_title?", p.requirement AS "plan_requirement?",
 *   r.kind, r.performed_on, r.due_on, r.provider_id, pv.name AS "provider_name?", r.result, r.observations, r.checklist,
 *   trim_scale(r.cost) AS cost, r.valid_until, r.acceptance_criteria, ident.display_name AS "recorded_by_name?",
 *   r.recorded_at, r.recorded_at::text AS "recorded_key!",
 *   c.url AS "certificate_url?", c.byte_size AS "certificate_byte_size?", c.uploaded_at AS "certificate_uploaded_at?",
 *   r.fault_id, r.corrects_record_id, corrected.performed_on AS "corrects_performed_on?",
 *   r.voided_at, r.void_reason, voider.display_name AS "voided_by_name?",
 *   correction.id AS "corrected_by_id?", correction.performed_on AS "corrected_by_performed_on?"
 * FROM maintenance.records AS r
 * JOIN equipment.asset_directory AS a ON a.workspace_id = r.workspace_id AND a.id = r.asset_id
 * LEFT JOIN core.location_areas AS la ON la.workspace_id = a.workspace_id AND la.location_id = a.location_id
 * LEFT JOIN core.locations AS area ON area.workspace_id = la.workspace_id AND area.id = la.area_id
 * LEFT JOIN maintenance.plans AS p ON p.workspace_id = r.workspace_id AND p.id = r.plan_id
 * LEFT JOIN maintenance.providers AS pv ON pv.workspace_id = r.workspace_id AND pv.id = r.provider_id
 * LEFT JOIN maintenance.record_certificates AS c ON c.workspace_id = r.workspace_id AND c.record_id = r.id
 * LEFT JOIN core.principals AS pr ON pr.workspace_id = r.workspace_id AND pr.id = r.recorded_by_principal_id
 * LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
 * LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
 * LEFT JOIN maintenance.records AS corrected ON corrected.workspace_id = r.workspace_id AND corrected.id = r.corrects_record_id
 * LEFT JOIN maintenance.records AS correction ON correction.workspace_id = r.workspace_id AND correction.corrects_record_id = r.id
 * LEFT JOIN core.principals AS vpr ON vpr.workspace_id = r.workspace_id AND vpr.id = r.voided_by_principal_id
 * LEFT JOIN core.memberships AS vm ON vm.workspace_id = vpr.workspace_id AND vm.id = vpr.membership_id
 * LEFT JOIN core.identities AS voider ON voider.id = vm.identity_id
 * WHERE r.workspace_id = :workspaceId!
 *   AND (:recordId::uuid IS NULL OR r.id = :recordId::uuid)
 *   AND (:assetId::uuid IS NULL OR r.asset_id = :assetId::uuid)
 *   AND (:from::date IS NULL OR r.performed_on >= :from::date)
 *   AND (:to::date IS NULL OR r.performed_on <= :to::date)
 *   AND (:kinds::text[] IS NULL OR r.kind = ANY (:kinds::text[]))
 *   AND (:results::text[] IS NULL OR r.result = ANY (:results::text[]))
 *   AND (:areaIds::uuid[] IS NULL OR la.area_id = ANY (:areaIds::uuid[]))
 *   AND (:providerIds::uuid[] IS NULL AND NOT coalesce(:internal::boolean, false)
 *        OR r.provider_id = ANY (:providerIds::uuid[])
 *        OR coalesce(:internal::boolean, false) AND r.provider_id IS NULL)
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
  voided_at: Date | null;
}

/** 'RecordExists' query type */
export interface IRecordExistsQuery {
  params: IRecordExistsParams;
  result: IRecordExistsResult;
}

const recordExistsIR: any = {"usedParamSet":{"workspaceId":true,"recordId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":143,"b":155}]},{"name":"recordId","required":true,"transform":{"type":"scalar"},"locs":[{"a":166,"b":175}]}],"statement":"-- Antes de subir un certificado: el registro es del espacio y no está anulado.\nSELECT voided_at FROM maintenance.records WHERE workspace_id = :workspaceId! AND id = :recordId!"};

/**
 * Query generated from SQL:
 * ```
 * -- Antes de subir un certificado: el registro es del espacio y no está anulado.
 * SELECT voided_at FROM maintenance.records WHERE workspace_id = :workspaceId! AND id = :recordId!
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


/** 'LockRecord' parameters type */
export interface ILockRecordParams {
  recordId: string;
  workspaceId: string;
}

/** 'LockRecord' return type */
export interface ILockRecordResult {
  asset_id: string;
}

/** 'LockRecord' query type */
export interface ILockRecordQuery {
  params: ILockRecordParams;
  result: ILockRecordResult;
}

const lockRecordIR: any = {"usedParamSet":{"workspaceId":true,"recordId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":361,"b":373}]},{"name":"recordId","required":true,"transform":{"type":"scalar"},"locs":[{"a":384,"b":393}]}],"statement":"-- El registro vigente que se anula, se corrige o recibe su certificado, bloqueado: dos anulaciones a la vez no\n-- pasan las dos, y un certificado no llega a un registro recién anulado. Al bloquear, la política records_void\n-- oculta los anulados: sin fila, el registro no existe o ya está anulado.\nSELECT asset_id\nFROM maintenance.records\nWHERE workspace_id = :workspaceId! AND id = :recordId!\nFOR UPDATE"};

/**
 * Query generated from SQL:
 * ```
 * -- El registro vigente que se anula, se corrige o recibe su certificado, bloqueado: dos anulaciones a la vez no
 * -- pasan las dos, y un certificado no llega a un registro recién anulado. Al bloquear, la política records_void
 * -- oculta los anulados: sin fila, el registro no existe o ya está anulado.
 * SELECT asset_id
 * FROM maintenance.records
 * WHERE workspace_id = :workspaceId! AND id = :recordId!
 * FOR UPDATE
 * ```
 */
export const lockRecord = new PreparedQuery<ILockRecordParams,ILockRecordResult>(lockRecordIR);


/** 'VoidRecord' parameters type */
export interface IVoidRecordParams {
  actorId: string;
  reason: string;
  recordId: string;
  workspaceId: string;
}

/** 'VoidRecord' return type */
export interface IVoidRecordResult {
  id: string;
}

/** 'VoidRecord' query type */
export interface IVoidRecordQuery {
  params: IVoidRecordParams;
  result: IVoidRecordResult;
}

const voidRecordIR: any = {"usedParamSet":{"actorId":true,"reason":true,"workspaceId":true,"recordId":true},"params":[{"name":"actorId","required":true,"transform":{"type":"scalar"},"locs":[{"a":183,"b":191}]},{"name":"reason","required":true,"transform":{"type":"scalar"},"locs":[{"a":208,"b":215}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":238,"b":250}]},{"name":"recordId","required":true,"transform":{"type":"scalar"},"locs":[{"a":261,"b":270}]}],"statement":"-- Una sola vez: un anulado no vuelve a anularse (y la política records_void no lo deja ver al actualizar).\nUPDATE maintenance.records\nSET voided_at = now(), voided_by_principal_id = :actorId!, void_reason = :reason!\nWHERE workspace_id = :workspaceId! AND id = :recordId! AND voided_at IS NULL\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- Una sola vez: un anulado no vuelve a anularse (y la política records_void no lo deja ver al actualizar).
 * UPDATE maintenance.records
 * SET voided_at = now(), voided_by_principal_id = :actorId!, void_reason = :reason!
 * WHERE workspace_id = :workspaceId! AND id = :recordId! AND voided_at IS NULL
 * RETURNING id
 * ```
 */
export const voidRecord = new PreparedQuery<IVoidRecordParams,IVoidRecordResult>(voidRecordIR);


/** 'CarryCertificate' parameters type */
export interface ICarryCertificateParams {
  fromRecordId: string;
  recordId: string;
  uploadedBy: string;
  workspaceId: string;
}

/** 'CarryCertificate' return type */
export interface ICarryCertificateResult {
  id: string;
}

/** 'CarryCertificate' query type */
export interface ICarryCertificateQuery {
  params: ICarryCertificateParams;
  result: ICarryCertificateResult;
}

const carryCertificateIR: any = {"usedParamSet":{"recordId":true,"uploadedBy":true,"workspaceId":true,"fromRecordId":true},"params":[{"name":"recordId","required":true,"transform":{"type":"scalar"},"locs":[{"a":374,"b":383}]},{"name":"uploadedBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":423,"b":434}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":525,"b":537}]},{"name":"fromRecordId","required":true,"transform":{"type":"scalar"},"locs":[{"a":555,"b":568}]}],"statement":"-- La corrección lleva el certificado del anulado: una fila nueva que apunta al mismo archivo y, para no\n-- encadenar, al certificado subido de origen. Sin certificado en el anulado no inserta nada.\nINSERT INTO maintenance.record_certificates (\n  workspace_id, record_id, object_path, url, byte_size, sha256, uploaded_by_principal_id, carried_from_id\n)\nSELECT workspace_id, :recordId!, object_path, url, byte_size, sha256, :uploadedBy!, coalesce(carried_from_id, id)\nFROM maintenance.record_certificates\nWHERE workspace_id = :workspaceId! AND record_id = :fromRecordId!\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- La corrección lleva el certificado del anulado: una fila nueva que apunta al mismo archivo y, para no
 * -- encadenar, al certificado subido de origen. Sin certificado en el anulado no inserta nada.
 * INSERT INTO maintenance.record_certificates (
 *   workspace_id, record_id, object_path, url, byte_size, sha256, uploaded_by_principal_id, carried_from_id
 * )
 * SELECT workspace_id, :recordId!, object_path, url, byte_size, sha256, :uploadedBy!, coalesce(carried_from_id, id)
 * FROM maintenance.record_certificates
 * WHERE workspace_id = :workspaceId! AND record_id = :fromRecordId!
 * RETURNING id
 * ```
 */
export const carryCertificate = new PreparedQuery<ICarryCertificateParams,ICarryCertificateResult>(carryCertificateIR);


