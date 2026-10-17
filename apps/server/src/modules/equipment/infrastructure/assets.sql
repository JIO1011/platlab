/*
 * Equipos (ADR 0019): tipos, ficha del equipo, condición, traslados e historial. Cada comando hace los
 * menos viajes posibles a la base: las validaciones van juntas, los códigos y nombres únicos se
 * resuelven con su índice (ON CONFLICT) y cada cambio de estado escribe historial y equipo en una
 * sentencia.
 */

/* @name listAssetTypes */
-- En el orden del índice asset_types_name.
SELECT id, name
FROM equipment.asset_types
WHERE workspace_id = :workspaceId! AND archived_at IS NULL
ORDER BY inventory.fold_text(name);

/* @name insertAssetType */
-- Un nombre activo repetido (asset_types_name) no inserta nada: el comando responde NAME_TAKEN.
INSERT INTO equipment.asset_types (workspace_id, name)
VALUES (:workspaceId!, :name!)
ON CONFLICT (workspace_id, inventory.fold_text(name)) WHERE archived_at IS NULL DO NOTHING
RETURNING id, name;

/* @name activeTypeNamed */
-- El tipo activo con el mismo nombre plegado, para nombrarlo en el error.
SELECT name
FROM equipment.asset_types
WHERE workspace_id = :workspaceId! AND archived_at IS NULL
  AND inventory.fold_text(name) = inventory.fold_text(:name!);

/* @name archiveAssetType */
-- Los equipos de un tipo archivado lo conservan; solo deja de ofrecerse en el alta.
UPDATE equipment.asset_types
SET archived_at = now()
WHERE workspace_id = :workspaceId! AND id = :typeId! AND archived_at IS NULL
RETURNING id, name;

/* @name assetReferences */
-- Valida en un viaje las referencias de un alta o una edición; un parámetro nulo no se comprueba:
-- tipo y ubicación activos del espacio, y responsable miembro activo.
SELECT
  (:typeId::uuid IS NULL OR EXISTS (
    SELECT 1 FROM equipment.asset_types
    WHERE workspace_id = :workspaceId! AND id = :typeId::uuid AND archived_at IS NULL
  )) AS "type_ok!",
  (:locationId::uuid IS NULL OR EXISTS (
    SELECT 1 FROM core.locations
    WHERE workspace_id = :workspaceId! AND id = :locationId::uuid AND archived_at IS NULL
  )) AS "location_ok!",
  (:responsibleId::uuid IS NULL OR EXISTS (
    SELECT 1
    FROM core.principals AS pr
    JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
    WHERE pr.workspace_id = :workspaceId! AND pr.id = :responsibleId::uuid AND pr.kind = 'member' AND m.status = 'active'
  )) AS "responsible_ok!";

/* @name assetCodesLike */
-- Códigos del espacio iguales al propuesto o con un sufijo «-N».
SELECT code
FROM equipment.assets
WHERE workspace_id = :workspaceId! AND (lower(code) = lower(:base!) OR starts_with(lower(code), lower(:base!) || '-'));

/* @name assetCodeTaken */
SELECT code
FROM equipment.assets
WHERE workspace_id = :workspaceId! AND lower(code) = lower(:code!) AND id <> :exceptId!;

/* @name listResponsibles */
SELECT pr.id, ident.display_name AS name
FROM core.principals AS pr
JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
JOIN core.identities AS ident ON ident.id = m.identity_id
WHERE pr.workspace_id = :workspaceId! AND pr.kind = 'member' AND m.status = 'active'
ORDER BY inventory.fold_text(ident.display_name), pr.id;

/* @name insertAsset */
-- Un código repetido (assets_code) no inserta nada: el comando responde CODE_TAKEN.
INSERT INTO equipment.assets (
  workspace_id, type_id, code, name, brand, model, serial_number, power_supply, location_id,
  responsible_principal_id, condition, conservation, supplier, acquired_on, warranty_until,
  useful_life_years, replacement_value, created_by_principal_id
) VALUES (
  :workspaceId!, :typeId!, :code!, :name!, :brand, :model, :serialNumber, :powerSupply, :locationId!,
  :responsibleId, :condition!, :conservation, :supplier, :acquiredOn::date, :warrantyUntil::date,
  :usefulLifeYears::integer, :replacementValue::numeric, :createdBy!
)
ON CONFLICT (workspace_id, lower(code)) DO NOTHING
RETURNING id;

