/** Types generated for queries found in "src/modules/labs/infrastructure/requests.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

export type stringArray = (string)[];

/** 'NextRequestNumber' parameters type */
export interface INextRequestNumberParams {
  workspaceId: string;
}

/** 'NextRequestNumber' return type */
export interface INextRequestNumberResult {
  number: number;
}

/** 'NextRequestNumber' query type */
export interface INextRequestNumberQuery {
  params: INextRequestNumberParams;
  result: INextRequestNumberResult;
}

const nextRequestNumberIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":238,"b":250}]}],"statement":"-- El número siguiente del espacio (SOL-0042). La fila del contador serializa a quienes crean a la vez, y un\n-- número tomado no vuelve aunque la solicitud se cancele.\nINSERT INTO labs.request_counters (workspace_id, last_number)\nVALUES (:workspaceId!, 1)\nON CONFLICT (workspace_id) DO UPDATE SET last_number = labs.request_counters.last_number + 1\nRETURNING last_number AS \"number!\""};

/**
 * Query generated from SQL:
 * ```
 * -- El número siguiente del espacio (SOL-0042). La fila del contador serializa a quienes crean a la vez, y un
 * -- número tomado no vuelve aunque la solicitud se cancele.
 * INSERT INTO labs.request_counters (workspace_id, last_number)
 * VALUES (:workspaceId!, 1)
 * ON CONFLICT (workspace_id) DO UPDATE SET last_number = labs.request_counters.last_number + 1
 * RETURNING last_number AS "number!"
 * ```
 */
export const nextRequestNumber = new PreparedQuery<INextRequestNumberParams,INextRequestNumberResult>(nextRequestNumberIR);


/** 'ActiveFormRevision' parameters type */
export interface IActiveFormRevisionParams {
  formId: string;
  workspaceId: string;
}

/** 'ActiveFormRevision' return type */
export interface IActiveFormRevisionResult {
  revision: number | null;
}

/** 'ActiveFormRevision' query type */
export interface IActiveFormRevisionQuery {
  params: IActiveFormRevisionParams;
  result: IActiveFormRevisionResult;
}

