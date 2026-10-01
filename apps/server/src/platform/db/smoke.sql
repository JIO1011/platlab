/* @name smokeTypes */
SELECT
  (:amount!)::numeric(24, 9) AS amount,
  (:day!)::date AS day,
  current_setting('platlab.workspace_id', true) AS workspace_id;

/* @name currentRole */
SELECT current_user AS role_name, r.rolsuper AS is_superuser, r.rolbypassrls AS bypasses_rls
FROM pg_roles AS r
WHERE r.rolname = current_user;
