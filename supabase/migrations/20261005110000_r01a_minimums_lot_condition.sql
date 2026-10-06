-- R-01A, entrega 3 (ADR 0012, cambio del 05-10-2026): mínimo por reactivo y estado del lote.
--
-- El mínimo es un número opcional del ítem, para todo el espacio y en su unidad base. El estado del
-- lote lo cambia el Administrador con motivo, y cada cambio queda en un historial que no se edita.
-- Descartar es definitivo: una operación de baja (`disposal`) lleva a cero todos los frascos del lote.
-- Orden de bloqueo dentro de «datos» (02 §6), el mismo de las entregas anteriores: lote → posición.

-- ---------------------------------------------------------------------------
-- Mínimo por ítem
-- ---------------------------------------------------------------------------

alter table inventory.items
  add column minimum_quantity numeric(24, 9) check (minimum_quantity > 0);

create policy items_update on inventory.items for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

grant update (minimum_quantity, version) on inventory.items to platlab_api;

-- ---------------------------------------------------------------------------
-- Bajas: operación `disposal` con motivo de su propia lista
-- ---------------------------------------------------------------------------

alter table inventory.operations drop constraint operations_type_check;
alter table inventory.operations
  add constraint operations_type_check check (type in ('receipt', 'issue', 'adjustment', 'disposal')),
  add constraint operations_disposal_reason check (type <> 'disposal' or reason is not null);

alter table inventory.reasons drop constraint reasons_kind_check;
alter table inventory.reasons
  add constraint reasons_kind_check check (kind in ('issue', 'adjustment', 'disposal'));

-- El signo del asiento corresponde a su operación: el ingreso suma; la salida y la baja restan.
-- Un lote descartado no vuelve a recibir existencias.
create or replace function inventory.check_entry_sign() returns trigger
  language plpgsql set search_path = ''
  as $$
declare
  operation_type text;
  lot_condition text;
begin
  select o.type into operation_type
    from inventory.operations as o
   where o.workspace_id = new.workspace_id and o.id = new.operation_id;
  if (operation_type = 'receipt' and new.quantity < 0)
     or (operation_type in ('issue', 'disposal') and new.quantity > 0) then
    raise exception 'El signo del asiento no corresponde a una operación %', operation_type
      using errcode = 'check_violation';
  end if;
  if new.quantity > 0 then
    select l.condition into lot_condition
      from inventory.positions as p
      join inventory.lots as l on l.workspace_id = p.workspace_id and l.id = p.lot_id
     where p.workspace_id = new.workspace_id and p.id = new.position_id;
    if lot_condition = 'discarded' then
      raise exception 'El lote está descartado' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end
$$;

-- ---------------------------------------------------------------------------
-- Historial del estado del lote
-- ---------------------------------------------------------------------------

create table inventory.lot_condition_changes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  lot_id uuid not null,
  from_condition text not null check (from_condition in ('enabled', 'quarantine', 'blocked', 'discarded')),
  to_condition text not null check (to_condition in ('enabled', 'quarantine', 'blocked', 'discarded')),
  reason text not null check (length(btrim(reason)) between 1 and 500),
  actor_principal_id uuid not null,
  -- La baja que acompañó al descarte; nula si el lote ya no tenía saldo o si no es un descarte.
  operation_id uuid,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, lot_id) references inventory.lots (workspace_id, id),
  foreign key (workspace_id, actor_principal_id) references core.principals (workspace_id, id),
  foreign key (workspace_id, operation_id) references inventory.operations (workspace_id, id),
  constraint lot_condition_changes_differ check (from_condition <> to_condition),
  -- Descartar es definitivo: nada sale de «descartado».
  constraint lot_condition_changes_final check (from_condition <> 'discarded'),
  constraint lot_condition_changes_operation check (operation_id is null or to_condition = 'discarded')
);

-- Justificado por la ficha: el último cambio de cada lote.
create index lot_condition_changes_lot on inventory.lot_condition_changes (workspace_id, lot_id, created_at desc);

-- El estado del lote y su historial se escriben juntos: al confirmar, el estado de un lote que cambió
-- en la transacción es el último registrado en ella; un lote descartado no conserva saldo, y del
-- estado descartado no se sale.
create function inventory.check_lot_condition() returns trigger
  language plpgsql set search_path = ''
  as $$
declare
  current_condition text;
begin
  select l.condition into current_condition
    from inventory.lots as l
   where l.workspace_id = new.workspace_id and l.id = new.id;
  if not exists (
    select 1
      from inventory.lot_condition_changes as c
     where c.workspace_id = new.workspace_id
       and c.lot_id = new.id
       and c.to_condition = current_condition
       and c.created_at = now()
  ) then
    raise exception 'El cambio de estado del lote % no tiene su registro con motivo', new.id
      using errcode = 'check_violation';
  end if;
  if current_condition = 'discarded' and exists (
    select 1
      from inventory.positions as p
     where p.workspace_id = new.workspace_id and p.lot_id = new.id and p.balance > 0
  ) then
    raise exception 'El lote descartado % todavía tiene saldo', new.id using errcode = 'check_violation';
  end if;
  return null;
end
$$;

create function inventory.protect_discarded_lot() returns trigger
  language plpgsql set search_path = ''
  as $$
begin
  if old.condition = 'discarded' and new.condition <> old.condition then
    raise exception 'Un lote descartado no cambia de estado' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

revoke execute on function inventory.check_lot_condition(), inventory.protect_discarded_lot() from public;

create trigger lots_protect_discarded before update of condition on inventory.lots
  for each row execute function inventory.protect_discarded_lot();

create constraint trigger lots_condition_logged
  after update of condition on inventory.lots
  deferrable initially deferred
  for each row
  when (old.condition is distinct from new.condition)
  execute function inventory.check_lot_condition();

-- ---------------------------------------------------------------------------
-- RLS y grants
-- ---------------------------------------------------------------------------

alter table inventory.lot_condition_changes enable row level security;

create policy lot_condition_changes_select on inventory.lot_condition_changes for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
-- Solo se registra en nombre propio.
create policy lot_condition_changes_insert on inventory.lot_condition_changes for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and actor_principal_id = (select core.current_principal_id())
  );

grant select on inventory.lot_condition_changes to platlab_api;
-- Sin created_at: la fecha la pone la base. Sin UPDATE ni DELETE: el historial no se edita.
grant insert (workspace_id, lot_id, from_condition, to_condition, reason, actor_principal_id, operation_id)
  on inventory.lot_condition_changes to platlab_api;
grant update (condition, version) on inventory.lots to platlab_api;

-- ---------------------------------------------------------------------------
-- Permiso del estado del lote (manifiesto de Reactivos; el Propietario lo hereda del Administrador)
-- ---------------------------------------------------------------------------

insert into core.permissions (code, module_code) values ('reagents.lot.manage', 'reagents');
insert into core.role_permissions (role_code, permission_code) values ('admin', 'reagents.lot.manage');
