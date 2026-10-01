-- R-00: capacidad inventario (docs/03_datos.md §1 y §4, primer incremento «Datos y reglas mínimas»).
-- Libro de movimientos con cantidades exactas: cada operación escribe cabecera, asientos y saldo en
-- la misma transacción. En este tramo no hay envases, retornos, reservas ni conversiones de unidades.

create schema inventory;
revoke all on schema inventory from public;
grant usage on schema inventory to platlab_api;

-- ---------------------------------------------------------------------------
-- Unidades (catálogo global, 03 §1.1): solo cambian por migración
-- ---------------------------------------------------------------------------

create table inventory.units (
  code text primary key check (code ~ '^[A-Za-z]{1,10}$'),
  dimension text not null check (dimension in ('mass', 'volume', 'count')),
  name text not null
);

insert into inventory.units (code, dimension, name) values
  ('mg', 'mass', 'miligramo'),
  ('g', 'mass', 'gramo'),
  ('kg', 'mass', 'kilogramo'),
  ('mL', 'volume', 'mililitro'),
  ('L', 'volume', 'litro'),
  ('u', 'count', 'unidad');

-- ---------------------------------------------------------------------------
-- Ítems y lotes
-- ---------------------------------------------------------------------------

create table inventory.items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  -- Módulo dueño del ítem (02 §4): una ruta de Reactivos solo opera ítems reactivos.
  kind text not null check (kind in ('reagent', 'material')),
  code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'),
  name text not null check (length(btrim(name)) between 1 and 200),
  base_unit text not null references inventory.units (code),
  archived_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  -- Destino de la FK de las extensiones: fija el tipo del ítem (un ítem no es reactivo y material).
  unique (workspace_id, id, kind)
);

create unique index items_code on inventory.items (workspace_id, lower(code));

create trigger items_touch before update on inventory.items
  for each row execute function core.touch_updated_at();

create table inventory.lots (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  item_id uuid not null,
  -- Código interno; el lote del proveedor no es clave (03 §1).
  code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'),
  -- Nulo significa desconocido, no «sin dato pendiente».
  supplier_name text check (length(btrim(supplier_name)) between 1 and 200),
  supplier_lot text check (length(btrim(supplier_lot)) between 1 and 100),
  expires_on date,
  condition text not null default 'enabled'
    check (condition in ('enabled', 'quarantine', 'blocked', 'discarded')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  -- Destino de la FK de posiciones: el lote pertenece al ítem de la posición.
  unique (workspace_id, id, item_id),
  foreign key (workspace_id, item_id) references inventory.items (workspace_id, id)
);

create unique index lots_code on inventory.lots (workspace_id, item_id, lower(code));

create trigger lots_touch before update on inventory.lots
  for each row execute function core.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Posiciones, operaciones y asientos
-- ---------------------------------------------------------------------------

create table inventory.positions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  item_id uuid not null,
  lot_id uuid not null,
  location_id uuid not null,
  disposition text not null default 'usable' check (disposition in ('usable', 'quarantine', 'restricted')),
  -- Solo cambia junto con un asiento: lo comprueba positions_balance al confirmar.
  balance numeric(24, 9) not null default 0 check (balance >= 0),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, item_id) references inventory.items (workspace_id, id),
  foreign key (workspace_id, lot_id, item_id) references inventory.lots (workspace_id, id, item_id),
  foreign key (workspace_id, location_id) references core.locations (workspace_id, id)
);

-- Clave de la posición con los nulos tratados como iguales (03 §4); envases y retornos se añadirán.
create unique index positions_key
  on inventory.positions (workspace_id, item_id, lot_id, location_id, disposition) nulls not distinct;

create trigger positions_touch before update on inventory.positions
  for each row execute function core.touch_updated_at();

create table inventory.operations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  type text not null check (type in ('receipt', 'issue', 'adjustment')),
  actor_principal_id uuid not null,
  reason text check (length(btrim(reason)) between 1 and 500),
  destination text check (length(btrim(destination)) between 1 and 200),
  reference text check (length(btrim(reference)) between 1 and 200),
  -- La fija el servidor; no se admiten retrofechas (primer incremento).
  effective_at timestamptz not null default now(),
  correlation_id uuid not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, actor_principal_id) references core.principals (workspace_id, id),
  constraint operations_issue_fields check (type <> 'issue' or (reason is not null and destination is not null)),
  constraint operations_adjustment_reason check (type <> 'adjustment' or reason is not null)
);

-- Justificado por el historial: más recientes primero dentro del espacio.
create index operations_history on inventory.operations (workspace_id, effective_at desc, id desc);

