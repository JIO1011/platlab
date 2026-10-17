-- E-01c (ADR 0019, 16-10-2026): Inventario por áreas con encargado e Informe exportable. El área y su
-- encargado son de Core porque las ubicaciones son comunes a Reactivos y Equipos; exportar el Informe
-- es un permiso de Equipos.

-- ---------------------------------------------------------------------------
-- Plegado de texto en Core: el mismo de R-01D, ahora también para los nombres de ubicación
-- ---------------------------------------------------------------------------

create function core.fold_text(value text) returns text
  language sql immutable strict parallel safe set search_path = ''
  as $$
  select pg_catalog.translate(
    pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(value), '\s+', ' ', 'g')),
    'áàäâéèëêíìïîóòöôúùüûñ',
    'aaaaeeeeiiiioooouuuun')
$$;

revoke execute on function core.fold_text(text) from public;
grant execute on function core.fold_text(text) to platlab_api;

-- Una sola definición: el plegado de inventario delega en el de Core y devuelve lo mismo, así que sus
-- índices y columnas generadas siguen valiendo.
create or replace function inventory.fold_text(value text) returns text
  language sql immutable strict parallel safe set search_path = ''
  as $$ select core.fold_text(value) $$;

-- Un nombre activo no se repite en el mismo nivel, sin distinguir tildes ni mayúsculas: «Cuarto frío»
-- y «cuarto frio» son la misma ubicación; «Mesón 2» puede existir bajo dos áreas.
drop index core.locations_name;
create unique index locations_name on core.locations (workspace_id, parent_id, core.fold_text(name)) nulls not distinct
  where archived_at is null;

-- ---------------------------------------------------------------------------
-- Áreas: el primer nivel debajo de la sede o el edificio
-- ---------------------------------------------------------------------------

-- Cada ubicación con su área: ella misma si está en la raíz, bajo una sede o un edificio, o si es una
-- sede o un edificio (un equipo puesto en la sede cuenta en ella); si no, el área de su padre. RLS de
-- core.locations limita la vista al espacio del contexto.
create view core.location_areas with (security_invoker = true) as
with recursive walk as (
  select l.workspace_id, l.id, l.id as area_id, l.kind
  from core.locations as l
  left join core.locations as p on p.workspace_id = l.workspace_id and p.id = l.parent_id
  where p.id is null or p.kind in ('site', 'building') or l.kind in ('site', 'building')
  union all
  select child.workspace_id, child.id, walk.area_id, child.kind
  from core.locations as child
  join walk on walk.workspace_id = child.workspace_id and child.parent_id = walk.id
  where walk.kind not in ('site', 'building') and child.kind not in ('site', 'building')
)
select workspace_id, id as location_id, area_id from walk;

grant select on core.location_areas to platlab_api;

-- Encargado del área: un miembro del espacio, uno por área. Lo asigna el Administrador desde un módulo,
-- con auditoría; que la ubicación sea un área y el miembro esté activo lo comprueba el comando.
alter table core.locations
  add column manager_principal_id uuid,
  add constraint locations_manager_fk
    foreign key (workspace_id, manager_principal_id) references core.principals (workspace_id, id);

create policy locations_update on core.locations for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

-- Solo el encargado cambia desde la API: nombre, código, tipo y padre siguen fijos (ADR 0015).
grant update (manager_principal_id, version) on core.locations to platlab_api;

-- ---------------------------------------------------------------------------
-- Permisos del manifiesto (02 §4); catalog.int.test.ts verifica que coincidan
-- ---------------------------------------------------------------------------

insert into core.permissions (code, module_code) values
  ('equipment.report.read', 'equipment');

-- Exportar el Informe es un reporte (01 §5), como reagents.report.read: del Administrador; el
-- Propietario lo hereda (ADR 0008).
insert into core.role_permissions (role_code, permission_code) values
  ('admin', 'equipment.report.read');

-- ---------------------------------------------------------------------------
-- Incidentes en tres pasos (16-10-2026): reportado → en reparación → solucionado
-- ---------------------------------------------------------------------------

