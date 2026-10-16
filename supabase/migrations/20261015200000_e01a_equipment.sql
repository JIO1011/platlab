-- E-01a (ADR 0019): módulo Equipos. Tipos de equipo, activos con su ficha, condición, conservación,
-- traslados e historial. El estado tiene cuatro dimensiones: la condición (si se puede usar) y la
-- conservación se guardan aquí; el tipo de falla vive en la falla (E-01b) y la disponibilidad se
-- calcula al consultar. Nada se borra: un equipo se da de baja (`retired`) y un tipo se archiva.

insert into core.module_definitions (code, name, stage) values ('equipment', 'Equipos', 'development');

create schema equipment;
revoke all on schema equipment from public;
grant usage on schema equipment to platlab_api;

-- ---------------------------------------------------------------------------
-- Tipos de equipo: lista del espacio (centrífuga, balanza…); se archivan, no se borran
-- ---------------------------------------------------------------------------

create table equipment.asset_types (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  name text not null check (length(btrim(name)) between 1 and 120),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, id)
);

-- Sin tildes, mayúsculas ni espacios de más: el mismo plegado del catálogo (ADR 0015).
create unique index asset_types_name on equipment.asset_types (workspace_id, inventory.fold_text(name))
  where archived_at is null;

-- ---------------------------------------------------------------------------
-- Activos: la ficha del equipo (ADR 0019)
-- ---------------------------------------------------------------------------

create table equipment.assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  type_id uuid not null,
  -- Código interno o de activo de la institución; único en el espacio (03 §1).
  code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'),
  name text not null check (length(btrim(name)) between 1 and 200),
  brand text check (length(btrim(brand)) between 1 and 120),
  model text check (length(btrim(model)) between 1 and 120),
  -- La serie es del fabricante: no es clave (03 §1).
  serial_number text check (length(btrim(serial_number)) between 1 and 120),
  -- Texto hasta que el cliente confirme sus valores (110 V, 220 V, batería…; pendientes de 05).
  power_supply text check (length(btrim(power_supply)) between 1 and 60),
  location_id uuid not null,
  responsible_principal_id uuid,
  -- Condición: si se puede usar. Cambia solo por comando, con su fila en condition_changes.
  condition text not null default 'operational'
    check (condition in ('operational', 'restricted', 'faulted', 'retired')),
  -- Conservación: estado físico; nulo es «sin dato».
  conservation text check (conservation in ('good', 'fair', 'poor')),
  supplier text check (length(btrim(supplier)) between 1 and 120),
  acquired_on date,
  warranty_until date,
  useful_life_years integer check (useful_life_years between 1 and 100),
  -- Importe exacto (03 §1): base del aviso «Evaluar reemplazo» (E-01c).
  replacement_value numeric(14, 2) check (replacement_value >= 0),
  -- Texto de búsqueda plegado una vez al escribir (ADR 0015): el inventario busca en una sola columna.
  search_text text not null generated always as (
    inventory.fold_text(
      code || ' ' || name || ' ' || coalesce(brand, '') || ' ' || coalesce(model, '') || ' ' || coalesce(serial_number, '')
    )
  ) stored,
  created_by_principal_id uuid not null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, type_id) references equipment.asset_types (workspace_id, id),
  foreign key (workspace_id, location_id) references core.locations (workspace_id, id),
  foreign key (workspace_id, responsible_principal_id) references core.principals (workspace_id, id),
  foreign key (workspace_id, created_by_principal_id) references core.principals (workspace_id, id),
  constraint assets_warranty check (warranty_until is null or acquired_on is null or warranty_until >= acquired_on)
);

-- También ordena el inventario y es su cursor: la página sale del índice, sin ordenar en memoria.
create unique index assets_code on equipment.assets (workspace_id, lower(code));
create index assets_location on equipment.assets (workspace_id, location_id);
-- Cifras del Resumen y de la tarjeta de Inicio por condición, sin leer las filas.
create index assets_condition on equipment.assets (workspace_id, condition);

create trigger assets_touch before update on equipment.assets
  for each row execute function core.touch_updated_at();

-- Dar de baja es definitivo: un equipo retirado conserva su ficha y su historia, sin cambios.
create function equipment.protect_retired() returns trigger
  language plpgsql set search_path = ''
  as $$
begin
  if old.condition = 'retired' then
    raise exception 'Un equipo dado de baja no se modifica' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

revoke execute on function equipment.protect_retired() from public;

create trigger assets_protect_retired before update on equipment.assets
  for each row execute function equipment.protect_retired();

-- ---------------------------------------------------------------------------
-- Foto del equipo (ADR 0019): imagen pública que la API sube a Storage. Cada foto es una fila que nunca
-- se borra ni se sobrescribe; el equipo apunta a la vigente, como la ficha de seguridad (ADR 0017).
-- ---------------------------------------------------------------------------

create table equipment.asset_photos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  asset_id uuid not null,
  -- Ruta dentro del bucket, fija por el espacio, el id y el tipo: nadie apunta a un archivo de otro espacio.
  object_path text not null unique,
  url text not null check (url ~ '^https?://' and length(url) <= 2000),
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
  -- Hasta 2 MiB (02 §12); la web la envía reducida.
  byte_size integer not null check (byte_size between 1 and 2097152),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_by_principal_id uuid not null,
  uploaded_at timestamptz not null default now(),
  unique (workspace_id, id),
  -- El puntero del equipo exige que la foto sea suya.
  unique (workspace_id, asset_id, id),
  foreign key (workspace_id, asset_id) references equipment.assets (workspace_id, id),
  foreign key (workspace_id, uploaded_by_principal_id) references core.principals (workspace_id, id),
  constraint asset_photos_object_path check (
    object_path = workspace_id::text || '/equipment/' || id::text || '.'
      || case content_type when 'image/jpeg' then 'jpg' when 'image/png' then 'png' else 'webp' end
  )
);

