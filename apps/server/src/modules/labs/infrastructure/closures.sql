/* Cierres de Laboratorios (ADR 0023): de un espacio o, sin área, feriados comunes. Se anulan, no se borran. */

/* @name listClosures */
-- Los que tocan el rango [from, to], sin los anulados salvo :includeVoided, por fecha; con :closureId,
-- ese cierre aunque esté anulado (la respuesta de un comando).
SELECT c.id, c.area_id, a.name AS "area_name?", c.starts_on, c.ends_on, c.reason, c.voided_at, c.created_at
FROM labs.closures AS c
LEFT JOIN core.locations AS a ON a.workspace_id = c.workspace_id AND a.id = c.area_id
WHERE c.workspace_id = :workspaceId!
  AND CASE WHEN :closureId::uuid IS NULL
    THEN c.starts_on <= :to::date AND c.ends_on >= :from::date
      AND (coalesce(:includeVoided::boolean, false) OR c.voided_at IS NULL)
    ELSE c.id = :closureId::uuid END
ORDER BY c.starts_on, c.ends_on, c.id;

/* @name insertClosure */
INSERT INTO labs.closures (workspace_id, area_id, starts_on, ends_on, reason, created_by_principal_id)
VALUES (:workspaceId!, :areaId, :startsOn!::date, :endsOn!::date, :reason!, :createdBy!)
RETURNING id;

/* @name lockClosure */
-- Lo último del orden de bloqueo (02 §6): el cierre que se anula.
SELECT voided_at
FROM labs.closures
WHERE workspace_id = :workspaceId! AND id = :closureId!
FOR UPDATE;

/* @name voidClosure */
UPDATE labs.closures
SET voided_at = now(), voided_by_principal_id = :voidedBy!
WHERE workspace_id = :workspaceId! AND id = :closureId!;
