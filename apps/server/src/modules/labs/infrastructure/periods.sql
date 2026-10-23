/* Períodos de Laboratorios (ADR 0023): identifican la actividad en su código; se archivan, no se borran. */

/* @name listPeriods */
-- Activos por fecha de inicio y después los archivados; con :periodId, ese período (la respuesta de un comando).
SELECT id, code, starts_on::text AS "starts_on!", ends_on::text AS "ends_on!", version, archived_at
FROM labs.periods
WHERE workspace_id = :workspaceId!
  AND (:periodId::uuid IS NULL OR id = :periodId::uuid)
ORDER BY archived_at IS NOT NULL, starts_on, id;

/* @name lockPeriod */
-- Lo último del orden de bloqueo (02 §6): el período que se edita o se archiva.
SELECT code, starts_on::text AS "starts_on!", ends_on::text AS "ends_on!", archived_at, version
FROM labs.periods
WHERE workspace_id = :workspaceId! AND id = :periodId!
FOR UPDATE;

/* @name insertPeriod */
-- Un código activo repetido (periods_active_code) o fechas que se cruzan con otro activo
-- (periods_no_overlap) fallan, también si otra persona escribió a la vez; el comando lo explica.
INSERT INTO labs.periods (workspace_id, code, starts_on, ends_on, created_by_principal_id)
VALUES (:workspaceId!, :code!, :startsOn!::date, :endsOn!::date, :createdBy!)
RETURNING id;

/* @name writePeriod */
-- Escribe código y fechas ya combinados y sube la versión; las mismas restricciones que al crear.
UPDATE labs.periods
SET code = :code!, starts_on = :startsOn!::date, ends_on = :endsOn!::date, version = version + 1
WHERE workspace_id = :workspaceId! AND id = :periodId!;

/* @name archivePeriod */
-- Deja de agendarse en él; libera su código y sus fechas.
UPDATE labs.periods
SET archived_at = now(), version = version + 1
WHERE workspace_id = :workspaceId! AND id = :periodId!;
