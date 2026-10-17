/* Inventario por áreas (ADR 0019, E-01c): el área y su encargado son de Core; Equipos cuenta sus equipos. */

/* @name listAreas */
-- Las áreas con algún equipo que no esté dado de baja, contando todos sus niveles, en orden alfabético;
-- con la sede o el edificio que las contiene, el nombre de su encargado y cuántos se dieron de baja.
WITH counts AS (
  SELECT la.area_id,
         count(*) FILTER (WHERE a.condition <> 'retired') AS total,
         count(*) FILTER (WHERE a.condition = 'faulted') AS faulted,
         count(*) FILTER (WHERE a.condition = 'restricted') AS restricted,
         count(*) FILTER (WHERE a.condition = 'retired') AS retired
  FROM equipment.assets AS a
  JOIN core.location_areas AS la ON la.workspace_id = a.workspace_id AND la.location_id = a.location_id
  WHERE a.workspace_id = :workspaceId!
  GROUP BY la.area_id
  HAVING count(*) FILTER (WHERE a.condition <> 'retired') > 0
)
SELECT area.id, area.name, parent.name AS parent_name, area.manager_principal_id, ident.display_name AS manager_name,
       counts.total::integer AS "total!", counts.faulted::integer AS "faulted!", counts.restricted::integer AS "restricted!",
       counts.retired::integer AS "retired!"
FROM counts
JOIN core.locations AS area ON area.workspace_id = :workspaceId! AND area.id = counts.area_id
LEFT JOIN core.locations AS parent ON parent.workspace_id = :workspaceId! AND parent.id = area.parent_id
LEFT JOIN core.principals AS pr ON pr.workspace_id = :workspaceId! AND pr.id = area.manager_principal_id
LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
ORDER BY core.fold_text(area.name), area.id;

/* @name listAreaTypes */
-- El área agrupada por tipo (E-01c): cada tipo con sus cifras por estado, sin los dados de baja, y la
-- foto de uno de sus equipos; en orden alfabético. Las unidades se piden con GET /assets.
SELECT t.id, t.name,
       count(*)::integer AS "total!",
       count(*) FILTER (WHERE a.condition = 'operational')::integer AS "operational!",
       count(*) FILTER (WHERE a.condition = 'restricted')::integer AS "restricted!",
       count(*) FILTER (WHERE a.condition = 'faulted')::integer AS "faulted!",
       (array_agg(photo.url ORDER BY lower(a.code)) FILTER (WHERE photo.url IS NOT NULL))[1] AS photo_url
FROM equipment.assets AS a
JOIN core.location_areas AS la ON la.workspace_id = a.workspace_id AND la.location_id = a.location_id
JOIN equipment.asset_types AS t ON t.workspace_id = a.workspace_id AND t.id = a.type_id
LEFT JOIN equipment.asset_photos AS photo ON photo.workspace_id = a.workspace_id AND photo.id = a.photo_id
WHERE a.workspace_id = :workspaceId! AND la.area_id = :areaId! AND a.condition <> 'retired'
GROUP BY t.id, t.name
ORDER BY core.fold_text(t.name), t.id;
