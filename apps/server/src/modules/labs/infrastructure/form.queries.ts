/** Types generated for queries found in "src/modules/labs/infrastructure/form.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** 'ListForms' parameters type */
export interface IListFormsParams {
  includeArchived: boolean;
  workspaceId: string;
}

/** 'ListForms' return type */
export interface IListFormsResult {
  archived_at: Date | null;
  id: string;
  name: string;
  published_at: Date;
  revision: number;
  title: string;
  version: number;
}

/** 'ListForms' query type */
export interface IListFormsQuery {
  params: IListFormsParams;
  result: IListFormsResult;
}

const listFormsIR: any = {"usedParamSet":{"workspaceId":true,"includeArchived":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":377,"b":389}]},{"name":"includeArchived","required":true,"transform":{"type":"scalar"},"locs":[{"a":396,"b":412}]}],"statement":"-- Activos primero, por nombre, con su última revisión; los archivados solo con :includeArchived.\nSELECT f.id, f.name, f.version, f.archived_at, r.revision, r.title, r.published_at\nFROM labs.forms AS f\nCROSS JOIN LATERAL (\n  SELECT revision, title, published_at\n  FROM labs.form_revisions\n  WHERE form_id = f.id\n  ORDER BY revision DESC\n  LIMIT 1\n) AS r\nWHERE f.workspace_id = :workspaceId! AND (:includeArchived! OR f.archived_at IS NULL)\nORDER BY f.archived_at IS NOT NULL, core.fold_text(f.name), f.id"};

/**
 * Query generated from SQL:
 * ```
 * -- Activos primero, por nombre, con su última revisión; los archivados solo con :includeArchived.
 * SELECT f.id, f.name, f.version, f.archived_at, r.revision, r.title, r.published_at
 * FROM labs.forms AS f
 * CROSS JOIN LATERAL (
 *   SELECT revision, title, published_at
 *   FROM labs.form_revisions
 *   WHERE form_id = f.id
 *   ORDER BY revision DESC
 *   LIMIT 1
 * ) AS r
 * WHERE f.workspace_id = :workspaceId! AND (:includeArchived! OR f.archived_at IS NULL)
 * ORDER BY f.archived_at IS NOT NULL, core.fold_text(f.name), f.id
 * ```
 */
export const listForms = new PreparedQuery<IListFormsParams,IListFormsResult>(listFormsIR);


/** 'FormById' parameters type */
export interface IFormByIdParams {
  formId: string;
  workspaceId: string;
}

/** 'FormById' return type */
export interface IFormByIdResult {
  archived_at: Date | null;
  document_code: string | null;
  id: string;
  layout: Json;
  name: string;
  published_at: Date;
  revision: number;
  title: string;
  version: number;
}

/** 'FormById' query type */
export interface IFormByIdQuery {
  params: IFormByIdParams;
  result: IFormByIdResult;
}

const formByIdIR: any = {"usedParamSet":{"workspaceId":true,"formId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":411,"b":423}]},{"name":"formId","required":true,"transform":{"type":"scalar"},"locs":[{"a":436,"b":443}]}],"statement":"-- El formato con su última revisión completa: la que se llena y la que se edita.\nSELECT f.id, f.name, f.version, f.archived_at, r.revision, r.title, r.document_code, r.layout, r.published_at\nFROM labs.forms AS f\nCROSS JOIN LATERAL (\n  SELECT revision, title, document_code, layout, published_at\n  FROM labs.form_revisions\n  WHERE form_id = f.id\n  ORDER BY revision DESC\n  LIMIT 1\n) AS r\nWHERE f.workspace_id = :workspaceId! AND f.id = :formId!"};

/**
 * Query generated from SQL:
 * ```
 * -- El formato con su última revisión completa: la que se llena y la que se edita.
 * SELECT f.id, f.name, f.version, f.archived_at, r.revision, r.title, r.document_code, r.layout, r.published_at
 * FROM labs.forms AS f
 * CROSS JOIN LATERAL (
 *   SELECT revision, title, document_code, layout, published_at
 *   FROM labs.form_revisions
 *   WHERE form_id = f.id
 *   ORDER BY revision DESC
 *   LIMIT 1
 * ) AS r
 * WHERE f.workspace_id = :workspaceId! AND f.id = :formId!
 * ```
 */
export const formById = new PreparedQuery<IFormByIdParams,IFormByIdResult>(formByIdIR);


/** 'LockForm' parameters type */
export interface ILockFormParams {
  formId: string;
  workspaceId: string;
}

