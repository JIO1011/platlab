-- L-01d (ADR 0023, «Reglas de L-01d, reserva real»): al programar, cada bloque aparta lo suyo. Los reactivos, en
-- la capacidad inventario (una reserva por frasco, de los que vencen antes); los equipos concretos, en la agenda de
-- Laboratorios, que es su dueña (ADR 0023), sin que dos bloques activos usen el mismo equipo a la vez. Lo que no
-- alcanza no se aparta a medias en silencio: queda como «Falta» (lo pedido menos lo apartado). Nada se borra: las
-- reservas se liberan.

-- ---------------------------------------------------------------------------
-- Capacidad inventario: una reserva es una salida pendiente (Reactivos) o lo apartado para un bloque (Laboratorios)
-- ---------------------------------------------------------------------------

alter table inventory.allocations
  add column purpose text not null default 'issue' check (purpose in ('issue', 'activity'));

-- Lo apartado para un bloque no entra en la bandeja de salidas de Reactivos ni se aprueba desde ella.
drop index inventory.allocations_pending;
create index allocations_pending on inventory.allocations (workspace_id, created_at) where status = 'held' and purpose = 'issue';

grant insert (purpose) on inventory.allocations to platlab_api;

-- ---------------------------------------------------------------------------
-- Lo que cada bloque apartó
-- ---------------------------------------------------------------------------

-- Una reserva de reactivo por frasco para una línea de la solicitud.
create table labs.activity_allocations (
  workspace_id uuid not null,
  activity_id uuid not null,
  line smallint not null,
  allocation_id uuid not null,
  primary key (allocation_id),
  foreign key (workspace_id, activity_id) references labs.activities (workspace_id, id),
  foreign key (workspace_id, allocation_id) references inventory.allocations (workspace_id, id)
);

create index activity_allocations_activity on labs.activity_allocations (activity_id, line);

-- Un equipo concreto para una línea de equipos del bloque, en su franja. Liberado, deja de ocuparla.
create table labs.activity_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  activity_id uuid not null,
  line smallint not null,
  asset_id uuid not null,
  during tsrange not null check (not isempty(during)),
  released_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, activity_id) references labs.activities (workspace_id, id),
  foreign key (workspace_id, asset_id) references equipment.assets (workspace_id, id),
  -- Un equipo no está en dos bloques activos a la vez.
  constraint activity_assets_no_overlap exclude using gist (workspace_id with =, asset_id with =, during with &&)
    where (released_at is null)
);

create index activity_assets_activity on labs.activity_assets (activity_id, line) where released_at is null;

-- Liberado, no vuelve: un equipo que se reasigna es otra fila.
create function labs.protect_activity_asset() returns trigger
  language plpgsql set search_path = ''
  as $$
begin
  if old.released_at is not null then
    raise exception 'Un equipo liberado no se modifica' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger activity_assets_protect before update on labs.activity_assets
  for each row execute function labs.protect_activity_asset();

alter table labs.activity_allocations enable row level security;
alter table labs.activity_assets enable row level security;

create policy activity_allocations_select on labs.activity_allocations for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy activity_allocations_insert on labs.activity_allocations for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()));

create policy activity_assets_select on labs.activity_assets for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy activity_assets_insert on labs.activity_assets for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()));
create policy activity_assets_update on labs.activity_assets for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

-- El vínculo con la reserva solo se agrega: su estado vive en la reserva.
grant select on labs.activity_allocations to platlab_api;
grant insert (workspace_id, activity_id, line, allocation_id) on labs.activity_allocations to platlab_api;

grant select on labs.activity_assets to platlab_api;
grant insert (workspace_id, activity_id, line, asset_id, during) on labs.activity_assets to platlab_api;
grant update (released_at) on labs.activity_assets to platlab_api;
