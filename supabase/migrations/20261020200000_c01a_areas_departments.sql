-- C-01a (ADR 0024, 20-10-2026): áreas y departamentos en una sección propia. El departamento (de quién)
-- es una lista del Núcleo; el lote y el equipo lo guardan enlazado. Las listas «área o departamento» y de
-- destinos de Reactivos pasan a ella, sin repetir nombres, y desaparecen. Las ubicaciones se renombran y
-- se archivan desde la API; quien coloca algo exige una ubicación activa bajo bloqueo.

-- ---------------------------------------------------------------------------
-- Archivado protegido en Core: lo archivado no vuelve ni cambia
-- ---------------------------------------------------------------------------

create function core.protect_archived() returns trigger
  language plpgsql set search_path = ''
  as $$
begin
  if old.archived_at is not null then
    raise exception 'Un elemento archivado no se modifica' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

revoke execute on function core.protect_archived() from public;

-- ---------------------------------------------------------------------------
-- Departamentos (ADR 0024): dueños y carreras del espacio
-- ---------------------------------------------------------------------------

create table core.departments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  name text not null check (length(btrim(name)) between 1 and 120),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, id)
);

-- Un nombre activo no se repite en el espacio, sin distinguir mayúsculas.
create unique index departments_name on core.departments (workspace_id, lower(name)) where archived_at is null;

create trigger departments_protect_archived before update on core.departments
  for each row execute function core.protect_archived();

alter table core.departments enable row level security;

create policy departments_select on core.departments for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy departments_insert on core.departments for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()) and archived_at is null);
create policy departments_update on core.departments for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

grant select on core.departments to platlab_api;
grant insert (workspace_id, name) on core.departments to platlab_api;
-- Se renombra y se archiva; nunca se borra.
grant update (name, archived_at) on core.departments to platlab_api;

-- ---------------------------------------------------------------------------
-- Paso de las listas actuales: activas como departamentos activos; un nombre que solo queda en lotes,
-- como departamento archivado, para que el lote lo conserve sin que se vuelva a ofrecer
-- ---------------------------------------------------------------------------

insert into core.departments (workspace_id, name)
select distinct on (workspace_id, lower(name)) workspace_id, name
  from (
    select workspace_id, left(btrim(name), 120) as name, created_at from inventory.areas where archived_at is null
    union all
    select workspace_id, left(btrim(name), 120), created_at from inventory.destinations where archived_at is null
  ) as source
 order by workspace_id, lower(name), created_at;

insert into core.departments (workspace_id, name, archived_at)
select distinct on (l.workspace_id, lower(left(btrim(l.area), 120))) l.workspace_id, left(btrim(l.area), 120), now()
  from inventory.lots as l
 where l.area is not null
   and not exists (
     select 1 from core.departments as d
      where d.workspace_id = l.workspace_id and lower(d.name) = lower(left(btrim(l.area), 120))
   )
 order by l.workspace_id, lower(left(btrim(l.area), 120)), l.created_at;

-- ---------------------------------------------------------------------------
-- Lotes y equipos guardan el departamento enlazado: renombrarlo cambia en todas partes
-- ---------------------------------------------------------------------------

alter table inventory.lots
  add column department_id uuid,
  add constraint lots_department_fk
    foreign key (workspace_id, department_id) references core.departments (workspace_id, id);

update inventory.lots as l
   set department_id = d.id
  from core.departments as d
 where l.area is not null and d.workspace_id = l.workspace_id and lower(d.name) = lower(left(btrim(l.area), 120));

alter table inventory.lots drop column area;

create index lots_department on inventory.lots (workspace_id, department_id) where department_id is not null;

alter table equipment.assets
  add column department_id uuid,
  add constraint assets_department_fk
    foreign key (workspace_id, department_id) references core.departments (workspace_id, id);

create index assets_department on equipment.assets (workspace_id, department_id) where department_id is not null;

grant insert (department_id), update (department_id) on equipment.assets to platlab_api;

drop table inventory.areas;
drop table inventory.destinations;

-- ---------------------------------------------------------------------------
-- Ubicaciones (ADR 0024): se renombran y se archivan desde Áreas; archivadas no cambian más
-- ---------------------------------------------------------------------------

create trigger locations_protect_archived before update on core.locations
  for each row execute function core.protect_archived();

grant update (name, archived_at) on core.locations to platlab_api;