create table inventory.entries (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  operation_id uuid not null,
  position_id uuid not null,
  -- Cantidad con signo en la unidad base; la capturada se conserva tal como llegó (03 §1).
  quantity numeric(24, 9) not null check (quantity <> 0),
  captured_quantity numeric(24, 9) not null check (captured_quantity <> 0),
  captured_unit text not null references inventory.units (code),
  balance_after numeric(24, 9) not null check (balance_after >= 0),
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, operation_id) references inventory.operations (workspace_id, id),
  foreign key (workspace_id, position_id) references inventory.positions (workspace_id, id)
);

-- Justificados por la comprobación del saldo y por el historial.
create index entries_position on inventory.entries (workspace_id, position_id) include (quantity);
create index entries_operation on inventory.entries (workspace_id, operation_id);

-- El signo del asiento corresponde a su operación: el ingreso suma, la salida resta.
create function inventory.check_entry_sign() returns trigger
  language plpgsql set search_path = ''
  as $$
declare
  operation_type text;
begin
  select o.type into operation_type
    from inventory.operations as o
   where o.workspace_id = new.workspace_id and o.id = new.operation_id;
  if (operation_type = 'receipt' and new.quantity < 0) or (operation_type = 'issue' and new.quantity > 0) then
    raise exception 'El signo del asiento no corresponde a una operación %', operation_type
      using errcode = 'check_violation';
  end if;
  return new;
end
$$;

create trigger entries_sign before insert on inventory.entries
  for each row execute function inventory.check_entry_sign();

-- Movimiento confirmado y saldo se guardan juntos (03 §4): al confirmar, el saldo de cada posición
-- tocada es la suma de sus asientos. Un saldo editado sin asiento hace fallar el commit.
create function inventory.check_position_balance() returns trigger
  language plpgsql set search_path = ''
  as $$
declare
  target uuid;
  target_workspace uuid;
  stored numeric;
  ledger numeric;
begin
  if tg_table_name = 'positions' then
    target := new.id;
  else
    target := new.position_id;
  end if;
  target_workspace := new.workspace_id;
  select p.balance into stored
    from inventory.positions as p
   where p.workspace_id = target_workspace and p.id = target;
  select coalesce(sum(e.quantity), 0) into ledger
    from inventory.entries as e
   where e.workspace_id = target_workspace and e.position_id = target;
  if stored is distinct from ledger then
    raise exception 'El saldo de la posición % (%) no coincide con sus asientos (%)', target, stored, ledger
      using errcode = 'check_violation';
  end if;
  return null;
end
$$;

create constraint trigger positions_balance
  after insert or update of balance on inventory.positions
  deferrable initially deferred
  for each row execute function inventory.check_position_balance();

create constraint trigger entries_balance
  after insert on inventory.entries
  deferrable initially deferred
  for each row execute function inventory.check_position_balance();

revoke execute on function inventory.check_entry_sign(), inventory.check_position_balance() from public;

-- ---------------------------------------------------------------------------
-- RLS y grants: el runtime añade movimientos; no edita ni borra historia
-- ---------------------------------------------------------------------------

alter table inventory.units enable row level security;
alter table inventory.items enable row level security;
alter table inventory.lots enable row level security;
alter table inventory.positions enable row level security;
alter table inventory.operations enable row level security;
alter table inventory.entries enable row level security;

create policy units_select on inventory.units for select to platlab_api using (true);

create policy items_select on inventory.items for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy items_insert on inventory.items for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()));

create policy lots_select on inventory.lots for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy lots_insert on inventory.lots for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()));

create policy positions_select on inventory.positions for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy positions_insert on inventory.positions for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()) and balance = 0);
create policy positions_update on inventory.positions for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

create policy operations_select on inventory.operations for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy operations_insert on inventory.operations for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and actor_principal_id = (select core.current_principal_id())
  );

create policy entries_select on inventory.entries for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
-- Un asiento solo se cuelga de una operación del actor del contexto.
create policy entries_insert on inventory.entries for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and exists (
      select 1
        from inventory.operations as o
       where o.workspace_id = entries.workspace_id
         and o.id = entries.operation_id
         and o.actor_principal_id = (select core.current_principal_id())
    )
  );

grant select on inventory.units to platlab_api;
grant select, insert on inventory.items, inventory.lots, inventory.positions, inventory.entries
  to platlab_api;
grant select on inventory.operations to platlab_api;
-- Sin INSERT sobre effective_at ni created_at: la fecha la pone siempre la base, sin retrofechas.
grant insert (workspace_id, type, actor_principal_id, reason, destination, reference, correlation_id)
  on inventory.operations to platlab_api;
-- El saldo cambia junto con su asiento; FOR UPDATE de la posición también exige UPDATE.
grant update (balance, version) on inventory.positions to platlab_api;