const activeFormRevisionIR: any = {"usedParamSet":{"workspaceId":true,"formId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":241,"b":253}]},{"name":"formId","required":true,"transform":{"type":"scalar"},"locs":[{"a":266,"b":273}]}],"statement":"-- La última revisión de un formato activo: la que llena un borrador nuevo.\nSELECT max(r.revision) AS revision\nFROM labs.forms AS f\nJOIN labs.form_revisions AS r ON r.workspace_id = f.workspace_id AND r.form_id = f.id\nWHERE f.workspace_id = :workspaceId! AND f.id = :formId! AND f.archived_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * -- La última revisión de un formato activo: la que llena un borrador nuevo.
 * SELECT max(r.revision) AS revision
 * FROM labs.forms AS f
 * JOIN labs.form_revisions AS r ON r.workspace_id = f.workspace_id AND r.form_id = f.id
 * WHERE f.workspace_id = :workspaceId! AND f.id = :formId! AND f.archived_at IS NULL
 * ```
 */
export const activeFormRevision = new PreparedQuery<IActiveFormRevisionParams,IActiveFormRevisionResult>(activeFormRevisionIR);


/** 'RevisionLayout' parameters type */
export interface IRevisionLayoutParams {
  formId: string;
  revision: number;
  workspaceId: string;
}

/** 'RevisionLayout' return type */
export interface IRevisionLayoutResult {
  layout: Json;
}

/** 'RevisionLayout' query type */
export interface IRevisionLayoutQuery {
  params: IRevisionLayoutParams;
  result: IRevisionLayoutResult;
}

const revisionLayoutIR: any = {"usedParamSet":{"workspaceId":true,"formId":true,"revision":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":60,"b":72}]},{"name":"formId","required":true,"transform":{"type":"scalar"},"locs":[{"a":88,"b":95}]},{"name":"revision","required":true,"transform":{"type":"scalar"},"locs":[{"a":112,"b":121}]}],"statement":"SELECT layout\nFROM labs.form_revisions\nWHERE workspace_id = :workspaceId! AND form_id = :formId! AND revision = :revision!"};

/**
 * Query generated from SQL:
 * ```
 * SELECT layout
 * FROM labs.form_revisions
 * WHERE workspace_id = :workspaceId! AND form_id = :formId! AND revision = :revision!
 * ```
 */
export const revisionLayout = new PreparedQuery<IRevisionLayoutParams,IRevisionLayoutResult>(revisionLayoutIR);


/** 'InsertRequest' parameters type */
export interface IInsertRequestParams {
  activityType?: string | null | void;
  answers: Json;
  areaId?: string | null | void;
  careerId?: string | null | void;
  dates: stringArray;
  endsAt?: DateOrString | null | void;
  formId: string;
  formRevision: number;
  groups: number;
  notes?: string | null | void;
  number: number;
  participants?: number | null | void;
  requesterId: string;
  startsAt?: DateOrString | null | void;
  subjectId?: string | null | void;
  teacherName?: string | null | void;
  title?: string | null | void;
  workspaceId: string;
}

/** 'InsertRequest' return type */
export interface IInsertRequestResult {
  id: string;
}

/** 'InsertRequest' query type */
export interface IInsertRequestQuery {
  params: IInsertRequestParams;
  result: IInsertRequestResult;
}

const insertRequestIR: any = {"usedParamSet":{"workspaceId":true,"number":true,"formId":true,"formRevision":true,"requesterId":true,"title":true,"teacherName":true,"activityType":true,"subjectId":true,"careerId":true,"dates":true,"startsAt":true,"endsAt":true,"participants":true,"groups":true,"areaId":true,"answers":true,"notes":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":240,"b":252}]},{"name":"number","required":true,"transform":{"type":"scalar"},"locs":[{"a":255,"b":262}]},{"name":"formId","required":true,"transform":{"type":"scalar"},"locs":[{"a":265,"b":272}]},{"name":"formRevision","required":true,"transform":{"type":"scalar"},"locs":[{"a":275,"b":288}]},{"name":"requesterId","required":true,"transform":{"type":"scalar"},"locs":[{"a":291,"b":303}]},{"name":"title","required":false,"transform":{"type":"scalar"},"locs":[{"a":306,"b":311}]},{"name":"teacherName","required":false,"transform":{"type":"scalar"},"locs":[{"a":314,"b":325}]},{"name":"activityType","required":false,"transform":{"type":"scalar"},"locs":[{"a":328,"b":340}]},{"name":"subjectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":343,"b":352}]},{"name":"careerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":357,"b":365}]},{"name":"dates","required":true,"transform":{"type":"scalar"},"locs":[{"a":368,"b":374}]},{"name":"startsAt","required":false,"transform":{"type":"scalar"},"locs":[{"a":385,"b":393}]},{"name":"endsAt","required":false,"transform":{"type":"scalar"},"locs":[{"a":402,"b":408}]},{"name":"participants","required":false,"transform":{"type":"scalar"},"locs":[{"a":417,"b":429}]},{"name":"groups","required":true,"transform":{"type":"scalar"},"locs":[{"a":432,"b":439}]},{"name":"areaId","required":false,"transform":{"type":"scalar"},"locs":[{"a":442,"b":448}]},{"name":"answers","required":true,"transform":{"type":"scalar"},"locs":[{"a":451,"b":459}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":469,"b":474}]}],"statement":"INSERT INTO labs.requests (workspace_id, number, form_id, form_revision, requester_principal_id, title, teacher_name,\n  activity_type, subject_id, career_id, dates, starts_at, ends_at, participants, groups, area_id, answers, notes)\nVALUES (:workspaceId!, :number!, :formId!, :formRevision!, :requesterId!, :title, :teacherName, :activityType, :subjectId,\n  :careerId, :dates!::date[], :startsAt::time, :endsAt::time, :participants, :groups!, :areaId, :answers!::jsonb, :notes)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO labs.requests (workspace_id, number, form_id, form_revision, requester_principal_id, title, teacher_name,
 *   activity_type, subject_id, career_id, dates, starts_at, ends_at, participants, groups, area_id, answers, notes)
 * VALUES (:workspaceId!, :number!, :formId!, :formRevision!, :requesterId!, :title, :teacherName, :activityType, :subjectId,
 *   :careerId, :dates!::date[], :startsAt::time, :endsAt::time, :participants, :groups!, :areaId, :answers!::jsonb, :notes)
 * RETURNING id
 * ```
 */
export const insertRequest = new PreparedQuery<IInsertRequestParams,IInsertRequestResult>(insertRequestIR);


/** 'ListRequests' parameters type */
export interface IListRequestsParams {
  requesterId?: string | null | void;
  requestId?: string | null | void;
  workspaceId: string;
}

/** 'ListRequests' return type */
export interface IListRequestsResult {
  activity_type: string | null;
  answers: Json;
  area_id: string | null;
  career: string | null;
  dates: stringArray;
  document_code: string | null;
  ends_at: string | null;
  form_id: string;
  form_name: string;
  form_revision: number;
  form_title: string;
  groups: number;
  id: string;
  late: boolean;
  layout: Json;
  notes: string | null;
  number: number;
  participants: number | null;
  requester_name: string;
  requester_principal_id: string;
  starts_at: string | null;
  status: string;
  subject: string | null;
  submitted_at: Date | null;
  teacher_name: string | null;
  title: string | null;
  version: number;
}