alter table equipment.assets
  add column photo_id uuid,
  add constraint assets_photo_fk
    foreign key (workspace_id, id, photo_id) references equipment.asset_photos (workspace_id, asset_id, id);

-- ---------------------------------------------------------------------------
-- Historial: cambios de condición y traslados; inmutables (03 §5)
-- ---------------------------------------------------------------------------

create table equipment.condition_changes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  asset_id uuid not null,
  from_condition text not null check (from_condition in ('operational', 'restricted', 'faulted')),
  to_condition text not null check (to_condition in ('operational', 'restricted', 'faulted', 'retired')),
  reason text not null check (length(btrim(reason)) between 1 and 500),
  result text check (length(btrim(result)) between 1 and 500),
  -- Quien registra el cambio es su responsable (01 §6.3).
  actor_principal_id uuid not null,
  occurred_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, asset_id) references equipment.assets (workspace_id, id),
  foreign key (workspace_id, actor_principal_id) references core.principals (workspace_id, id),
  constraint condition_changes_distinct check (from_condition <> to_condition),
  -- Volver a operativo exige un resultado (01 §6.3, 03 §5).
  constraint condition_changes_result check (to_condition <> 'operational' or result is not null)
);

create index condition_changes_asset on equipment.condition_changes (workspace_id, asset_id, occurred_at desc);

create table equipment.location_changes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  asset_id uuid not null,
  from_location_id uuid not null,
  to_location_id uuid not null,
  note text check (length(btrim(note)) between 1 and 500),
  actor_principal_id uuid not null,
  occurred_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, asset_id) references equipment.assets (workspace_id, id),
  foreign key (workspace_id, from_location_id) references core.locations (workspace_id, id),
  foreign key (workspace_id, to_location_id) references core.locations (workspace_id, id),
  foreign key (workspace_id, actor_principal_id) references core.principals (workspace_id, id),
  constraint location_changes_distinct check (from_location_id <> to_location_id)
);

create index location_changes_asset on equipment.location_changes (workspace_id, asset_id, occurred_at desc);

-- ---------------------------------------------------------------------------
-- RLS y grants: el runtime lee y escribe solo en el espacio de su contexto, y la autoría es suya
-- ---------------------------------------------------------------------------

alter table equipment.asset_types enable row level security;
alter table equipment.assets enable row level security;
alter table equipment.asset_photos enable row level security;
alter table equipment.condition_changes enable row level security;
alter table equipment.location_changes enable row level security;

create policy asset_types_select on equipment.asset_types for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy asset_types_insert on equipment.asset_types for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()) and archived_at is null);
create policy asset_types_update on equipment.asset_types for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

create policy assets_select on equipment.assets for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
-- Un alta nunca nace dada de baja.
create policy assets_insert on equipment.assets for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and created_by_principal_id = (select core.current_principal_id())
    and condition <> 'retired'
  );
create policy assets_update on equipment.assets for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

create policy asset_photos_select on equipment.asset_photos for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy asset_photos_insert on equipment.asset_photos for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and uploaded_by_principal_id = (select core.current_principal_id())
  );

create policy condition_changes_select on equipment.condition_changes for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy condition_changes_insert on equipment.condition_changes for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and actor_principal_id = (select core.current_principal_id())
  );

create policy location_changes_select on equipment.location_changes for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy location_changes_insert on equipment.location_changes for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and actor_principal_id = (select core.current_principal_id())
  );

grant select on equipment.asset_types to platlab_api;
grant insert (workspace_id, name) on equipment.asset_types to platlab_api;
-- Archivar es lo único que se cambia de un tipo.
grant update (archived_at) on equipment.asset_types to platlab_api;

grant select on equipment.assets to platlab_api;
grant insert (
  workspace_id, type_id, code, name, brand, model, serial_number, power_supply, location_id,
  responsible_principal_id, condition, conservation, supplier, acquired_on, warranty_until,
  useful_life_years, replacement_value, created_by_principal_id
) on equipment.assets to platlab_api;
-- Ubicación y condición cambian por sus comandos, que dejan su fila de historial.
grant update (
  type_id, code, name, brand, model, serial_number, power_supply, location_id,
  responsible_principal_id, condition, conservation, supplier, acquired_on, warranty_until,
  useful_life_years, replacement_value, photo_id, version
) on equipment.assets to platlab_api;
-- Una foto nueva es otra fila: sin UPDATE ni DELETE.
grant select, insert on equipment.asset_photos to platlab_api;

-- El historial no se edita ni se borra.
grant select, insert on equipment.condition_changes, equipment.location_changes to platlab_api;

-- ---------------------------------------------------------------------------
-- Permisos del manifiesto (02 §4); catalog.int.test.ts verifica que coincidan
-- ---------------------------------------------------------------------------

insert into core.permissions (code, module_code) values
  ('equipment.catalog.read', 'equipment'),
  ('equipment.catalog.manage', 'equipment'),
  ('equipment.condition.change', 'equipment'),
  ('equipment.transfer.create', 'equipment');

-- Matriz de 01 §5: catálogo y bajas del Administrador; condición y traslados también del Operador.
-- El Propietario los hereda por core.effective_role_assignments (ADR 0008).
insert into core.role_permissions (role_code, permission_code) values
  ('admin', 'equipment.catalog.read'),
  ('admin', 'equipment.catalog.manage'),
  ('admin', 'equipment.condition.change'),
  ('admin', 'equipment.transfer.create'),
  ('operator', 'equipment.catalog.read'),
  ('operator', 'equipment.condition.change'),
  ('operator', 'equipment.transfer.create');
