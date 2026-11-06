/* Lo que otro módulo puede pedir de Equipos (Laboratorios, ADR 0023): los tipos y cuántos equipos operativos tienen. */

/* @name requestableAssetTypes */
-- Con :typeIds, esos (aunque estén archivados, para validar una solicitud guardada); si no, los activos.
SELECT
  t.id,
  t.name,
  (SELECT count(*) FROM equipment.assets AS a
    WHERE a.workspace_id = t.workspace_id AND a.type_id = t.id AND a.condition = 'operational')::int AS "available!"
FROM equipment.asset_types AS t
WHERE t.workspace_id = :workspaceId!
  AND (CASE WHEN :typeIds::uuid[] IS NOT NULL THEN t.id = ANY (:typeIds::uuid[]) ELSE t.archived_at IS NULL END)
ORDER BY inventory.fold_text(t.name), t.id;

/* @name operationalAssetsOfTypes */
-- Los equipos operativos de esos tipos, para que Laboratorios aparte los libres en la franja de un bloque.
SELECT a.id, a.type_id, a.code, a.name
FROM equipment.assets AS a
WHERE a.workspace_id = :workspaceId! AND a.type_id = ANY (:typeIds!::uuid[]) AND a.condition = 'operational'
ORDER BY a.type_id, a.code, a.id;

/* @name assetCodes */
SELECT id, code
FROM equipment.assets
WHERE workspace_id = :workspaceId! AND id = ANY (:assetIds!::uuid[]);
