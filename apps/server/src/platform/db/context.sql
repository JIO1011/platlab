/* @name setRequestContext */
SELECT
  set_config('platlab.workspace_id', :workspaceId!, true) AS workspace_id,
  set_config('platlab.principal_id', :principalId!, true) AS principal_id;