/** 'LockForm' return type */
export interface ILockFormResult {
  archived_at: Date | null;
  version: number;
}

/** 'LockForm' query type */
export interface ILockFormQuery {
  params: ILockFormParams;
  result: ILockFormResult;
}

const lockFormIR: any = {"usedParamSet":{"workspaceId":true,"formId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":170,"b":182}]},{"name":"formId","required":true,"transform":{"type":"scalar"},"locs":[{"a":193,"b":200}]}],"statement":"-- Lo último del orden de bloqueo (02 §6): el formato que se renombra, se archiva o recibe una revisión.\nSELECT archived_at, version\nFROM labs.forms\nWHERE workspace_id = :workspaceId! AND id = :formId!\nFOR UPDATE"};

/**
 * Query generated from SQL:
 * ```
 * -- Lo último del orden de bloqueo (02 §6): el formato que se renombra, se archiva o recibe una revisión.
 * SELECT archived_at, version
 * FROM labs.forms
 * WHERE workspace_id = :workspaceId! AND id = :formId!
 * FOR UPDATE
 * ```
 */
export const lockForm = new PreparedQuery<ILockFormParams,ILockFormResult>(lockFormIR);


/** 'LastRevision' parameters type */
export interface ILastRevisionParams {
  formId: string;
  workspaceId: string;
}

/** 'LastRevision' return type */
export interface ILastRevisionResult {
  revision: number;
}

/** 'LastRevision' query type */
export interface ILastRevisionQuery {
  params: ILastRevisionParams;
  result: ILastRevisionResult;
}

const lastRevisionIR: any = {"usedParamSet":{"workspaceId":true,"formId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":234,"b":246}]},{"name":"formId","required":true,"transform":{"type":"scalar"},"locs":[{"a":262,"b":269}]}],"statement":"-- La última revisión, leída después de bloquear el formato y en otra sentencia: así ve la que otra\n-- persona publicó mientras se esperaba el bloqueo.\nSELECT max(revision) AS \"revision!\"\nFROM labs.form_revisions\nWHERE workspace_id = :workspaceId! AND form_id = :formId!"};

/**
 * Query generated from SQL:
 * ```
 * -- La última revisión, leída después de bloquear el formato y en otra sentencia: así ve la que otra
 * -- persona publicó mientras se esperaba el bloqueo.
 * SELECT max(revision) AS "revision!"
 * FROM labs.form_revisions
 * WHERE workspace_id = :workspaceId! AND form_id = :formId!
 * ```
 */
export const lastRevision = new PreparedQuery<ILastRevisionParams,ILastRevisionResult>(lastRevisionIR);


/** 'InsertForm' parameters type */
export interface IInsertFormParams {
  createdBy: string;
  name: string;
  workspaceId: string;
}

/** 'InsertForm' return type */
export interface IInsertFormResult {
  id: string;
}

/** 'InsertForm' query type */
export interface IInsertFormQuery {
  params: IInsertFormParams;
  result: IInsertFormResult;
}

const insertFormIR: any = {"usedParamSet":{"workspaceId":true,"name":true,"createdBy":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":166,"b":178}]},{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":181,"b":186}]},{"name":"createdBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":189,"b":199}]}],"statement":"-- Un nombre activo repetido (forms_active_name) falla y el comando responde NAME_TAKEN.\nINSERT INTO labs.forms (workspace_id, name, created_by_principal_id)\nVALUES (:workspaceId!, :name!, :createdBy!)\nRETURNING id"};

/**
 * Query generated from SQL:
 * ```
 * -- Un nombre activo repetido (forms_active_name) falla y el comando responde NAME_TAKEN.
 * INSERT INTO labs.forms (workspace_id, name, created_by_principal_id)
 * VALUES (:workspaceId!, :name!, :createdBy!)
 * RETURNING id
 * ```
 */
export const insertForm = new PreparedQuery<IInsertFormParams,IInsertFormResult>(insertFormIR);


/** 'InsertFormRevision' parameters type */
export interface IInsertFormRevisionParams {
  documentCode?: string | null | void;
  formId: string;
  layout: Json;
  publishedBy: string;
  revision: number;
  title: string;
  workspaceId: string;
}

/** 'InsertFormRevision' return type */
export interface IInsertFormRevisionResult {
  revision: number;
}

/** 'InsertFormRevision' query type */
export interface IInsertFormRevisionQuery {
  params: IInsertFormRevisionParams;
  result: IInsertFormRevisionResult;
}