/** 'ListRequests' query type */
export interface IListRequestsQuery {
  params: IListRequestsParams;
  result: IListRequestsResult;
}

const listRequestsIR: any = {"usedParamSet":{"workspaceId":true,"requestId":true,"requesterId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":1474,"b":1486}]},{"name":"requestId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1505,"b":1514},{"a":1546,"b":1555}]},{"name":"requesterId","required":false,"transform":{"type":"scalar"},"locs":[{"a":1580,"b":1591},{"a":1643,"b":1654}]}],"statement":"-- Con :requestId, solo esa (quién la ve lo decide el comando). Si no, con :requesterId, las de esa persona\n-- (borradores incluidos), o las recibidas: sin borradores. Activas primero y, dentro, por la fecha más próxima.\nSELECT\n  q.id, q.number, q.status, q.form_id, q.form_revision, f.name AS form_name, r.title AS form_title, r.document_code,\n  r.layout, q.requester_principal_id, coalesce(ident.display_name, '') AS \"requester_name!\",\n  q.title, q.teacher_name, q.activity_type, subject.name AS \"subject?\", career.name AS \"career?\",\n  q.dates::text[] AS \"dates!\", to_char(q.starts_at, 'HH24:MI') AS starts_at, to_char(q.ends_at, 'HH24:MI') AS ends_at,\n  q.participants, q.groups, q.area_id, q.answers, q.notes, q.late, q.submitted_at, q.version\nFROM labs.requests AS q\nJOIN labs.forms AS f ON f.workspace_id = q.workspace_id AND f.id = q.form_id\nJOIN labs.form_revisions AS r ON r.workspace_id = q.workspace_id AND r.form_id = q.form_id AND r.revision = q.form_revision\nLEFT JOIN labs.list_values AS subject ON subject.workspace_id = q.workspace_id AND subject.id = q.subject_id\nLEFT JOIN labs.list_values AS career ON career.workspace_id = q.workspace_id AND career.id = q.career_id\nLEFT JOIN core.principals AS pr ON pr.workspace_id = q.workspace_id AND pr.id = q.requester_principal_id\nLEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\nLEFT JOIN core.identities AS ident ON ident.id = m.identity_id\nWHERE q.workspace_id = :workspaceId!\n  AND (CASE WHEN :requestId::uuid IS NOT NULL THEN q.id = :requestId::uuid\n            WHEN :requesterId::uuid IS NOT NULL THEN q.requester_principal_id = :requesterId::uuid\n            ELSE q.status <> 'draft' END)\nORDER BY q.status IN ('rejected', 'cancelled'), q.dates[1] NULLS LAST, q.number DESC\nLIMIT 500"};

/**
 * Query generated from SQL:
 * ```
 * -- Con :requestId, solo esa (quién la ve lo decide el comando). Si no, con :requesterId, las de esa persona
 * -- (borradores incluidos), o las recibidas: sin borradores. Activas primero y, dentro, por la fecha más próxima.
 * SELECT
 *   q.id, q.number, q.status, q.form_id, q.form_revision, f.name AS form_name, r.title AS form_title, r.document_code,
 *   r.layout, q.requester_principal_id, coalesce(ident.display_name, '') AS "requester_name!",
 *   q.title, q.teacher_name, q.activity_type, subject.name AS "subject?", career.name AS "career?",
 *   q.dates::text[] AS "dates!", to_char(q.starts_at, 'HH24:MI') AS starts_at, to_char(q.ends_at, 'HH24:MI') AS ends_at,
 *   q.participants, q.groups, q.area_id, q.answers, q.notes, q.late, q.submitted_at, q.version
 * FROM labs.requests AS q
 * JOIN labs.forms AS f ON f.workspace_id = q.workspace_id AND f.id = q.form_id
 * JOIN labs.form_revisions AS r ON r.workspace_id = q.workspace_id AND r.form_id = q.form_id AND r.revision = q.form_revision
 * LEFT JOIN labs.list_values AS subject ON subject.workspace_id = q.workspace_id AND subject.id = q.subject_id
 * LEFT JOIN labs.list_values AS career ON career.workspace_id = q.workspace_id AND career.id = q.career_id
 * LEFT JOIN core.principals AS pr ON pr.workspace_id = q.workspace_id AND pr.id = q.requester_principal_id
 * LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
 * LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
 * WHERE q.workspace_id = :workspaceId!
 *   AND (CASE WHEN :requestId::uuid IS NOT NULL THEN q.id = :requestId::uuid
 *             WHEN :requesterId::uuid IS NOT NULL THEN q.requester_principal_id = :requesterId::uuid
 *             ELSE q.status <> 'draft' END)
 * ORDER BY q.status IN ('rejected', 'cancelled'), q.dates[1] NULLS LAST, q.number DESC
 * LIMIT 500
 * ```
 */
