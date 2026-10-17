/** Types generated for queries found in "src/modules/equipment/infrastructure/areas.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'ListAreas' parameters type */
export interface IListAreasParams {
  workspaceId: string;
}

/** 'ListAreas' return type */
export interface IListAreasResult {
  faulted: number;
  id: string;
  manager_name: string;
  manager_principal_id: string | null;
  name: string;
  parent_name: string;
  restricted: number;
  retired: number;
  total: number;
}

/** 'ListAreas' query type */
export interface IListAreasQuery {
  params: IListAreasParams;
  result: IListAreasResult;
}

const listAreasIR: any = {"usedParamSet":{"workspaceId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":683,"b":695},{"a":1135,"b":1147},{"a":1238,"b":1250},{"a":1336,"b":1348}]}],"statement":"-- Las áreas con algún equipo que no esté dado de baja, contando todos sus niveles, en orden alfabético;\n-- con la sede o el edificio que las contiene, el nombre de su encargado y cuántos se dieron de baja.\nWITH counts AS (\n  SELECT la.area_id,\n         count(*) FILTER (WHERE a.condition <> 'retired') AS total,\n         count(*) FILTER (WHERE a.condition = 'faulted') AS faulted,\n         count(*) FILTER (WHERE a.condition = 'restricted') AS restricted,\n         count(*) FILTER (WHERE a.condition = 'retired') AS retired\n  FROM equipment.assets AS a\n  JOIN core.location_areas AS la ON la.workspace_id = a.workspace_id AND la.location_id = a.location_id\n  WHERE a.workspace_id = :workspaceId!\n  GROUP BY la.area_id\n  HAVING count(*) FILTER (WHERE a.condition <> 'retired') > 0\n)\nSELECT area.id, area.name, parent.name AS parent_name, area.manager_principal_id, ident.display_name AS manager_name,\n       counts.total::integer AS \"total!\", counts.faulted::integer AS \"faulted!\", counts.restricted::integer AS \"restricted!\",\n       counts.retired::integer AS \"retired!\"\nFROM counts\nJOIN core.locations AS area ON area.workspace_id = :workspaceId! AND area.id = counts.area_id\nLEFT JOIN core.locations AS parent ON parent.workspace_id = :workspaceId! AND parent.id = area.parent_id\nLEFT JOIN core.principals AS pr ON pr.workspace_id = :workspaceId! AND pr.id = area.manager_principal_id\nLEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id\nLEFT JOIN core.identities AS ident ON ident.id = m.identity_id\nORDER BY core.fold_text(area.name), area.id"};

/**
 * Query generated from SQL:
 * ```
 * -- Las áreas con algún equipo que no esté dado de baja, contando todos sus niveles, en orden alfabético;
 * -- con la sede o el edificio que las contiene, el nombre de su encargado y cuántos se dieron de baja.
 * WITH counts AS (
 *   SELECT la.area_id,
 *          count(*) FILTER (WHERE a.condition <> 'retired') AS total,
 *          count(*) FILTER (WHERE a.condition = 'faulted') AS faulted,
 *          count(*) FILTER (WHERE a.condition = 'restricted') AS restricted,
 *          count(*) FILTER (WHERE a.condition = 'retired') AS retired
 *   FROM equipment.assets AS a
 *   JOIN core.location_areas AS la ON la.workspace_id = a.workspace_id AND la.location_id = a.location_id
 *   WHERE a.workspace_id = :workspaceId!
 *   GROUP BY la.area_id
 *   HAVING count(*) FILTER (WHERE a.condition <> 'retired') > 0
 * )
 * SELECT area.id, area.name, parent.name AS parent_name, area.manager_principal_id, ident.display_name AS manager_name,
 *        counts.total::integer AS "total!", counts.faulted::integer AS "faulted!", counts.restricted::integer AS "restricted!",
 *        counts.retired::integer AS "retired!"
 * FROM counts
 * JOIN core.locations AS area ON area.workspace_id = :workspaceId! AND area.id = counts.area_id
 * LEFT JOIN core.locations AS parent ON parent.workspace_id = :workspaceId! AND parent.id = area.parent_id
 * LEFT JOIN core.principals AS pr ON pr.workspace_id = :workspaceId! AND pr.id = area.manager_principal_id
 * LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
 * LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
 * ORDER BY core.fold_text(area.name), area.id
 * ```
 */
