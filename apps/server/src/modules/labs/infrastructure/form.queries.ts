/** Types generated for queries found in "src/modules/labs/infrastructure/form.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** 'LatestForm' parameters type */
export interface ILatestFormParams {
  workspaceId: string;
}

/** 'LatestForm' return type */
export interface ILatestFormResult {
  document_code: string | null;
  fields: Json;
  published_at: Date;
  subject_label: string;
  title: string;
  unit_label: string;
  version: number;
}

/** 'LatestForm' query type */
export interface ILatestFormQuery {
  params: ILatestFormParams;
  result: ILatestFormResult;
}

const latestFormIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":167,"b":179}]}],"statement":"-- La versión vigente: la más alta.\nSELECT version, title, document_code, subject_label, unit_label, fields, published_at\nFROM labs.form_versions\nWHERE workspace_id = :workspaceId!\nORDER BY version DESC\nLIMIT 1"};

/**
 * Query generated from SQL:
 * ```
 * -- La versión vigente: la más alta.
 * SELECT version, title, document_code, subject_label, unit_label, fields, published_at
 * FROM labs.form_versions
 * WHERE workspace_id = :workspaceId!
 * ORDER BY version DESC
 * LIMIT 1
 * ```
 */
export const latestForm = new PreparedQuery<ILatestFormParams,ILatestFormResult>(latestFormIR);


/** 'InsertFormVersion' parameters type */
export interface IInsertFormVersionParams {
  documentCode?: string | null | void;
  fields: Json;
  publishedBy: string;
  subjectLabel: string;
  title: string;
  unitLabel: string;
  version: number;
  workspaceId: string;
}

/** 'InsertFormVersion' return type */
export interface IInsertFormVersionResult {
  document_code: string | null;
  fields: Json;
  published_at: Date;
  subject_label: string;
  title: string;
  unit_label: string;
  version: number;
}

/** 'InsertFormVersion' query type */
export interface IInsertFormVersionQuery {
  params: IInsertFormVersionParams;
  result: IInsertFormVersionResult;
}

const insertFormVersionIR: any = {"usedParamSet":{"workspaceId":true,"version":true,"title":true,"documentCode":true,"subjectLabel":true,"unitLabel":true,"fields":true,"publishedBy":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":306,"b":318}]},{"name":"version","required":true,"transform":{"type":"scalar"},"locs":[{"a":321,"b":329}]},{"name":"title","required":true,"transform":{"type":"scalar"},"locs":[{"a":332,"b":338}]},{"name":"documentCode","required":false,"transform":{"type":"scalar"},"locs":[{"a":341,"b":353}]},{"name":"subjectLabel","required":true,"transform":{"type":"scalar"},"locs":[{"a":356,"b":369}]},{"name":"unitLabel","required":true,"transform":{"type":"scalar"},"locs":[{"a":372,"b":382}]},{"name":"fields","required":true,"transform":{"type":"scalar"},"locs":[{"a":385,"b":392}]},{"name":"publishedBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":402,"b":414}]}],"statement":"-- La versión siguiente a la vista; si otra persona la publicó a la vez, la clave ya está tomada y no\n-- inserta nada: el comando responde VERSION_CONFLICT.\nINSERT INTO labs.form_versions\n  (workspace_id, version, title, document_code, subject_label, unit_label, fields, published_by_principal_id)\nVALUES (:workspaceId!, :version!, :title!, :documentCode, :subjectLabel!, :unitLabel!, :fields!::jsonb, :publishedBy!)\nON CONFLICT (workspace_id, version) DO NOTHING\nRETURNING version, title, document_code, subject_label, unit_label, fields, published_at"};

/**
 * Query generated from SQL:
 * ```
 * -- La versión siguiente a la vista; si otra persona la publicó a la vez, la clave ya está tomada y no
 * -- inserta nada: el comando responde VERSION_CONFLICT.
 * INSERT INTO labs.form_versions
 *   (workspace_id, version, title, document_code, subject_label, unit_label, fields, published_by_principal_id)
 * VALUES (:workspaceId!, :version!, :title!, :documentCode, :subjectLabel!, :unitLabel!, :fields!::jsonb, :publishedBy!)
 * ON CONFLICT (workspace_id, version) DO NOTHING
 * RETURNING version, title, document_code, subject_label, unit_label, fields, published_at
 * ```
 */
export const insertFormVersion = new PreparedQuery<IInsertFormVersionParams,IInsertFormVersionResult>(insertFormVersionIR);


