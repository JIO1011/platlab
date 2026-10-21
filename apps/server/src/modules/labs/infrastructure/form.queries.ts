/** Types generated for queries found in "src/modules/labs/infrastructure/form.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** 'LatestForm' parameters type */
export interface ILatestFormParams {
  workspaceId: string;
}

/** 'LatestForm' return type */
export interface ILatestFormResult {
  fields: Json;
  published_at: Date;
  title: string;
  version: number;
}

/** 'LatestForm' query type */
export interface ILatestFormQuery {
  params: ILatestFormParams;
  result: ILatestFormResult;
}

const latestFormIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":125,"b":137}]}],"statement":"-- La versión vigente: la más alta.\nSELECT version, title, fields, published_at\nFROM labs.form_versions\nWHERE workspace_id = :workspaceId!\nORDER BY version DESC\nLIMIT 1"};

/**
 * Query generated from SQL:
 * ```
 * -- La versión vigente: la más alta.
 * SELECT version, title, fields, published_at
 * FROM labs.form_versions
 * WHERE workspace_id = :workspaceId!
 * ORDER BY version DESC
 * LIMIT 1
 * ```
 */
export const latestForm = new PreparedQuery<ILatestFormParams,ILatestFormResult>(latestFormIR);


/** 'InsertFormVersion' parameters type */
export interface IInsertFormVersionParams {
  fields: Json;
  publishedBy: string;
  title: string;
  version: number;
  workspaceId: string;
}

/** 'InsertFormVersion' return type */
export interface IInsertFormVersionResult {
  fields: Json;
  published_at: Date;
  title: string;
  version: number;
}

/** 'InsertFormVersion' query type */
export interface IInsertFormVersionQuery {
  params: IInsertFormVersionParams;
  result: IInsertFormVersionResult;
}

const insertFormVersionIR: any = {"usedParamSet":{"workspaceId":true,"version":true,"title":true,"fields":true,"publishedBy":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":262,"b":274}]},{"name":"version","required":true,"transform":{"type":"scalar"},"locs":[{"a":277,"b":285}]},{"name":"title","required":true,"transform":{"type":"scalar"},"locs":[{"a":288,"b":294}]},{"name":"fields","required":true,"transform":{"type":"scalar"},"locs":[{"a":297,"b":304}]},{"name":"publishedBy","required":true,"transform":{"type":"scalar"},"locs":[{"a":314,"b":326}]}],"statement":"-- La versión siguiente a la vista; si otra persona la publicó a la vez, la clave ya está tomada y no\n-- inserta nada: el comando responde VERSION_CONFLICT.\nINSERT INTO labs.form_versions (workspace_id, version, title, fields, published_by_principal_id)\nVALUES (:workspaceId!, :version!, :title!, :fields!::jsonb, :publishedBy!)\nON CONFLICT (workspace_id, version) DO NOTHING\nRETURNING version, title, fields, published_at"};

/**
 * Query generated from SQL:
 * ```
 * -- La versión siguiente a la vista; si otra persona la publicó a la vez, la clave ya está tomada y no
 * -- inserta nada: el comando responde VERSION_CONFLICT.
 * INSERT INTO labs.form_versions (workspace_id, version, title, fields, published_by_principal_id)
 * VALUES (:workspaceId!, :version!, :title!, :fields!::jsonb, :publishedBy!)
 * ON CONFLICT (workspace_id, version) DO NOTHING
 * RETURNING version, title, fields, published_at
 * ```
 */
export const insertFormVersion = new PreparedQuery<IInsertFormVersionParams,IInsertFormVersionResult>(insertFormVersionIR);