export const listRequests = new PreparedQuery<IListRequestsParams,IListRequestsResult>(listRequestsIR);


/** 'RequestLines' parameters type */
export interface IRequestLinesParams {
  requestIds: stringArray;
  workspaceId: string;
}

/** 'RequestLines' return type */
export interface IRequestLinesResult {
  asset_type_id: string | null;
  description: string | null;
  item_id: string | null;
  kind: string;
  line: number;
  per_group: string | null;
  quantity: string;
  request_id: string;
  unit: string | null;
}

/** 'RequestLines' query type */
export interface IRequestLinesQuery {
  params: IRequestLinesParams;
  result: IRequestLinesResult;
}

const requestLinesIR: any = {"usedParamSet":{"workspaceId":true,"requestIds":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":205,"b":217}]},{"name":"requestIds","required":true,"transform":{"type":"scalar"},"locs":[{"a":241,"b":252}]}],"statement":"SELECT request_id, line, kind, item_id, asset_type_id, description, trim_scale(quantity)::text AS \"quantity!\",\n  trim_scale(per_group)::text AS per_group, unit\nFROM labs.request_lines\nWHERE workspace_id = :workspaceId! AND request_id = ANY (:requestIds!::uuid[])\nORDER BY request_id, line"};

/**
 * Query generated from SQL:
 * ```
 * SELECT request_id, line, kind, item_id, asset_type_id, description, trim_scale(quantity)::text AS "quantity!",
 *   trim_scale(per_group)::text AS per_group, unit
 * FROM labs.request_lines
 * WHERE workspace_id = :workspaceId! AND request_id = ANY (:requestIds!::uuid[])
 * ORDER BY request_id, line
 * ```
 */
export const requestLines = new PreparedQuery<IRequestLinesParams,IRequestLinesResult>(requestLinesIR);


/** 'RequestEvents' parameters type */
export interface IRequestEventsParams {
  requestId: string;
  workspaceId: string;
}

/** 'RequestEvents' return type */
export interface IRequestEventsResult {
  action: string;
  by: string;
  created_at: Date;
  reason: string | null;
}

/** 'RequestEvents' query type */
export interface IRequestEventsQuery {
  params: IRequestEventsParams;
  result: IRequestEventsResult;
}

const requestEventsIR: any = {"usedParamSet":{"workspaceId":true,"requestId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":390,"b":402}]},{"name":"requestId","required":true,"transform":{"type":"scalar"},"locs":[{"a":423,"b":433}]}],"statement":"SELECT e.action, e.reason, coalesce(ident.display_name, '') AS \"by!\", e.created_at\nFROM labs.request_events AS e\nLEFT JOIN core.principals AS pr ON pr.workspace_id = e.workspace_id AND pr.id = e.principal_id\nLEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\nLEFT JOIN core.identities AS ident ON ident.id = m.identity_id\nWHERE e.workspace_id = :workspaceId! AND e.request_id = :requestId!\nORDER BY e.created_at, e.id"};

/**
 * Query generated from SQL:
 * ```
 * SELECT e.action, e.reason, coalesce(ident.display_name, '') AS "by!", e.created_at
 * FROM labs.request_events AS e
 * LEFT JOIN core.principals AS pr ON pr.workspace_id = e.workspace_id AND pr.id = e.principal_id
 * LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
 * LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
 * WHERE e.workspace_id = :workspaceId! AND e.request_id = :requestId!
 * ORDER BY e.created_at, e.id
 * ```
 */
export const requestEvents = new PreparedQuery<IRequestEventsParams,IRequestEventsResult>(requestEventsIR);


/** 'LockRequest' parameters type */
export interface ILockRequestParams {
  requestId: string;
  workspaceId: string;
}

/** 'LockRequest' return type */
export interface ILockRequestResult {
  requester_principal_id: string;
  status: string;
  version: number;
}

/** 'LockRequest' query type */
export interface ILockRequestQuery {
  params: ILockRequestParams;
  result: ILockRequestResult;
}