/* @name lockAsset */
-- Lo último del orden de bloqueo (02 §6): el equipo, después de espacio, derecho y membresía.
SELECT id, code, name, type_id, brand, model, serial_number, power_supply, location_id,
       responsible_principal_id, condition, conservation, supplier, acquired_on, warranty_until,
       useful_life_years, trim_scale(replacement_value) AS replacement_value, photo_id
FROM equipment.assets
WHERE workspace_id = :workspaceId! AND id = :assetId!
FOR UPDATE;

/* @name updateAssetFields */
-- Escribe la ficha ya combinada; el comando la edita con el equipo bloqueado.
UPDATE equipment.assets
SET type_id = :typeId!, code = :code!, name = :name!, brand = :brand, model = :model,
    serial_number = :serialNumber, power_supply = :powerSupply, responsible_principal_id = :responsibleId,
    conservation = :conservation, supplier = :supplier, acquired_on = :acquiredOn::date,
    warranty_until = :warrantyUntil::date, useful_life_years = :usefulLifeYears::integer,
    replacement_value = :replacementValue::numeric, version = version + 1
WHERE workspace_id = :workspaceId! AND id = :assetId!
RETURNING id;

/* @name changeAssetCondition */
-- Una sentencia: la fila del historial y la condición del equipo, ya bloqueado por el comando. Con
-- :caseId, la falla que causó el cambio (reportarla o resolverla).
WITH change AS (
  INSERT INTO equipment.condition_changes
    (workspace_id, asset_id, from_condition, to_condition, reason, result, actor_principal_id, case_id)
  VALUES (:workspaceId!, :assetId!, :fromCondition!, :toCondition!, :reason!, :result, :actorId!, :caseId)
  RETURNING asset_id, to_condition
)
UPDATE equipment.assets AS a
SET condition = change.to_condition, version = a.version + 1
FROM change
WHERE a.workspace_id = :workspaceId! AND a.id = change.asset_id
RETURNING a.id;

/* @name moveAsset */
-- Una sentencia: el destino debe ser una ubicación activa del espacio; deja el traslado en el
-- historial y mueve el equipo, ya bloqueado por el comando. Sin fila, el destino no es válido.
WITH target AS (
  SELECT id
  FROM core.locations
  WHERE workspace_id = :workspaceId! AND id = :toLocationId! AND archived_at IS NULL
), change AS (
  INSERT INTO equipment.location_changes
    (workspace_id, asset_id, from_location_id, to_location_id, note, actor_principal_id)
  SELECT :workspaceId!::uuid, :assetId!::uuid, :fromLocationId!::uuid, target.id, :note::text, :actorId!::uuid
  FROM target
  RETURNING asset_id, to_location_id
)
UPDATE equipment.assets AS a
SET location_id = change.to_location_id, version = a.version + 1
FROM change
WHERE a.workspace_id = :workspaceId! AND a.id = change.asset_id
RETURNING a.id;

/* @name insertAssetPhoto */
-- Una foto subida (ADR 0019): fila nueva, nunca reemplaza otra.
INSERT INTO equipment.asset_photos
  (workspace_id, id, asset_id, object_path, url, content_type, byte_size, sha256, uploaded_by_principal_id)
VALUES
  (:workspaceId!, :id!, :assetId!, :objectPath!, :url!, :contentType!, :byteSize!, :sha256!, :uploadedBy!)
RETURNING id;

/* @name pointAssetPhoto */
-- La foto pasa a ser la vigente; la anterior queda en el historial de fotos.
UPDATE equipment.assets
SET photo_id = :photoId!, version = version + 1
WHERE workspace_id = :workspaceId! AND id = :assetId!
RETURNING id;

