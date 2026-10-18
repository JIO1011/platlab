-- M-01a (ADR 0020): módulo Mantenimiento. Proveedores, planes por tipo de equipo o por equipo con sus
-- exclusiones, y el registro inmutable de lo hecho con su certificado. No tiene inventario propio: lee
-- los equipos por la vista de Equipos y no escribe en `equipment` (ADR 0019). La próxima fecha se
-- calcula al consultar (sin tareas en segundo plano). Nada se borra: proveedores, planes y exclusiones
-- se archivan.

insert into core.module_definitions (code, name, stage) values ('maintenance', 'Mantenimiento', 'development');
insert into core.module_dependencies (module_code, requires_code) values ('maintenance', 'equipment');

-- ---------------------------------------------------------------------------
-- Directorio de equipos: lo que Equipos deja leer a otros módulos (ADR 0020). Con security_invoker,
-- quien consulta pasa por la RLS de equipment.assets: solo ve los equipos de su espacio.
-- ---------------------------------------------------------------------------

create view equipment.asset_directory with (security_invoker = true) as
  select workspace_id, id, type_id, code, name, location_id, condition, conservation, created_at
    from equipment.assets;

-- Los tipos, para nombrar el alcance de un plan aunque el tipo aún no tenga equipos.
create view equipment.asset_type_directory with (security_invoker = true) as
  select workspace_id, id, name, archived_at
    from equipment.asset_types;

grant select on equipment.asset_directory, equipment.asset_type_directory to platlab_api;

create schema maintenance;
revoke all on schema maintenance from public;
grant usage on schema maintenance to platlab_api;

-- ---------------------------------------------------------------------------
-- Proveedores de servicio del espacio: se archivan, no se borran
-- ---------------------------------------------------------------------------

create table maintenance.providers (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  name text not null check (length(btrim(name)) between 1 and 120),
  -- Teléfono, correo o persona de contacto, como texto libre hasta que el cliente pida más (pendientes de 05).
  contact text check (length(btrim(contact)) between 1 and 300),
  archived_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  unique (workspace_id, id)
);

-- Sin tildes, mayúsculas ni espacios de más (ADR 0015).
create unique index providers_name on maintenance.providers (workspace_id, core.fold_text(name))
  where archived_at is null;

-- ---------------------------------------------------------------------------
-- Planes (ADR 0020): por tipo de equipo, que cubre todas sus unidades y las nuevas, o por un equipo
-- ---------------------------------------------------------------------------

-- Lista de verificación de un plan: hasta 30 ítems de 1 a 200 caracteres.
create function maintenance.plan_checklist_valid(items text[]) returns boolean
  language sql immutable parallel safe set search_path = ''
  as $$
    select cardinality(items) <= 30
       and coalesce(array_ndims(items), 1) = 1
       and not exists (
         select 1 from unnest(items) as i (item)
          where item is null or length(btrim(item)) not between 1 and 200
       )
  $$;

create table maintenance.plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  kind text not null check (kind in ('preventive', 'calibration', 'verification', 'cleaning')),
  title text not null check (length(btrim(title)) between 1 and 120),
  -- Alcance: un tipo de equipo o un equipo, nunca los dos.
  asset_type_id uuid,
  asset_id uuid,
  -- Frecuencia: cada N días, semanas, meses o años.
  interval_count integer not null check (interval_count between 1 and 999),
  interval_unit text not null check (interval_unit in ('day', 'week', 'month', 'year')),
  starts_on date not null,
  checklist text[] not null default '{}' check (maintenance.plan_checklist_valid(checklist)),
  acceptance_criteria text check (length(btrim(acceptance_criteria)) between 1 and 1000),
  archived_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_by_principal_id uuid not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  -- El registro hecho con un plan repite su tipo de trabajo.
  unique (workspace_id, id, kind),
  -- Solo un plan por tipo de equipo admite exclusiones.
  unique (workspace_id, id, asset_type_id),
  -- Un plan propio reemplaza al del tipo solo para su equipo.
  unique (workspace_id, id, asset_id),
  foreign key (workspace_id, asset_type_id) references equipment.asset_types (workspace_id, id),
  foreign key (workspace_id, asset_id) references equipment.assets (workspace_id, id),
  foreign key (workspace_id, created_by_principal_id) references core.principals (workspace_id, id),
  constraint plans_scope check (num_nonnulls(asset_type_id, asset_id) = 1)
);

