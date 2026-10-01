-- T-05: auditoría e idempotencia en la misma transacción del comando
-- (docs/02_arquitectura.md §5 y §7, docs/03_datos.md §3, primer incremento «Una transacción por comando»).

-- ---------------------------------------------------------------------------
-- Auditoría del espacio: solo se añade; el runtime no la modifica ni la borra
-- ---------------------------------------------------------------------------

create table core.audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  actor_principal_id uuid not null,
  -- Acción con el nombre del permiso o comando que la produjo (p. ej. reagents.issue.create).
  action text not null check (action ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  -- La entidad solo describe el registro; las operaciones críticas usan FKs tipadas (03 §1).
  entity_type text not null check (entity_type ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$'),
  entity_id uuid,
  correlation_id uuid not null,
  reason text check (length(btrim(reason)) between 1 and 500),
  changes jsonb not null default '{}'::jsonb check (jsonb_typeof(changes) = 'object'),
  occurred_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, actor_principal_id) references core.principals (workspace_id, id)
);

-- ---------------------------------------------------------------------------
-- Idempotencia (02 §7): clave por espacio, actor y operación, con hash del contenido
-- ---------------------------------------------------------------------------
-- Se reclama al principio del comando y se completa al final, dentro de la misma transacción:
-- un duplicado simultáneo espera al primero y un rollback no deja la clave reclamada.

create table platform.idempotency_records (
  workspace_id uuid not null references core.workspaces (id),
  principal_id uuid not null,
  operation text not null check (operation ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  key text not null check (key ~ '^[A-Za-z0-9._:-]{8,128}$'),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  -- Nulo solo mientras la transacción que la reclamó sigue abierta.
  response jsonb,
  created_at timestamptz not null default now(),
  primary key (workspace_id, principal_id, operation, key),
  foreign key (workspace_id, principal_id) references core.principals (workspace_id, id)
);

-- ---------------------------------------------------------------------------
-- RLS y grants
-- ---------------------------------------------------------------------------

alter table core.audit_events enable row level security;
alter table platform.idempotency_records enable row level security;

create policy audit_events_select on core.audit_events for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));

-- El actor es siempre el principal verificado del contexto: no se puede auditar en nombre de otro.
create policy audit_events_insert on core.audit_events for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and actor_principal_id = (select core.current_principal_id())
  );

create policy idempotency_records_select on platform.idempotency_records for select to platlab_api
  using (
    workspace_id = (select core.current_workspace_id())
    and principal_id = (select core.current_principal_id())
  );

create policy idempotency_records_insert on platform.idempotency_records for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and principal_id = (select core.current_principal_id())
  );

-- Solo se completa una clave abierta: una respuesta confirmada no cambia y un reintento la recibe igual.
create policy idempotency_records_update on platform.idempotency_records for update to platlab_api
  using (
    workspace_id = (select core.current_workspace_id())
    and principal_id = (select core.current_principal_id())
    and response is null
  )
  with check (
    workspace_id = (select core.current_workspace_id())
    and principal_id = (select core.current_principal_id())
  );

grant select, insert on core.audit_events to platlab_api;
grant select, insert on platform.idempotency_records to platlab_api;
grant update (response) on platform.idempotency_records to platlab_api;