/* @name listAssets */
-- Primero la página, del índice assets_code (espacio y código en minúsculas, que también es el
-- cursor), y después, solo para sus filas, tipo, ubicación con sus niveles y responsable. Con
-- :assetId, la ficha de un equipo (también dado de baja). Sin :conditions, los dados de baja no
-- aparecen. :locationIds incluye sus niveles inferiores. Responsable y estado físico admiten «sin dato»
-- (:withoutResponsible, :withoutConservation); garantía y vida útil se miden a :today (E-01c). :q busca en
-- search_text, plegado al escribir; `\`, `%` y `_` se escapan con `\` (chr(92), porque PgTyped no admite
-- `\` en un literal). assetTotals repite estos filtros: un cambio aquí va también allí.
WITH RECURSIVE search AS (
  SELECT '%' || replace(replace(replace(inventory.fold_text(:q::text),
           chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern
), scope AS (
  SELECT l.id
  FROM core.locations AS l
  WHERE l.workspace_id = :workspaceId! AND l.id = ANY (:locationIds::uuid[])
  UNION
  SELECT child.id
  FROM core.locations AS child
  JOIN scope ON child.parent_id = scope.id
  WHERE child.workspace_id = :workspaceId!
), page AS (
  SELECT a.id, a.code, a.name, a.type_id, a.brand, a.model, a.serial_number, a.power_supply, a.location_id,
         a.responsible_principal_id, a.condition, a.conservation, a.supplier, a.acquired_on, a.warranty_until,
         a.useful_life_years, a.replacement_value, a.photo_id, a.created_at
  FROM equipment.assets AS a
  CROSS JOIN search
  WHERE a.workspace_id = :workspaceId!
    AND (:assetId::uuid IS NULL OR a.id = :assetId::uuid)
    AND (CASE WHEN :conditions::text[] IS NULL
              THEN :assetId::uuid IS NOT NULL OR a.condition <> 'retired'
              ELSE a.condition = ANY (:conditions::text[]) END)
    AND (:typeIds::uuid[] IS NULL OR a.type_id = ANY (:typeIds::uuid[]))
    AND (:locationIds::uuid[] IS NULL OR a.location_id IN (SELECT id FROM scope))
    AND (:responsibleIds::uuid[] IS NULL AND NOT coalesce(:withoutResponsible::boolean, false)
         OR a.responsible_principal_id = ANY (:responsibleIds::uuid[])
         OR (coalesce(:withoutResponsible::boolean, false) AND a.responsible_principal_id IS NULL))
    AND (:conservations::text[] IS NULL AND NOT coalesce(:withoutConservation::boolean, false)
         OR a.conservation = ANY (:conservations::text[])
         OR (coalesce(:withoutConservation::boolean, false) AND a.conservation IS NULL))
    AND (:warranties::text[] IS NULL
         OR equipment.warranty_state(a.warranty_until, :today::date, :warrantyHorizon::date) = ANY (:warranties::text[]))
    AND (:usefulLives::text[] IS NULL
         OR equipment.useful_life_state(a.acquired_on, a.useful_life_years, :today::date) = ANY (:usefulLives::text[]))
    AND (search.pattern IS NULL OR a.search_text LIKE search.pattern)
    AND (:afterCode::text IS NULL OR lower(a.code) > :afterCode::text)
  ORDER BY lower(a.code)
  LIMIT :limit!
), up AS (
  -- Niveles de cada ubicación de la página, hasta 6 hacia la raíz.
  SELECT loc.id AS location_id, loc.parent_id, loc.kind, loc.name, 0 AS depth
  FROM core.locations AS loc
  WHERE loc.workspace_id = :workspaceId! AND loc.id IN (SELECT location_id FROM page)
  UNION ALL
  SELECT up.location_id, parent.parent_id, parent.kind, parent.name, up.depth + 1
  FROM up
  JOIN core.locations AS parent ON parent.workspace_id = :workspaceId! AND parent.id = up.parent_id
  WHERE up.depth < 5
), paths AS (
  -- Desde el primer nivel bajo la sede (sin ella, salvo que sea la propia).
  SELECT location_id, array_agg(name ORDER BY depth DESC) FILTER (WHERE depth = 0 OR kind <> 'site') AS path
  FROM up
  GROUP BY location_id
)
SELECT
  p.id,
  p.code,
  lower(p.code) AS "sort_code!",
  p.name,
  t.id AS type_id,
  t.name AS type_name,
  p.brand,
  p.model,
  p.serial_number,
  p.power_supply,
  loc.id AS location_id,
  loc.code AS location_code,
  loc.name AS location_name,
  paths.path AS "location_path!",
  area.area_id AS "location_area_id!",
  p.responsible_principal_id,
  ident.display_name AS "responsible_name?",
  p.condition,
  p.conservation,
  -- Disponibilidad calculada (ADR 0019): préstamo, mantenimiento y reservas llegan con su entrega.
  CASE WHEN p.condition IN ('operational', 'restricted') THEN 'available' ELSE 'unavailable' END AS "availability!",
  p.supplier,
  p.acquired_on,
  p.warranty_until,
  p.useful_life_years,
  trim_scale(p.replacement_value) AS replacement_value,
  photo.url AS "photo_url?",
  p.created_at
FROM page AS p
JOIN equipment.asset_types AS t ON t.workspace_id = :workspaceId! AND t.id = p.type_id
JOIN core.locations AS loc ON loc.workspace_id = :workspaceId! AND loc.id = p.location_id
JOIN paths ON paths.location_id = p.location_id
JOIN core.location_areas AS area ON area.workspace_id = :workspaceId! AND area.location_id = p.location_id
LEFT JOIN core.principals AS pr ON pr.workspace_id = :workspaceId! AND pr.id = p.responsible_principal_id
LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
LEFT JOIN equipment.asset_photos AS photo ON photo.workspace_id = :workspaceId! AND photo.id = p.photo_id
ORDER BY lower(p.code);

/* @name insertConservationChange */
-- El estado físico cambiado desde la ficha queda en el historial (E-01c); nulo es «sin dato».
INSERT INTO equipment.conservation_changes (workspace_id, asset_id, from_conservation, to_conservation, actor_principal_id)
VALUES (:workspaceId!, :assetId!, :fromConservation, :toConservation, :actorId!);

/* @name assetTotals */
-- Indicadores del Informe (E-01c) con los mismos filtros que listAssets, sin paginar: cuántos equipos,
-- su valor de reposición sumado (exacto), sin responsable, con la garantía por vencer y con la vida útil
-- cumplida a :today.
WITH RECURSIVE search AS (
  SELECT '%' || replace(replace(replace(inventory.fold_text(:q::text),
           chr(92), chr(92) || chr(92)), '%', chr(92) || '%'), '_', chr(92) || '_') || '%' AS pattern
), scope AS (
  SELECT l.id
  FROM core.locations AS l
  WHERE l.workspace_id = :workspaceId! AND l.id = ANY (:locationIds::uuid[])
  UNION
  SELECT child.id
  FROM core.locations AS child
  JOIN scope ON child.parent_id = scope.id
  WHERE child.workspace_id = :workspaceId!
)
SELECT count(*)::integer AS "count!",
       trim_scale(coalesce(sum(a.replacement_value), 0))::text AS "replacement_value!",
       count(*) FILTER (WHERE a.responsible_principal_id IS NULL)::integer AS "without_responsible!",
       count(*) FILTER (
         WHERE equipment.warranty_state(a.warranty_until, :today::date, :warrantyHorizon::date) = 'expiring'
       )::integer AS "warranty_expiring!",
       count(*) FILTER (
         WHERE equipment.useful_life_state(a.acquired_on, a.useful_life_years, :today::date) = 'reached'
       )::integer AS "useful_life_reached!"
FROM equipment.assets AS a
CROSS JOIN search
WHERE a.workspace_id = :workspaceId!
    AND (CASE WHEN :conditions::text[] IS NULL THEN a.condition <> 'retired'
              ELSE a.condition = ANY (:conditions::text[]) END)
    AND (:typeIds::uuid[] IS NULL OR a.type_id = ANY (:typeIds::uuid[]))
    AND (:locationIds::uuid[] IS NULL OR a.location_id IN (SELECT id FROM scope))
    AND (:responsibleIds::uuid[] IS NULL AND NOT coalesce(:withoutResponsible::boolean, false)
         OR a.responsible_principal_id = ANY (:responsibleIds::uuid[])
         OR (coalesce(:withoutResponsible::boolean, false) AND a.responsible_principal_id IS NULL))
    AND (:conservations::text[] IS NULL AND NOT coalesce(:withoutConservation::boolean, false)
         OR a.conservation = ANY (:conservations::text[])
         OR (coalesce(:withoutConservation::boolean, false) AND a.conservation IS NULL))
    AND (:warranties::text[] IS NULL
         OR equipment.warranty_state(a.warranty_until, :today::date, :warrantyHorizon::date) = ANY (:warranties::text[]))
    AND (:usefulLives::text[] IS NULL
         OR equipment.useful_life_state(a.acquired_on, a.useful_life_years, :today::date) = ANY (:usefulLives::text[]))
    AND (search.pattern IS NULL OR a.search_text LIKE search.pattern);

/* @name listAssetHistory */
-- Alta, cambios de estado y de estado físico, y traslados de un equipo, del más reciente al más antiguo: primero los
-- últimos :limit hechos (índices por equipo y fecha) y después, solo para ellos, quién actuó.
WITH events AS (
  SELECT 'created' AS kind, a.created_at AS occurred_at, a.created_by_principal_id AS actor_id,
         NULL::text AS from_value, NULL::text AS to_value, NULL::text AS reason, NULL::text AS result,
         NULL::text AS note, a.id AS event_id,
         -- En un empate de fecha, el alta va última: es el primer hecho del equipo.
         1 AS tie_rank
  FROM equipment.assets AS a
  WHERE a.workspace_id = :workspaceId! AND a.id = :assetId!
  UNION ALL
  SELECT 'condition', c.occurred_at, c.actor_principal_id, c.from_condition, c.to_condition, c.reason,
         c.result, NULL, c.id, 0
  FROM equipment.condition_changes AS c
  WHERE c.workspace_id = :workspaceId! AND c.asset_id = :assetId!
  UNION ALL
  SELECT 'conservation', k.occurred_at, k.actor_principal_id, k.from_conservation, k.to_conservation, NULL, NULL,
         NULL, k.id, 0
  FROM equipment.conservation_changes AS k
  WHERE k.workspace_id = :workspaceId! AND k.asset_id = :assetId!
  UNION ALL
  SELECT 'transfer', t.occurred_at, t.actor_principal_id, origin.name, target.name, NULL, NULL, t.note, t.id, 0
  FROM equipment.location_changes AS t
  JOIN core.locations AS origin ON origin.workspace_id = t.workspace_id AND origin.id = t.from_location_id
  JOIN core.locations AS target ON target.workspace_id = t.workspace_id AND target.id = t.to_location_id
  WHERE t.workspace_id = :workspaceId! AND t.asset_id = :assetId!
  ORDER BY occurred_at DESC, tie_rank, event_id DESC
  LIMIT :limit!
)
SELECT e.kind AS "kind!", e.occurred_at AS "occurred_at!", ident.display_name AS "actor?",
       e.from_value, e.to_value, e.reason, e.result, e.note
FROM events AS e
LEFT JOIN core.principals AS pr ON pr.workspace_id = :workspaceId! AND pr.id = e.actor_id
LEFT JOIN core.memberships AS m ON m.workspace_id = pr.workspace_id AND m.id = pr.membership_id
LEFT JOIN core.identities AS ident ON ident.id = m.identity_id
ORDER BY e.occurred_at DESC, e.tie_rank, e.event_id DESC;

/* @name equipmentSummary */
-- Cifras del Resumen y de la tarjeta de Inicio: equipos sin los dados de baja (índice assets_condition)
-- y fallas no resueltas (índice cases_status): todas, las que nadie atiende y las que reportó :principalId.
SELECT count(*) FILTER (WHERE condition <> 'retired') AS "assets!",
       count(*) FILTER (WHERE condition = 'operational') AS "operational!",
       count(*) FILTER (WHERE condition = 'restricted') AS "restricted!",
       count(*) FILTER (WHERE condition = 'faulted') AS "faulted!",
       (SELECT count(*) FROM incidents.cases
         WHERE workspace_id = :workspaceId! AND module_code = 'equipment' AND status IN ('open', 'in_progress')) AS "open_faults!",
       (SELECT count(*) FROM incidents.cases
         WHERE workspace_id = :workspaceId! AND module_code = 'equipment' AND status = 'open') AS "unattended_faults!",
       (SELECT count(*) FROM incidents.cases
         WHERE workspace_id = :workspaceId! AND module_code = 'equipment' AND status IN ('open', 'in_progress')
           AND reported_by_principal_id = :principalId!) AS "my_open_faults!"
FROM equipment.assets
WHERE workspace_id = :workspaceId!;