create index plans_asset_type on maintenance.plans (workspace_id, asset_type_id) where archived_at is null;
create index plans_asset on maintenance.plans (workspace_id, asset_id) where archived_at is null;

-- Archivar es definitivo: un plan o una exclusión archivados conservan su forma, sin cambios.
create function maintenance.protect_archived() returns trigger
  language plpgsql set search_path = ''
  as $$
begin
  if old.archived_at is not null then
    raise exception 'Lo archivado no se modifica' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

revoke execute on function maintenance.protect_archived() from public;

create trigger plans_protect_archived before update on maintenance.plans
  for each row execute function maintenance.protect_archived();

-- Equipo excluido de un plan de su tipo, con motivo. Excluir otra vez exige archivar la vigente.
create table maintenance.plan_exclusions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  plan_id uuid not null,
  -- El tipo del plan: la FK exige que el plan sea por tipo de equipo.
  asset_type_id uuid not null,
  asset_id uuid not null,
  reason text not null check (length(btrim(reason)) between 1 and 500),
  -- El plan propio del mismo equipo que lo reemplaza; archivarlo archiva la exclusión.
  replaced_by_plan_id uuid,
  created_by_principal_id uuid not null,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (workspace_id, id),
  foreign key (workspace_id, plan_id, asset_type_id) references maintenance.plans (workspace_id, id, asset_type_id),
  foreign key (workspace_id, replaced_by_plan_id, asset_id) references maintenance.plans (workspace_id, id, asset_id),
  foreign key (workspace_id, asset_id) references equipment.assets (workspace_id, id),
  foreign key (workspace_id, created_by_principal_id) references core.principals (workspace_id, id)
);

create unique index plan_exclusions_active on maintenance.plan_exclusions (workspace_id, plan_id, asset_id)
  where archived_at is null;
-- Archivar un plan propio busca las exclusiones vigentes que creó.
create index plan_exclusions_replaced_by on maintenance.plan_exclusions (workspace_id, replaced_by_plan_id)
  where replaced_by_plan_id is not null and archived_at is null;

create trigger plan_exclusions_protect_archived before update on maintenance.plan_exclusions
  for each row execute function maintenance.protect_archived();

-- ---------------------------------------------------------------------------
-- Registro de lo hecho (ADR 0020): inmutable, con el plan elegido o con su tipo de trabajo
-- ---------------------------------------------------------------------------

-- Lista marcada de un registro: hasta 30 objetos {item, done}, con el texto de 1 a 200 caracteres.
create function maintenance.record_checklist_valid(items jsonb) returns boolean
  language sql immutable parallel safe set search_path = ''
  as $$
    select case when jsonb_typeof(items) <> 'array' then false else
      jsonb_array_length(items) <= 30
      and not exists (
        select 1 from jsonb_array_elements(items) as e (entry)
         where not coalesce(
           case when jsonb_typeof(entry) <> 'object' then false else
             entry ?& array['item', 'done']
             and entry - 'item' - 'done' = '{}'::jsonb
             and jsonb_typeof(entry -> 'item') = 'string'
             and length(btrim(entry ->> 'item')) between 1 and 200
             and jsonb_typeof(entry -> 'done') = 'boolean'
           end, false)
      )
    end
  $$;

create table maintenance.records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  asset_id uuid not null,
  -- Sin plan, el registro lleva solo su tipo de trabajo.
  plan_id uuid,
  -- La versión del plan con que se llenó y su criterio de aceptación, copiado; nulos sin plan.
  plan_version integer check (plan_version > 0),
  acceptance_criteria text check (length(btrim(acceptance_criteria)) between 1 and 1000),
  kind text not null check (kind in ('preventive', 'calibration', 'verification', 'cleaning')),
  -- Puede ser pasada: carga la última vez que se hizo.
  performed_on date not null,
  -- Nulo es un trabajo interno.
  provider_id uuid,
  result text not null check (result in ('pass', 'pass_with_observations', 'fail')),
  observations text check (length(btrim(observations)) between 1 and 2000),
  checklist jsonb not null default '[]' check (maintenance.record_checklist_valid(checklist)),
  -- Importe exacto (03 §1).
  cost numeric(14, 2) check (cost >= 0),
  -- La calibración o el certificado vencen en esta fecha; manda sobre la frecuencia del plan.
  valid_until date,
  recorded_by_principal_id uuid not null,
  recorded_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, asset_id) references equipment.assets (workspace_id, id),
  foreign key (workspace_id, plan_id, kind) references maintenance.plans (workspace_id, id, kind),
  foreign key (workspace_id, provider_id) references maintenance.providers (workspace_id, id),
  foreign key (workspace_id, recorded_by_principal_id) references core.principals (workspace_id, id),
  -- Con observaciones o no conforme, las observaciones son obligatorias.
  constraint records_observations check (result = 'pass' or observations is not null),
  constraint records_valid_until check (valid_until is null or valid_until >= performed_on),
  constraint records_plan_copy check (
    (plan_id is null) = (plan_version is null) and (plan_id is not null or acceptance_criteria is null)
  )
);