const lockRequestIR: any = {"usedParamSet":{"workspaceId":true,"requestId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":182,"b":194}]},{"name":"requestId","required":true,"transform":{"type":"scalar"},"locs":[{"a":205,"b":215}]}],"statement":"-- Lo último del orden de bloqueo (02 §6): la solicitud que se guarda, se envía o se resuelve.\nSELECT status, version, requester_principal_id\nFROM labs.requests\nWHERE workspace_id = :workspaceId! AND id = :requestId!\nFOR UPDATE"};

/**
 * Query generated from SQL:
 * ```
 * -- Lo último del orden de bloqueo (02 §6): la solicitud que se guarda, se envía o se resuelve.
 * SELECT status, version, requester_principal_id
 * FROM labs.requests
 * WHERE workspace_id = :workspaceId! AND id = :requestId!
 * FOR UPDATE
 * ```
 */
export const lockRequest = new PreparedQuery<ILockRequestParams,ILockRequestResult>(lockRequestIR);


/** 'InsertListValue' parameters type */
export interface IInsertListValueParams {
  createdBy: string;
  kind: string;
  name: string;
  workspaceId: string;
}

/** 'InsertListValue' return type */
export interface IInsertListValueResult {
  id: string;
}

/** 'InsertListValue' query type */
export interface IInsertListValueQuery {
  params: IInsertListValueParams;
  result: IInsertListValueResult;
}