export const listAreas = new PreparedQuery<IListAreasParams,IListAreasResult>(listAreasIR);


/** 'ListAreaTypes' parameters type */
export interface IListAreaTypesParams {
  areaId: string;
  workspaceId: string;
}

/** 'ListAreaTypes' return type */
export interface IListAreaTypesResult {
  faulted: number;
  id: string;
  name: string;
  operational: number;
  photo_url: string | null;
  restricted: number;
  total: number;
}

/** 'ListAreaTypes' query type */
export interface IListAreaTypesQuery {
  params: IListAreaTypesParams;
  result: IListAreaTypesResult;
}

const listAreaTypesIR: any = {"usedParamSet":{"workspaceId":true,"areaId":true},"params":[{"name":"workspaceId","required":true,"transform":{"type":"scalar"},"locs":[{"a":957,"b":969}]},{"name":"areaId","required":true,"transform":{"type":"scalar"},"locs":[{"a":988,"b":995}]}],"statement":"-- El área agrupada por tipo (E-01c): cada tipo con sus cifras por estado, sin los dados de baja, y la\n-- foto de uno de sus equipos; en orden alfabético. Las unidades se piden con GET /assets.\nSELECT t.id, t.name,\n       count(*)::integer AS \"total!\",\n       count(*) FILTER (WHERE a.condition = 'operational')::integer AS \"operational!\",\n       count(*) FILTER (WHERE a.condition = 'restricted')::integer AS \"restricted!\",\n       count(*) FILTER (WHERE a.condition = 'faulted')::integer AS \"faulted!\",\n       (array_agg(photo.url ORDER BY lower(a.code)) FILTER (WHERE photo.url IS NOT NULL))[1] AS photo_url\nFROM equipment.assets AS a\nJOIN core.location_areas AS la ON la.workspace_id = a.workspace_id AND la.location_id = a.location_id\nJOIN equipment.asset_types AS t ON t.workspace_id = a.workspace_id AND t.id = a.type_id\nLEFT JOIN equipment.asset_photos AS photo ON photo.workspace_id = a.workspace_id AND photo.id = a.photo_id\nWHERE a.workspace_id = :workspaceId! AND la.area_id = :areaId! AND a.condition <> 'retired'\nGROUP BY t.id, t.name\nORDER BY core.fold_text(t.name), t.id"};

/**
 * Query generated from SQL:
 * ```
 * -- El área agrupada por tipo (E-01c): cada tipo con sus cifras por estado, sin los dados de baja, y la
 * -- foto de uno de sus equipos; en orden alfabético. Las unidades se piden con GET /assets.
 * SELECT t.id, t.name,
 *        count(*)::integer AS "total!",
 *        count(*) FILTER (WHERE a.condition = 'operational')::integer AS "operational!",
 *        count(*) FILTER (WHERE a.condition = 'restricted')::integer AS "restricted!",
 *        count(*) FILTER (WHERE a.condition = 'faulted')::integer AS "faulted!",
 *        (array_agg(photo.url ORDER BY lower(a.code)) FILTER (WHERE photo.url IS NOT NULL))[1] AS photo_url
 * FROM equipment.assets AS a
 * JOIN core.location_areas AS la ON la.workspace_id = a.workspace_id AND la.location_id = a.location_id
 * JOIN equipment.asset_types AS t ON t.workspace_id = a.workspace_id AND t.id = a.type_id
 * LEFT JOIN equipment.asset_photos AS photo ON photo.workspace_id = a.workspace_id AND photo.id = a.photo_id
 * WHERE a.workspace_id = :workspaceId! AND la.area_id = :areaId! AND a.condition <> 'retired'
 * GROUP BY t.id, t.name
 * ORDER BY core.fold_text(t.name), t.id
 * ```
 */
export const listAreaTypes = new PreparedQuery<IListAreaTypesParams,IListAreaTypesResult>(listAreaTypesIR);