-- El último registro de un plan para un equipo sale del índice (próxima fecha).
create index records_last on maintenance.records (workspace_id, plan_id, asset_id, performed_on desc, recorded_at desc)
  where plan_id is not null;
-- La pestaña Mantenimiento de la ficha lista los registros del equipo.
create index records_asset on maintenance.records (workspace_id, asset_id, performed_on desc);

-- Certificado PDF de un registro, uno por registro, con las reglas de los documentos de Equipos
-- (E-01e): la API lo sube a Storage y la fila nunca se borra ni se sobrescribe.
create table maintenance.record_certificates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  record_id uuid not null,
  -- Ruta dentro del bucket, fija por el espacio y el id: nadie apunta a un archivo de otro espacio.
  object_path text not null unique,
  url text not null check (url ~ '^https?://' and length(url) <= 2000),
  -- Hasta 20 MiB, el límite general de archivos (02 §12).
  byte_size integer not null check (byte_size between 1 and 20971520),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_by_principal_id uuid not null,
  uploaded_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, record_id),
  foreign key (workspace_id, record_id) references maintenance.records (workspace_id, id),
  foreign key (workspace_id, uploaded_by_principal_id) references core.principals (workspace_id, id),
  constraint record_certificates_object_path check (
    object_path = workspace_id::text || '/maintenance/certificates/' || id::text || '.pdf'
  )
);

-- ---------------------------------------------------------------------------
-- Equipos de cada plan y su próxima fecha (ADR 0020): base de «Por hacer», la ficha y la columna
-- del Inventario. Un plan activo cubre su equipo o los de su tipo que no estén dados de baja ni
-- excluidos. Sin registros, toca en el inicio del plan o, si el equipo se registró después, en su
-- alta (en la zona horaria del espacio); luego, en la «válida hasta» del último registro del plan
-- o en su fecha más la frecuencia. Un «No conforme» cuenta como hecho: la fecha avanza, y `last_result`
-- lo deja a la vista hasta un registro Conforme o Con observaciones.
-- ---------------------------------------------------------------------------

create view maintenance.plan_assets with (security_invoker = true) as
  select p.workspace_id,
         p.id as plan_id,
         a.id as asset_id,
         last.id as last_record_id,
         last.performed_on as last_performed_on,
         last.result as last_result,
         coalesce(
           last.valid_until,
           (last.performed_on + case p.interval_unit
              when 'day' then make_interval(days => p.interval_count)
              when 'week' then make_interval(weeks => p.interval_count)
              when 'month' then make_interval(months => p.interval_count)
              else make_interval(years => p.interval_count)
            end)::date,
           greatest(p.starts_on, (a.created_at at time zone w.time_zone)::date)
         ) as due_on
    from maintenance.plans as p
    join core.workspaces as w on w.id = p.workspace_id
    join equipment.asset_directory as a
      on a.workspace_id = p.workspace_id and (a.id = p.asset_id or a.type_id = p.asset_type_id)
    left join lateral (
      select r.id, r.performed_on, r.valid_until, r.result
        from maintenance.records as r
       where r.workspace_id = p.workspace_id and r.plan_id = p.id and r.asset_id = a.id
       order by r.performed_on desc, r.recorded_at desc
       limit 1
    ) as last on true
   where p.archived_at is null
     and a.condition <> 'retired'
     and not exists (
       select 1 from maintenance.plan_exclusions as x
        where x.workspace_id = p.workspace_id and x.plan_id = p.id and x.asset_id = a.id
          and x.archived_at is null
     );