const insertListValueIR: any = {"usedParamSet":{"workspaceId":true,"kind":true,"name":true,"createdBy":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":170,"b":182}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":185,"b":190}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":193,"b":198}]},{"name":"createdBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":201,"b":211}]}],"statement":"-- Un nombre que ya está en la lista (sin tildes ni mayúsculas) no inserta nada.\nINSERT INTO labs.list_values (workspace_id, kind, name, created_by_principal_id)\nVALUES (:workspaceId!, :kind!, :name!, :createdBy!)\nON CONFLICT (workspace_id, kind, core.fold_text(name)) DO NOTHING\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- Un nombre que ya está en la lista (sin tildes ni mayúsculas) no inserta nada.
 * INSERT INTO labs.list_values (workspace_id, kind, name, created_by_principal_id)
 * VALUES (:workspaceId!, :kind!, :name!, :createdBy!)
 * ON CONFLICT (workspace_id, kind, core.fold_text(name)) DO NOTHING
 * RETURNING id
 * ```
 */
export const insertListValue = new PreparedQuery<IInsertListValueParams,IInsertListValueResult>(insertListValueIR);


/** 'ListValueNamed' parameters type */
export interface IListValueNamedParams {
  kind: string;
  name: string;
  workspaceId: string;
}

/** 'ListValueNamed' return type */
export interface IListValueNamedResult {
  id: string;
}

/** 'ListValueNamed' query type */
export interface IListValueNamedQuery {
  params: IListValueNamedParams;
  result: IListValueNamedResult;
}

const listValueNamedIR: any = {"usedParamSet":{"workspaceId":true,"kind":true,"name":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":53,"b":65}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":78,"b":83}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":127,"b":132}]}],"statement":"SELECT id\nFROM labs.list_values\nWHERE workspace_id = :workspaceId! AND kind = :kind! AND core.fold_text(name) = core.fold_text(:name!)"};

/**
 * Query generated from SQL:
 * ```
 * SELECT id
 * FROM labs.list_values
 * WHERE workspace_id = :workspaceId! AND kind = :kind! AND core.fold_text(name) = core.fold_text(:name!)
 * ```
 */
export const listValueNamed = new PreparedQuery<IListValueNamedParams,IListValueNamedResult>(listValueNamedIR);


/** 'ListValues' parameters type */
export interface IListValuesParams {
  workspaceId: string;
}

/** 'ListValues' return type */
export interface IListValuesResult {
  kind: string;
  name: string;
}

/** 'ListValues' query type */
export interface IListValuesQuery {
  params: IListValuesParams;
  result: IListValuesResult;
}

const listValuesIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":61,"b":73}]}],"statement":"SELECT kind, name\nFROM labs.list_values\nWHERE workspace_id = :workspaceId!\nORDER BY kind, core.fold_text(name)"};

/**
 * Query generated from SQL:
 * ```
 * SELECT kind, name
 * FROM labs.list_values
 * WHERE workspace_id = :workspaceId!
 * ORDER BY kind, core.fold_text(name)
 * ```
 */
export const listValues = new PreparedQuery<IListValuesParams,IListValuesResult>(listValuesIR);


/** 'ActiveSpace' parameters type */
export interface IActiveSpaceParams {
  areaId: string;
  workspaceId: string;
}

/** 'ActiveSpace' return type */
export interface IActiveSpaceResult {
  found: number;
}

/** 'ActiveSpace' query type */
export interface IActiveSpaceQuery {
  params: IActiveSpaceParams;
  result: IActiveSpaceResult;
}

const activeSpaceIR: any = {"usedParamSet":{"workspaceId":true,"areaId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":59,"b":71}]},{"name":"areaId","required":true,"transform":{"type":"scalar"},"locs":[{"a":87,"b":94}]}],"statement":"SELECT 1 AS \"found!\"\nFROM labs.spaces\nWHERE workspace_id = :workspaceId! AND area_id = :areaId! AND archived_at IS NULL"};

/**
 * Query generated from SQL:
 * ```
 * SELECT 1 AS "found!"
 * FROM labs.spaces
 * WHERE workspace_id = :workspaceId! AND area_id = :areaId! AND archived_at IS NULL
 * ```
 */
export const activeSpace = new PreparedQuery<IActiveSpaceParams,IActiveSpaceResult>(activeSpaceIR);


/** 'WriteRequest' parameters type */
export interface IWriteRequestParams {
  activityType?: string | null | void;
  answers: Json;
  areaId?: string | null | void;
  careerId?: string | null | void;
  dates: stringArray;
  endsAt?: DateOrString | null | void;
  groups: number;
  notes?: string | null | void;
  participants?: number | null | void;
  requestId: string;
  startsAt?: DateOrString | null | void;
  subjectId?: string | null | void;
  teacherName?: string | null | void;
  title?: string | null | void;
  workspaceId: string;
}

/** 'WriteRequest' return type */
export type IWriteRequestResult = void;

/** 'WriteRequest' query type */
export interface IWriteRequestQuery {
  params: IWriteRequestParams;
  result: IWriteRequestResult;
}

const writeRequestIR: any = {"usedParamSet":{"title":true,"teacherName":true,"activityType":true,"subjectId":true,"careerId":true,"dates":true,"startsAt":true,"endsAt":true,"participants":true,"groups":true,"areaId":true,"answers":true,"notes":true,"workspaceId":true,"requestId":true},"params":[{"name":"title","required":false,"transform":{"type":"scalar"},"locs":[{"a":33,"b":38}]},{"name":"teacherName","required":false,"transform":{"type":"scalar"},"locs":[{"a":56,"b":67}]},{"name":"activityType","required":false,"transform":{"type":"scalar"},"locs":[{"a":86,"b":98}]},{"name":"subjectId","required":false,"transform":{"type":"scalar"},"locs":[{"a":114,"b":123}]},{"name":"careerId","required":false,"transform":{"type":"scalar"},"locs":[{"a":140,"b":148}]},{"name":"dates","required":true,"transform":{"type":"scalar"},"locs":[{"a":159,"b":165}]},{"name":"startsAt","required":false,"transform":{"type":"scalar"},"locs":[{"a":188,"b":196}]},{"name":"endsAt","required":false,"transform":{"type":"scalar"},"locs":[{"a":215,"b":221}]},{"name":"participants","required":false,"transform":{"type":"scalar"},"locs":[{"a":247,"b":259}]},{"name":"groups","required":true,"transform":{"type":"scalar"},"locs":[{"a":271,"b":278}]},{"name":"areaId","required":false,"transform":{"type":"scalar"},"locs":[{"a":291,"b":297}]},{"name":"answers","required":true,"transform":{"type":"scalar"},"locs":[{"a":310,"b":318}]},{"name":"notes","required":false,"transform":{"type":"scalar"},"locs":[{"a":336,"b":341}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":389,"b":401}]},{"name":"requestId","required":true,"transform":{"type":"scalar"},"locs":[{"a":412,"b":422}]}],"statement":"UPDATE labs.requests\nSET title = :title, teacher_name = :teacherName, activity_type = :activityType, subject_id = :subjectId,\n  career_id = :careerId, dates = :dates!::date[], starts_at = :startsAt::time, ends_at = :endsAt::time,\n  participants = :participants, groups = :groups!, area_id = :areaId, answers = :answers!::jsonb, notes = :notes,\n  version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :requestId!"};

/**
 * Query generated from SQL:
 * ```
 * UPDATE labs.requests
 * SET title = :title, teacher_name = :teacherName, activity_type = :activityType, subject_id = :subjectId,
 *   career_id = :careerId, dates = :dates!::date[], starts_at = :startsAt::time, ends_at = :endsAt::time,
 *   participants = :participants, groups = :groups!, area_id = :areaId, answers = :answers!::jsonb, notes = :notes,
 *   version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :requestId!
 * ```
 */
export const writeRequest = new PreparedQuery<IWriteRequestParams,IWriteRequestResult>(writeRequestIR);


/** 'DeleteRequestLines' parameters type */
export interface IDeleteRequestLinesParams {
  requestId: string;
  workspaceId: string;
}

/** 'DeleteRequestLines' return type */
export type IDeleteRequestLinesResult = void;

/** 'DeleteRequestLines' query type */
export interface IDeleteRequestLinesQuery {
  params: IDeleteRequestLinesParams;
  result: IDeleteRequestLinesResult;
}

const deleteRequestLinesIR: any = {"usedParamSet":{"workspaceId":true,"requestId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":52,"b":64}]},{"name":"requestId","required":true,"transform":{"type":"scalar"},"locs":[{"a":83,"b":93}]}],"statement":"DELETE FROM labs.request_lines\nWHERE workspace_id = :workspaceId! AND request_id = :requestId!"};

/**
 * Query generated from SQL:
 * ```
 * DELETE FROM labs.request_lines
 * WHERE workspace_id = :workspaceId! AND request_id = :requestId!
 * ```
 */
export const deleteRequestLines = new PreparedQuery<IDeleteRequestLinesParams,IDeleteRequestLinesResult>(deleteRequestLinesIR);


/** 'InsertRequestLines' parameters type */
export interface IInsertRequestLinesParams {
  groups: number;
  lines: Json;
  requestId: string;
  workspaceId: string;
}

/** 'InsertRequestLines' return type */
export type IInsertRequestLinesResult = void;

/** 'InsertRequestLines' query type */
export interface IInsertRequestLinesQuery {
  params: IInsertRequestLinesParams;
  result: IInsertRequestLinesResult;
}

const insertRequestLinesIR: any = {"usedParamSet":{"workspaceId":true,"requestId":true,"groups":true,"lines":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":313,"b":325}]},{"name":"requestId","required":true,"transform":{"type":"scalar"},"locs":[{"a":328,"b":338}]},{"name":"groups","required":true,"transform":{"type":"scalar"},"locs":[{"a":422,"b":429}]},{"name":"lines","required":true,"transform":{"type":"scalar"},"locs":[{"a":500,"b":506}]}],"statement":"-- Todas las líneas en una sentencia, numeradas en el orden en que llegan. Con «por grupo», el total es por grupo\n-- × :groups (ADR 0023, «Cantidades»), exacto en numeric.\nINSERT INTO labs.request_lines (workspace_id, request_id, line, kind, item_id, asset_type_id, description, quantity, per_group, unit)\nSELECT :workspaceId!, :requestId!, e.n, l.kind, l.item_id, l.asset_type_id, l.description,\n  coalesce(l.per_group * :groups!::integer, l.quantity), l.per_group, l.unit\nFROM jsonb_array_elements(:lines!::jsonb) WITH ORDINALITY AS e (value, n)\nCROSS JOIN LATERAL jsonb_to_record(e.value) AS l (kind text, item_id uuid, asset_type_id uuid, description text,\n  quantity numeric, per_group numeric, unit text)"};

/**
 * Query generated from SQL:
 * ```
 * -- Todas las líneas en una sentencia, numeradas en el orden en que llegan. Con «por grupo», el total es por grupo
 * -- × :groups (ADR 0023, «Cantidades»), exacto en numeric.
 * INSERT INTO labs.request_lines (workspace_id, request_id, line, kind, item_id, asset_type_id, description, quantity, per_group, unit)
 * SELECT :workspaceId!, :requestId!, e.n, l.kind, l.item_id, l.asset_type_id, l.description,
 *   coalesce(l.per_group * :groups!::integer, l.quantity), l.per_group, l.unit
 * FROM jsonb_array_elements(:lines!::jsonb) WITH ORDINALITY AS e (value, n)
 * CROSS JOIN LATERAL jsonb_to_record(e.value) AS l (kind text, item_id uuid, asset_type_id uuid, description text,
 *   quantity numeric, per_group numeric, unit text)
 * ```
 */
export const insertRequestLines = new PreparedQuery<IInsertRequestLinesParams,IInsertRequestLinesResult>(insertRequestLinesIR);


/** 'SetRequestStatus' parameters type */
export interface ISetRequestStatusParams {
  late?: boolean | null | void;
  requestId: string;
  status: string;
  submittedAt?: DateOrString | null | void;
  workspaceId: string;
}

/** 'SetRequestStatus' return type */
export type ISetRequestStatusResult = void;

/** 'SetRequestStatus' query type */
export interface ISetRequestStatusQuery {
  params: ISetRequestStatusParams;
  result: ISetRequestStatusResult;
}

const setRequestStatusIR: any = {"usedParamSet":{"status":true,"late":true,"submittedAt":true,"workspaceId":true,"requestId":true},"params":[{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":137,"b":144}]},{"name":"late","required":false,"transform":{"type":"scalar"},"locs":[{"a":163,"b":167}]},{"name":"submittedAt","required":false,"transform":{"type":"scalar"},"locs":[{"a":201,"b":212}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":288,"b":300}]},{"name":"requestId","required":true,"transform":{"type":"scalar"},"locs":[{"a":311,"b":321}]}],"statement":"-- Enviar fija la fecha de envío y si llega fuera de plazo; resolver o cancelar solo cambia el estado.\nUPDATE labs.requests\nSET status = :status!, late = coalesce(:late, late), submitted_at = coalesce(:submittedAt::timestamptz, submitted_at),\n  version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :requestId!"};

/**
 * Query generated from SQL:
 * ```
 * -- Enviar fija la fecha de envío y si llega fuera de plazo; resolver o cancelar solo cambia el estado.
 * UPDATE labs.requests
 * SET status = :status!, late = coalesce(:late, late), submitted_at = coalesce(:submittedAt::timestamptz, submitted_at),
 *   version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :requestId!
 * ```
 */
export const setRequestStatus = new PreparedQuery<ISetRequestStatusParams,ISetRequestStatusResult>(setRequestStatusIR);


/** 'InsertRequestEvent' parameters type */
export interface IInsertRequestEventParams {
  action: string;
  principalId: string;
  reason?: string | null | void;
  requestId: string;
  workspaceId: string;
}

/** 'InsertRequestEvent' return type */
export type IInsertRequestEventResult = void;

/** 'InsertRequestEvent' query type */
export interface IInsertRequestEventQuery {
  params: IInsertRequestEventParams;
  result: IInsertRequestEventResult;
}

const insertRequestEventIR: any = {"usedParamSet":{"workspaceId":true,"requestId":true,"action":true,"reason":true,"principalId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":97,"b":109}]},{"name":"requestId","required":true,"transform":{"type":"scalar"},"locs":[{"a":112,"b":122}]},{"name":"action","required":true,"transform":{"type":"scalar"},"locs":[{"a":125,"b":132}]},{"name":"reason","required":false,"transform":{"type":"scalar"},"locs":[{"a":135,"b":141}]},{"name":"principalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":144,"b":156}]}],"statement":"INSERT INTO labs.request_events (workspace_id, request_id, action, reason, principal_id)\nVALUES (:workspaceId!, :requestId!, :action!, :reason, :principalId!)"};

/**
 * Query generated from SQL:
 * ```
 * INSERT INTO labs.request_events (workspace_id, request_id, action, reason, principal_id)
 * VALUES (:workspaceId!, :requestId!, :action!, :reason, :principalId!)
 * ```
 */
export const insertRequestEvent = new PreparedQuery<IInsertRequestEventParams,IInsertRequestEventResult>(insertRequestEventIR);


/** 'DatesOutsidePeriods' parameters type */
export interface IDatesOutsidePeriodsParams {
  dates: stringArray;
  workspaceId: string;
}

/** 'DatesOutsidePeriods' return type */
export interface IDatesOutsidePeriodsResult {
  date: string;
}

/** 'DatesOutsidePeriods' query type */
export interface IDatesOutsidePeriodsQuery {
  params: IDatesOutsidePeriodsParams;
  result: IDatesOutsidePeriodsResult;
}

const datesOutsidePeriodsIR: any = {"usedParamSet":{"dates":true,"workspaceId":true},"params":[{"name":"dates","required":true,"transform":{"type":"scalar"},"locs":[{"a":119,"b":125}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":219,"b":231}]}],"statement":"-- Las fechas que no caen en ningún período activo: fuera de ellos no se agenda.\nSELECT d::text AS \"date!\"\nFROM unnest(:dates!::date[]) AS d\nWHERE NOT EXISTS (\n  SELECT 1 FROM labs.periods AS p\n  WHERE p.workspace_id = :workspaceId! AND p.archived_at IS NULL AND d BETWEEN p.starts_on AND p.ends_on\n)\nORDER BY d"};

/**
 * Query generated from SQL:
 * ```
 * -- Las fechas que no caen en ningún período activo: fuera de ellos no se agenda.
 * SELECT d::text AS "date!"
 * FROM unnest(:dates!::date[]) AS d
 * WHERE NOT EXISTS (
 *   SELECT 1 FROM labs.periods AS p
 *   WHERE p.workspace_id = :workspaceId! AND p.archived_at IS NULL AND d BETWEEN p.starts_on AND p.ends_on
 * )
 * ORDER BY d
 * ```
 */
export const datesOutsidePeriods = new PreparedQuery<IDatesOutsidePeriodsParams,IDatesOutsidePeriodsResult>(datesOutsidePeriodsIR);


