/*
  Contexto local de la transacción (02 §5, paso 3). Con `true`, set_config dura solo hasta
  COMMIT o ROLLBACK, así que no pasa a la siguiente petición aunque el pool reutilice la conexión.
  Una cadena vacía equivale a «sin contexto» en las funciones core.current_…().
*/

/* @name setRequestScope */
SELECT
  set_config('platlab.auth_subject', :authSubject!, true) AS auth_subject,
  set_config('platlab.workspace_id', :workspaceId!, true) AS workspace_id;

/* @name setActor */
SELECT
  set_config('platlab.identity_id', :identityId!, true) AS identity_id,
  set_config('platlab.principal_id', :principalId!, true) AS principal_id;