-- «Cerrar» desaparece: solucionar es el último paso y es definitivo. No hay infraestructura desplegada
-- ni datos reales, así que lo cerrado de las bases locales vuelve a solucionado y sus columnas se quitan.
alter table incidents.cases disable trigger cases_protect;
update incidents.cases set status = 'resolved' where status = 'closed';
alter table incidents.cases enable trigger cases_protect;

alter table incidents.cases
  drop constraint cases_closed,
  drop constraint cases_resolved,
  drop constraint cases_status_check,
  drop column closed_by_principal_id,
  drop column closed_at,
  add constraint cases_status_check check (status in ('open', 'in_progress', 'resolved')),
  add constraint cases_resolved check (
    (status = 'resolved') = (resolved_at is not null and resolved_by_principal_id is not null and resolution is not null)
  );

-- Un incidente solucionado es definitivo; el paso solo avanza, nunca retrocede.
create or replace function incidents.protect_case() returns trigger
  language plpgsql set search_path = ''
  as $$
begin
  if old.status = 'resolved' then
    raise exception 'Un incidente solucionado no se modifica' using errcode = 'check_violation';
  end if;
  if array_position(array['open', 'in_progress', 'resolved'], new.status)
     < array_position(array['open', 'in_progress', 'resolved'], old.status) then
    raise exception 'Un incidente no vuelve a un paso anterior' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

-- ---------------------------------------------------------------------------
-- Estado físico en el historial (17-10-2026): un cambio desde la ficha deja su fila
-- ---------------------------------------------------------------------------

-- Inmutable, como los historiales de condición y de traslado; nulo es «sin dato». No pide motivo.
create table equipment.conservation_changes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  asset_id uuid not null,
  from_conservation text check (from_conservation in ('good', 'fair', 'poor')),
  to_conservation text check (to_conservation in ('good', 'fair', 'poor')),
  actor_principal_id uuid not null,
  occurred_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, asset_id) references equipment.assets (workspace_id, id),
  foreign key (workspace_id, actor_principal_id) references core.principals (workspace_id, id),
  constraint conservation_changes_distinct check (from_conservation is distinct from to_conservation)
);

create index conservation_changes_asset on equipment.conservation_changes (workspace_id, asset_id, occurred_at desc);

alter table equipment.conservation_changes enable row level security;

create policy conservation_changes_select on equipment.conservation_changes for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
-- Quien registra el cambio es el principal del contexto.
create policy conservation_changes_insert on equipment.conservation_changes for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and actor_principal_id = (select core.current_principal_id())
  );

grant select, insert on equipment.conservation_changes to platlab_api;

-- ---------------------------------------------------------------------------
-- Filtros e indicadores del Informe (17-10-2026): garantía y vida útil en una sola definición
-- ---------------------------------------------------------------------------

-- Garantía a una fecha: vigente, por vencer (hasta el horizonte, 90 días en el Informe), vencida o sin
-- dato. El último día de garantía aún la cubre, como en la ficha.
create function equipment.warranty_state(warranty_until date, today date, horizon date) returns text
  language sql immutable parallel safe set search_path = ''
  as $$
  select case
    when warranty_until is null then 'none'
    when warranty_until < today then 'expired'
    when warranty_until <= horizon then 'expiring'
    else 'active'
  end
$$;

-- Vida útil a una fecha, contada desde la compra: cumplida el día en que se cumple, vigente antes, o sin
-- dato si falta la compra o los años.
create function equipment.useful_life_state(acquired_on date, useful_life_years integer, today date) returns text
  language sql immutable parallel safe set search_path = ''
  as $$
  select case
    when acquired_on is null or useful_life_years is null then 'none'
    when (acquired_on + pg_catalog.make_interval(years => useful_life_years))::date <= today then 'reached'
    else 'current'
  end
$$;

revoke execute on function equipment.warranty_state(date, date, date) from public;
revoke execute on function equipment.useful_life_state(date, integer, date) from public;
grant execute on function equipment.warranty_state(date, date, date) to platlab_api;
grant execute on function equipment.useful_life_state(date, integer, date) to platlab_api;