const insertFormRevisionIR: any = {"usedParamSet":{"workspaceId":true,"formId":true,"revision":true,"title":true,"documentCode":true,"layout":true,"publishedBy":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":289,"b":301}]},{"name":"formId","required":true,"transform":{"type":"scalar"},"locs":[{"a":304,"b":311}]},{"name":"revision","required":true,"transform":{"type":"scalar"},"locs":[{"a":314,"b":323}]},{"name":"title","required":true,"transform":{"type":"scalar"},"locs":[{"a":326,"b":332}]},{"name":"documentCode","required":false,"transform":{"type":"scalar"},"locs":[{"a":335,"b":347}]},{"name":"layout","required":true,"transform":{"type":"scalar"},"locs":[{"a":350,"b":357}]},{"name":"publishedBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":367,"b":379}]}],"statement":"-- La revisión siguiente a la vista, con el formato bloqueado; si aun así la clave ya está tomada, no\n-- inserta nada y el comando responde VERSION_CONFLICT.\nINSERT INTO labs.form_revisions (workspace_id, form_id, revision, title, document_code, layout, published_by_principal_id)\nVALUES (:workspaceId!, :formId!, :revision!, :title!, :documentCode, :layout!::jsonb, :publishedBy!)\nON CONFLICT (form_id, revision) DO NOTHING\nRETURNING revision"};

/**
 * Query generated from SQL:
 * ```
 * -- La revisión siguiente a la vista, con el formato bloqueado; si aun así la clave ya está tomada, no
 * -- inserta nada y el comando responde VERSION_CONFLICT.
 * INSERT INTO labs.form_revisions (workspace_id, form_id, revision, title, document_code, layout, published_by_principal_id)
 * VALUES (:workspaceId!, :formId!, :revision!, :title!, :documentCode, :layout!::jsonb, :publishedBy!)
 * ON CONFLICT (form_id, revision) DO NOTHING
 * RETURNING revision
 * ```
 */
export const insertFormRevision = new PreparedQuery<IInsertFormRevisionParams,IInsertFormRevisionResult>(insertFormRevisionIR);


/** 'RenameForm' parameters type */
export interface IRenameFormParams {
  formId: string;
  name: string;
  workspaceId: string;
}

/** 'RenameForm' return type */
export type IRenameFormResult = void;

/** 'RenameForm' query type */
export interface IRenameFormQuery {
  params: IRenameFormParams;
  result: IRenameFormResult;
}

const renameFormIR: any = {"usedParamSet":{"name":true,"workspaceId":true,"formId":true},"params":[{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":84,"b":89}]},{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":135,"b":147}]},{"name":"formId","required":true,"transform":{"type":"scalar"},"locs":[{"a":158,"b":165}]}],"statement":"-- Un nombre activo repetido falla igual que al crear.\nUPDATE labs.forms\nSET name = :name!, version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :formId!"};

/**
 * Query generated from SQL:
 * ```
 * -- Un nombre activo repetido falla igual que al crear.
 * UPDATE labs.forms
 * SET name = :name!, version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :formId!
 * ```
 */
export const renameForm = new PreparedQuery<IRenameFormParams,IRenameFormResult>(renameFormIR);


/** 'ArchiveForm' parameters type */
export interface IArchiveFormParams {
  formId: string;
  workspaceId: string;
}

/** 'ArchiveForm' return type */
export type IArchiveFormResult = void;

/** 'ArchiveForm' query type */
export interface IArchiveFormQuery {
  params: IArchiveFormParams;
  result: IArchiveFormResult;
}

const archiveFormIR: any = {"usedParamSet":{"workspaceId":true,"formId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":173,"b":185}]},{"name":"formId","required":true,"transform":{"type":"scalar"},"locs":[{"a":196,"b":203}]}],"statement":"-- Deja de ofrecerse para llenar; las solicitudes hechas con él conservan su revisión.\nUPDATE labs.forms\nSET archived_at = now(), version = version + 1\nWHERE workspace_id = :workspaceId! AND id = :formId!"};

/**
 * Query generated from SQL:
 * ```
 * -- Deja de ofrecerse para llenar; las solicitudes hechas con él conservan su revisión.
 * UPDATE labs.forms
 * SET archived_at = now(), version = version + 1
 * WHERE workspace_id = :workspaceId! AND id = :formId!
 * ```
 */
export const archiveForm = new PreparedQuery<IArchiveFormParams,IArchiveFormResult>(archiveFormIR);