-- ---------------------------------------------------------------------------
-- RLS y grants: el runtime lee y escribe solo en el espacio de su contexto, y la autoría es suya
-- ---------------------------------------------------------------------------

alter table maintenance.providers enable row level security;
alter table maintenance.plans enable row level security;
alter table maintenance.plan_exclusions enable row level security;
alter table maintenance.records enable row level security;
alter table maintenance.record_certificates enable row level security;

create policy providers_select on maintenance.providers for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy providers_insert on maintenance.providers for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()) and archived_at is null);
create policy providers_update on maintenance.providers for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

create policy plans_select on maintenance.plans for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy plans_insert on maintenance.plans for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and created_by_principal_id = (select core.current_principal_id())
    and archived_at is null
  );
create policy plans_update on maintenance.plans for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

create policy plan_exclusions_select on maintenance.plan_exclusions for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy plan_exclusions_insert on maintenance.plan_exclusions for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and created_by_principal_id = (select core.current_principal_id())
    and archived_at is null
  );
create policy plan_exclusions_update on maintenance.plan_exclusions for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

create policy records_select on maintenance.records for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy records_insert on maintenance.records for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and recorded_by_principal_id = (select core.current_principal_id())
  );

create policy record_certificates_select on maintenance.record_certificates for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy record_certificates_insert on maintenance.record_certificates for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and uploaded_by_principal_id = (select core.current_principal_id())
  );

-- Las CHECK de las listas llaman a estas funciones con los privilegios de quien escribe.
revoke execute on function
  maintenance.plan_checklist_valid(text[]), maintenance.record_checklist_valid(jsonb)
  from public;
grant execute on function
  maintenance.plan_checklist_valid(text[]), maintenance.record_checklist_valid(jsonb)
  to platlab_api;

grant select on maintenance.providers to platlab_api;
grant insert (workspace_id, name, contact) on maintenance.providers to platlab_api;
grant update (name, contact, archived_at, version) on maintenance.providers to platlab_api;

grant select on maintenance.plans to platlab_api;
grant insert (
  workspace_id, kind, title, asset_type_id, asset_id, interval_count, interval_unit, starts_on, checklist,
  acceptance_criteria, created_by_principal_id
) on maintenance.plans to platlab_api;
-- El tipo de trabajo y el alcance son la identidad del plan: los registros y las exclusiones apuntan a ellos.
grant update (
  title, interval_count, interval_unit, starts_on, checklist, acceptance_criteria, archived_at, version
) on maintenance.plans to platlab_api;

grant select on maintenance.plan_exclusions to platlab_api;
grant insert (workspace_id, plan_id, asset_type_id, asset_id, reason, replaced_by_plan_id, created_by_principal_id)
  on maintenance.plan_exclusions to platlab_api;
-- Archivar es lo único que se cambia de una exclusión.
grant update (archived_at) on maintenance.plan_exclusions to platlab_api;

-- El registro y su certificado no se editan ni se borran.
grant select on maintenance.records to platlab_api;
grant insert (
  id, workspace_id, asset_id, plan_id, plan_version, acceptance_criteria, kind, performed_on, provider_id, result,
  observations, checklist, cost, valid_until, recorded_by_principal_id
) on maintenance.records to platlab_api;

grant select on maintenance.record_certificates to platlab_api;
grant insert (id, workspace_id, record_id, object_path, url, byte_size, sha256, uploaded_by_principal_id)
  on maintenance.record_certificates to platlab_api;

grant select on maintenance.plan_assets to platlab_api;

-- ---------------------------------------------------------------------------
-- Permisos del manifiesto (02 §4); catalog.int.test.ts verifica que coincidan
-- ---------------------------------------------------------------------------

insert into core.permissions (code, module_code) values
  ('maintenance.work.read', 'maintenance'),
  ('maintenance.work.record', 'maintenance'),
  ('maintenance.plan.manage', 'maintenance');

-- ADR 0020: el Administrador crea planes y proveedores; el Operador consulta y registra. Docente y
-- Estudiante no entran (reportan en Equipos). El Propietario hereda por core.effective_role_assignments.
insert into core.role_permissions (role_code, permission_code) values
  ('admin', 'maintenance.work.read'),
  ('admin', 'maintenance.work.record'),
  ('admin', 'maintenance.plan.manage'),
  ('operator', 'maintenance.work.read'),
  ('operator', 'maintenance.work.record');
