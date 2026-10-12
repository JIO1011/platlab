-- R-01A, entrega 1 (ADR 0012): reactivos por frasco, y motivos y destinos en listas.
--
-- Un frasco (envase, 03 §4) es un objeto físico de un lote con su cantidad inicial. La posición pasa
-- a ser frasco + ubicación + disposición; salidas, ajustes y traslados operan sobre un frasco. El
-- código visible del frasco es «código del lote-NN» y se deriva en las consultas: el número lo
-- reparte el lote, de forma atómica, para que dos ingresos simultáneos no lo repitan.

-- ---------------------------------------------------------------------------
-- Frascos
-- ---------------------------------------------------------------------------

alter table inventory.lots
  add column container_seq integer not null default 0 check (container_seq >= 0);

create table inventory.containers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  item_id uuid not null,
  lot_id uuid not null,
  -- Número del frasco dentro de su lote: 1, 2, 3… Nunca se reutiliza.
  seq integer not null check (seq > 0),
  -- Cantidad con la que entró, en la unidad base del ítem: referencia del % restante.
  initial_quantity numeric(24, 9) not null check (initial_quantity > 0),
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  -- Destino de la FK de posiciones: el frasco pertenece al lote y al ítem de la posición.
  unique (workspace_id, id, lot_id, item_id),
  unique (workspace_id, lot_id, seq),
  foreign key (workspace_id, lot_id, item_id) references inventory.lots (workspace_id, id, item_id)
);

alter table inventory.positions add column container_id uuid;

alter table inventory.positions
  add constraint positions_container_fk
  foreign key (workspace_id, container_id, lot_id, item_id)
  references inventory.containers (workspace_id, id, lot_id, item_id);

-- La clave de la posición incluye el frasco, con los nulos tratados como iguales (03 §4).
drop index inventory.positions_key;
create unique index positions_key
  on inventory.positions (workspace_id, item_id, lot_id, container_id, location_id, disposition) nulls not distinct;

-- Un frasco está en un solo lugar: solo una de sus posiciones puede tener saldo. Un traslado vacía
-- el origen antes de llenar el destino, dentro de la misma transacción.
create unique index positions_container_stocked
  on inventory.positions (workspace_id, container_id)
  where container_id is not null and balance > 0;

-- ---------------------------------------------------------------------------
-- Motivos y destinos (03 §4, «desde R-01»): listas del espacio; se archivan, no se borran
-- ---------------------------------------------------------------------------

-- Cada módulo tiene sus listas (`item_kind`): compartir la capacidad nunca comparte derechos (02 §4),
-- así que el permiso de Reactivos no administra las listas de Materiales.
create table inventory.reasons (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  item_kind text not null check (item_kind in ('reagent', 'material')),
  kind text not null check (kind in ('issue', 'adjustment')),
  name text not null check (length(btrim(name)) between 1 and 120),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, id)
);

create unique index reasons_name on inventory.reasons (workspace_id, item_kind, kind, lower(name)) where archived_at is null;

create table inventory.destinations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  item_kind text not null check (item_kind in ('reagent', 'material')),
  name text not null check (length(btrim(name)) between 1 and 120),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, id)
);

create unique index destinations_name on inventory.destinations (workspace_id, item_kind, lower(name)) where archived_at is null;

-- Un elemento archivado no vuelve: la historia guarda el texto elegido en cada operación.
create function inventory.protect_archived() returns trigger
  language plpgsql set search_path = ''
  as $$
begin
  if old.archived_at is not null then
    raise exception 'Un elemento archivado no se modifica' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

revoke execute on function inventory.protect_archived() from public;

create trigger reasons_protect_archived before update on inventory.reasons
  for each row execute function inventory.protect_archived();
create trigger destinations_protect_archived before update on inventory.destinations
  for each row execute function inventory.protect_archived();

-- ---------------------------------------------------------------------------
-- RLS y grants
-- ---------------------------------------------------------------------------

alter table inventory.containers enable row level security;
alter table inventory.reasons enable row level security;
alter table inventory.destinations enable row level security;

create policy containers_select on inventory.containers for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy containers_insert on inventory.containers for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()));

-- El ingreso reserva números de frasco incrementando el contador del lote, que queda bloqueado.
create policy lots_update on inventory.lots for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

create policy reasons_select on inventory.reasons for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy reasons_insert on inventory.reasons for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()) and archived_at is null);
create policy reasons_update on inventory.reasons for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

create policy destinations_select on inventory.destinations for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy destinations_insert on inventory.destinations for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()) and archived_at is null);
create policy destinations_update on inventory.destinations for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

grant select, insert on inventory.containers to platlab_api;
grant update (container_seq) on inventory.lots to platlab_api;
grant select on inventory.reasons, inventory.destinations to platlab_api;
grant insert (workspace_id, item_kind, kind, name) on inventory.reasons to platlab_api;
grant insert (workspace_id, item_kind, name) on inventory.destinations to platlab_api;
-- Archivar es lo único que se cambia; nunca se borra.
grant update (archived_at) on inventory.reasons, inventory.destinations to platlab_api;
