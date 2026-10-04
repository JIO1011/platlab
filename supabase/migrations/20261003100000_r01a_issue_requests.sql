-- R-01A, entrega 2 (ADR 0012, 03 §4): las salidas del Operador quedan pendientes y apartan la
-- cantidad del frasco hasta que el Administrador o el Propietario las aprueban o las rechazan.
-- Lo disponible es saldo − reservado; ninguna salida ni ajuste baja el saldo por debajo de lo
-- reservado. Orden de bloqueo dentro de «datos» (02 §6): lote → posición → reserva.

-- ---------------------------------------------------------------------------
-- Lo reservado por frasco y quién pidió cada salida
-- ---------------------------------------------------------------------------

alter table inventory.positions
  add column reserved numeric(24, 9) not null default 0,
  add constraint positions_reserved_range check (reserved >= 0 and reserved <= balance);

-- Quien pidió la salida que otro aprobó: la historia muestra a los dos (el actor es el aprobador).
alter table inventory.operations
  add column requested_by_principal_id uuid,
  add constraint operations_requested_by_fk
    foreign key (workspace_id, requested_by_principal_id) references core.principals (workspace_id, id);

-- ---------------------------------------------------------------------------
-- Reservas de salida (03 §4: held → fulfilled / released)
-- ---------------------------------------------------------------------------

create table inventory.allocations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  position_id uuid not null,
  quantity numeric(24, 9) not null check (quantity > 0),
  status text not null default 'held' check (status in ('held', 'fulfilled', 'released')),
  reason text not null check (length(btrim(reason)) between 1 and 500),
  destination text not null check (length(btrim(destination)) between 1 and 200),
  requested_by_principal_id uuid not null,
  decided_by_principal_id uuid,
  decided_at timestamptz,
  decision_reason text check (length(btrim(decision_reason)) between 1 and 500),
  operation_id uuid,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, position_id) references inventory.positions (workspace_id, id),
  foreign key (workspace_id, requested_by_principal_id) references core.principals (workspace_id, id),
  foreign key (workspace_id, decided_by_principal_id) references core.principals (workspace_id, id),
  foreign key (workspace_id, operation_id) references inventory.operations (workspace_id, id),
  -- Pendiente sin decisión; decidida con quién y cuándo.
  constraint allocations_decision check (
    (status = 'held' and decided_by_principal_id is null and decided_at is null and operation_id is null)
    or (status <> 'held' and decided_by_principal_id is not null and decided_at is not null)
  ),
  -- Aprobada, con su movimiento; nadie aprueba su propia solicitud.
  constraint allocations_fulfilled check (
    status <> 'fulfilled' or (operation_id is not null and decided_by_principal_id <> requested_by_principal_id)
  ),
  -- Rechazar la solicitud de otro exige motivo; cancelar la propia, no.
  constraint allocations_rejection_reason check (
    status <> 'released' or decided_by_principal_id = requested_by_principal_id or decision_reason is not null
  )
);

-- La bandeja: solicitudes pendientes del espacio, de la más antigua a la más reciente.
create index allocations_pending on inventory.allocations (workspace_id, created_at) where status = 'held';

-- Una reserva decidida no cambia más: la historia de la decisión no se reescribe.
create function inventory.protect_decided_allocation() returns trigger
  language plpgsql set search_path = ''
  as $$
begin
  if old.status <> 'held' then
    raise exception 'Una solicitud decidida no se modifica' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

revoke execute on function inventory.protect_decided_allocation() from public;

create trigger allocations_protect_decided before update on inventory.allocations
  for each row execute function inventory.protect_decided_allocation();

-- ---------------------------------------------------------------------------
-- RLS y grants
-- ---------------------------------------------------------------------------

alter table inventory.allocations enable row level security;

create policy allocations_select on inventory.allocations for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
-- Solo se pide en nombre propio.
create policy allocations_insert on inventory.allocations for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and requested_by_principal_id = (select core.current_principal_id())
    and status = 'held'
  );
-- Solo se decide en nombre propio.
create policy allocations_update on inventory.allocations for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (
    workspace_id = (select core.current_workspace_id())
    and decided_by_principal_id = (select core.current_principal_id())
  );

grant select on inventory.allocations to platlab_api;
grant insert (workspace_id, position_id, quantity, reason, destination, requested_by_principal_id)
  on inventory.allocations to platlab_api;
grant update (status, decided_by_principal_id, decided_at, decision_reason, operation_id, version)
  on inventory.allocations to platlab_api;
grant update (reserved) on inventory.positions to platlab_api;
grant insert (requested_by_principal_id) on inventory.operations to platlab_api;

-- ---------------------------------------------------------------------------
-- Permiso de aprobación (manifiesto de Reactivos; el Propietario lo hereda del Administrador)
-- ---------------------------------------------------------------------------

insert into core.permissions (code, module_code) values ('reagents.issue.approve', 'reagents');
insert into core.role_permissions (role_code, permission_code) values ('admin', 'reagents.issue.approve');
