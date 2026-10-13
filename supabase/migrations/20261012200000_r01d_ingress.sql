-- R-01D (ADR 0015): ingreso en un paso, ficha editable, control por peso y ubicaciones desde la API.
--
-- El frasco pasa a tener código propio, único en el espacio; los existentes conservan el que se
-- derivaba («lote-NN»). La tara y la densidad con que se calculó viven en el frasco; la cuenta la
-- hace la base (numeric), con un único factor de gramos por unidad. El lote guarda la marca y el
-- área, y su código es automático por reactivo. Sin permisos nuevos: el manifiesto no cambia.

-- ---------------------------------------------------------------------------
-- Ficha del reactivo (03 §4)
-- ---------------------------------------------------------------------------

alter table reagents.products drop constraint products_physical_state_check;
alter table reagents.products
  add constraint products_physical_state_check
    check (physical_state in ('solid', 'liquid', 'aqueous', 'mixture', 'gas')),
  -- Pictogramas SGA: solo los nueve oficiales.
  add column hazards text[] not null default '{}'
    constraint products_hazards_check
    check (hazards <@ array['GHS01', 'GHS02', 'GHS03', 'GHS04', 'GHS05', 'GHS06', 'GHS07', 'GHS08', 'GHS09']),
  -- Lo marca el Administrador, nunca el sistema por el CAS (ADR 0015).
  add column controlled boolean not null default false,
  -- Ficha de seguridad: digital (con enlace), solo en físico o no tiene; nulo es «sin dato».
  add column sds_kind text constraint products_sds_kind_check check (sds_kind in ('digital', 'physical', 'none')),
  add column sds_url text constraint products_sds_url_check check (sds_url ~ '^https?://' and length(sds_url) <= 2000),
  -- Densidad en g/mL: se sugiere al pesar los frascos que se miden en volumen.
  add column density numeric(24, 9) constraint products_density_check check (density > 0),
  add constraint products_sds_url_digital check (sds_url is null or sds_kind = 'digital');

create policy products_update on reagents.products for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

grant update (cas_number, physical_state, hazards, controlled, sds_kind, sds_url, density)
  on reagents.products to platlab_api;

-- ---------------------------------------------------------------------------
-- Ítems: unidad fija tras el primer movimiento y contador de lotes
-- ---------------------------------------------------------------------------

-- Reparte el número del lote automático (L-001…), como container_seq los números de frasco: el
-- UPDATE bloquea el ítem, así que dos ingresos simultáneos reciben números distintos.
alter table inventory.items
  add column lot_seq integer not null default 0 check (lot_seq >= 0);

update inventory.items as i
   set lot_seq = (select count(*) from inventory.lots as l where l.workspace_id = i.workspace_id and l.item_id = i.id);

-- La unidad no cambia después del primer movimiento: sus asientos quedarían en otra unidad. El
-- comando bloquea el ítem y lo comprueba antes; esto lo respalda.
create function inventory.protect_base_unit() returns trigger
  language plpgsql set search_path = ''
  as $$
begin
  if new.base_unit is distinct from old.base_unit and exists (
    select 1
      from inventory.positions as p
      join inventory.entries as e on e.workspace_id = p.workspace_id and e.position_id = p.id
     where p.workspace_id = old.workspace_id and p.item_id = old.id
  ) then
    raise exception 'La unidad del ítem % no cambia: ya tiene movimientos', old.id
      using errcode = 'check_violation';
  end if;
  return new;
end
$$;

revoke execute on function inventory.protect_base_unit() from public;

create trigger items_protect_base_unit before update of base_unit on inventory.items
  for each row execute function inventory.protect_base_unit();

grant update (name, base_unit, lot_seq) on inventory.items to platlab_api;

-- ---------------------------------------------------------------------------
-- Lotes: marca y área
-- ---------------------------------------------------------------------------

alter table inventory.lots rename column supplier_name to brand;
alter table inventory.lots rename constraint lots_supplier_name_check to lots_brand_check;
-- El texto elegido de la lista de áreas (ADR 0015); archivar el área no cambia el lote.
alter table inventory.lots
  add column area text constraint lots_area_check check (length(btrim(area)) between 1 and 200);

-- ---------------------------------------------------------------------------
-- Frascos: código propio, tara y densidad
-- ---------------------------------------------------------------------------

