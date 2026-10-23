/* Ajustes de Laboratorios (ADR 0023): la anticipación de todo el espacio de trabajo. */

/* @name getSettings */
-- Sin fila, el comando responde la anticipación por defecto.
SELECT lead_days, version
FROM labs.settings
WHERE workspace_id = :workspaceId!;

/* @name saveSettings */
-- Lo último del orden de bloqueo (02 §6): la fila de ajustes, que se crea la primera vez y después sube
-- su versión.
INSERT INTO labs.settings (workspace_id, lead_days)
VALUES (:workspaceId!, :leadDays!)
ON CONFLICT (workspace_id) DO UPDATE
SET lead_days = excluded.lead_days, version = labs.settings.version + 1
RETURNING lead_days, version;