alter table inventory.containers add column code text;

-- Los frascos existentes conservan su código derivado: «código del lote-NN» (desde el 100, sin
-- recortar el número). Si dos frascos del espacio chocan, a ambos se les antepone el código de su
-- ítem; lo que aún choque o no cumpla el formato toma un código a partir de su id.
update inventory.containers as c
   set code = l.code || '-' || case when c.seq < 100 then lpad(c.seq::text, 2, '0') else c.seq::text end
  from inventory.lots as l
 where l.workspace_id = c.workspace_id and l.id = c.lot_id;

update inventory.containers as c
   set code = i.code || '-' || c.code
  from inventory.items as i
 where i.workspace_id = c.workspace_id and i.id = c.item_id
   and exists (
     select 1 from inventory.containers as other
      where other.workspace_id = c.workspace_id and other.id <> c.id and lower(other.code) = lower(c.code)
   );

update inventory.containers as c
   set code = 'F-' || replace(c.id::text, '-', '')
 where c.code !~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'
    or exists (
      select 1 from inventory.containers as other
       where other.workspace_id = c.workspace_id and other.id <> c.id and lower(other.code) = lower(c.code)
    );

alter table inventory.containers
  alter column code set not null,
  add constraint containers_code_check check (code ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'),
  -- Tara en g y densidad en g/mL con que se calculó (ADR 0015): sin tara no hay control por peso.
  add column tare numeric(24, 9) constraint containers_tare_check check (tare > 0),
  add column density numeric(24, 9) constraint containers_density_check check (density > 0),
  add constraint containers_density_needs_tare check (density is null or tare is not null);

-- Único en el espacio sin distinguir mayúsculas (03 §1); el ingreso traduce el choque a CODE_TAKEN.
create unique index containers_code on inventory.containers (workspace_id, lower(code));

create policy containers_update on inventory.containers for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

-- Del frasco solo cambian la tara y su densidad, al fijar la tara.
grant update (tare, density) on inventory.containers to platlab_api;

-- ---------------------------------------------------------------------------
-- Control por peso: un único factor de gramos por unidad (ADR 0015)
-- ---------------------------------------------------------------------------

-- Gramos que pesa una unidad del ítem: en masa no depende de la densidad; en volumen la necesita.
-- Nulo si la unidad no se pesa (mg, u) o falta la densidad.
create function inventory.grams_per_unit(unit text, density numeric) returns numeric
  language sql immutable set search_path = ''
  as $$
  select case unit
    when 'g' then 1::numeric
    when 'kg' then 1000::numeric
    when 'mL' then density
    when 'L' then 1000 * density
  end
$$;

revoke execute on function inventory.grams_per_unit(text, numeric) from public;
grant execute on function inventory.grams_per_unit(text, numeric) to platlab_api;

-- ---------------------------------------------------------------------------
-- Áreas o departamentos (03 §4): lista del módulo, como los destinos
-- ---------------------------------------------------------------------------

create table inventory.areas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  item_kind text not null check (item_kind in ('reagent', 'material')),
  name text not null check (length(btrim(name)) between 1 and 120),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, id)
);

create unique index areas_name on inventory.areas (workspace_id, item_kind, lower(name)) where archived_at is null;

create trigger areas_protect_archived before update on inventory.areas
  for each row execute function inventory.protect_archived();

alter table inventory.areas enable row level security;

create policy areas_select on inventory.areas for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy areas_insert on inventory.areas for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()) and archived_at is null);
create policy areas_update on inventory.areas for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

grant select on inventory.areas to platlab_api;
grant insert (workspace_id, item_kind, name) on inventory.areas to platlab_api;
grant update (archived_at) on inventory.areas to platlab_api;

-- ---------------------------------------------------------------------------
-- Ubicaciones desde la API (ADR 0015): se crean, no se editan ni se mueven
-- ---------------------------------------------------------------------------

-- Un nombre activo no se repite bajo el mismo padre: crearlo otra vez devuelve la existente.
create unique index locations_name on core.locations (workspace_id, parent_id, lower(name)) nulls not distinct
  where archived_at is null;

create policy locations_insert on core.locations for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()) and archived_at is null);

grant insert (workspace_id, parent_id, kind, code, name) on core.locations to platlab_api;
