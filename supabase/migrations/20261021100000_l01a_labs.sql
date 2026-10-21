-- L-01a (ADR 0023): módulo Laboratorios. Espacios: áreas del Núcleo habilitadas para agendar, con aforo,
-- horario semanal y cierres; feriados comunes; la anticipación del espacio de trabajo; y el Formato de
-- solicitud, cuyas versiones son inmutables. No escribe en Core: que la ubicación sea un área activa lo
-- comprueba el comando. Nada se borra: los espacios se archivan y los cierres se anulan.

insert into core.module_definitions (code, name, stage) values ('labs', 'Laboratorios', 'development');

create schema labs;
revoke all on schema labs from public;
grant usage on schema labs to platlab_api;

-- ---------------------------------------------------------------------------
-- Ajustes del espacio de trabajo: sin fila, la anticipación es de 7 días
-- ---------------------------------------------------------------------------

create table labs.settings (
  workspace_id uuid primary key references core.workspaces (id),
  lead_days smallint not null default 7 check (lead_days between 0 and 90),
  version integer not null default 1 check (version > 0)
);

-- ---------------------------------------------------------------------------
-- Espacios: el área completa con su aforo y su horario semanal (ADR 0023)
-- ---------------------------------------------------------------------------

-- Horario semanal: un objeto con los días ISO "1" (lunes) a "7" (domingo), cada uno con sus franjas
-- [apertura, cierre) {"opens": "HH:MM", "closes": "HH:MM"} ordenadas y sin solaparse; un día sin
-- franjas está cerrado. 24:00 no es una hora: el último cierre posible es 23:59.
create function labs.weekly_hours_valid(hours jsonb) returns boolean
  language sql immutable parallel safe set search_path = ''
  as $$
    select case when jsonb_typeof(hours) <> 'object' then false else
      array(select jsonb_object_keys(hours) order by 1) = array['1', '2', '3', '4', '5', '6', '7']
      and not exists (
        select 1
          from jsonb_each(hours) as d (day, slots)
          cross join lateral jsonb_array_elements(
            case when jsonb_typeof(slots) = 'array' then slots else '[null]'::jsonb end
          ) with ordinality as s (slot, n)
         where not coalesce(
           case when jsonb_typeof(slot) <> 'object' then false else
             slot - 'opens' - 'closes' = '{}'::jsonb
             and slot ->> 'opens' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
             and slot ->> 'closes' ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
             and slot ->> 'opens' < slot ->> 'closes'
             -- Abre cuando la anterior ya cerró: ordenadas y sin solaparse.
             and (n = 1 or slot ->> 'opens' >= slots -> (n::integer - 2) ->> 'closes')
           end, false)
      )
    end
  $$;

-- La FK compuesta va a la ubicación del Núcleo (la vista de áreas no admite FK); que sea un área activa
-- lo comprueba el comando bajo bloqueo compartido.
create table labs.spaces (
  workspace_id uuid not null references core.workspaces (id),
  area_id uuid not null,
  capacity integer not null check (capacity > 0),
  weekly_hours jsonb not null check (labs.weekly_hours_valid(weekly_hours)),
  version integer not null default 1 check (version > 0),
  archived_at timestamptz,
  created_by_principal_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, area_id),
  foreign key (workspace_id, area_id) references core.locations (workspace_id, id),
  foreign key (workspace_id, created_by_principal_id) references core.principals (workspace_id, id)
);

-- ---------------------------------------------------------------------------
-- Cierres por fechas: de un espacio o, sin área, un feriado común. Se anulan, no se borran
-- ---------------------------------------------------------------------------

create table labs.closures (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  area_id uuid,
  starts_on date not null,
  ends_on date not null,
  reason text not null check (length(btrim(reason)) between 1 and 200),
  voided_at timestamptz,
  voided_by_principal_id uuid,
  created_by_principal_id uuid not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, area_id) references labs.spaces (workspace_id, area_id),
  foreign key (workspace_id, created_by_principal_id) references core.principals (workspace_id, id),
  foreign key (workspace_id, voided_by_principal_id) references core.principals (workspace_id, id),
  constraint closures_dates check (starts_on <= ends_on),
  constraint closures_void check ((voided_at is null) = (voided_by_principal_id is null))
);

-- La lista por rango busca los cierres que terminan desde el inicio del rango.
create index closures_range on labs.closures (workspace_id, ends_on, starts_on);

-- Anular es definitivo: un cierre anulado no vuelve a valer ni cambia.
create function labs.protect_voided() returns trigger
  language plpgsql set search_path = ''
  as $$
begin
  if old.voided_at is not null then
    raise exception 'Lo anulado no se modifica' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

revoke execute on function labs.protect_voided() from public;

create trigger closures_protect_voided before update on labs.closures
  for each row execute function labs.protect_voided();

-- ---------------------------------------------------------------------------
-- Formato de solicitud: uno por espacio de trabajo, cada guardado es una versión nueva e inmutable
-- ---------------------------------------------------------------------------

-- Campos libres: hasta 30 objetos {key, label, type, required[, options]} con claves únicas en minúsculas,
-- etiqueta de 1 a 80 caracteres y, solo en las listas y obligatorias en ellas, de 1 a 30 opciones únicas
-- de 1 a 80 caracteres. El núcleo del formato es fijo: de él solo se guardan dos nombres que se adaptan.
create function labs.form_fields_valid(fields jsonb) returns boolean
  language sql immutable parallel safe set search_path = ''
  as $$
    select case when jsonb_typeof(fields) <> 'array' then false else
      jsonb_array_length(fields) <= 30
      and not exists (
        select 1 from jsonb_array_elements(fields) as f (field)
         where not coalesce(
           case when jsonb_typeof(field) <> 'object' then false else
             field ?& array['key', 'label', 'type', 'required']
             and field - 'key' - 'label' - 'type' - 'required' - 'options' = '{}'::jsonb
             and jsonb_typeof(field -> 'key') = 'string'
             and field ->> 'key' ~ '^[a-z][a-z0-9_]{0,39}$'
             and jsonb_typeof(field -> 'label') = 'string'
             and length(btrim(field ->> 'label')) between 1 and 80
             and jsonb_typeof(field -> 'type') = 'string'
             and field ->> 'type' in ('text', 'number', 'date', 'list', 'boolean')
             and jsonb_typeof(field -> 'required') = 'boolean'
             and case
               when field ->> 'type' <> 'list' then not field ? 'options'
               when jsonb_typeof(field -> 'options') <> 'array' then false
               else jsonb_array_length(field -> 'options') between 1 and 30
                 and not exists (
                   select 1 from jsonb_array_elements(field -> 'options') as o (option)
                    where jsonb_typeof(option) <> 'string' or length(btrim(option #>> '{}')) not between 1 and 80
                 )
                 and (select count(distinct option) = count(*) from jsonb_array_elements(field -> 'options') as o (option))
             end
           end, false)
      )
      and (select count(distinct field ->> 'key') = count(*) from jsonb_array_elements(fields) as f (field))
    end
  $$;

create table labs.form_versions (
  workspace_id uuid not null references core.workspaces (id),
  version integer not null check (version >= 1),
  title text not null check (length(btrim(title)) between 1 and 120),
  -- Membrete (ADR 0023, formato estándar): el código del documento; la revisión es la versión.
  document_code text check (length(btrim(document_code)) between 1 and 40),
  -- Nombres de dos campos del núcleo que el Administrador adapta («Proyecto», «Cliente»).
  subject_label text not null check (length(btrim(subject_label)) between 1 and 40),
  unit_label text not null check (length(btrim(unit_label)) between 1 and 40),
  fields jsonb not null check (labs.form_fields_valid(fields)),
  published_by_principal_id uuid not null,
  published_at timestamptz not null default now(),
  primary key (workspace_id, version),
  foreign key (workspace_id, published_by_principal_id) references core.principals (workspace_id, id)
);

-- ---------------------------------------------------------------------------
-- RLS y grants: el runtime lee y escribe solo en el espacio de su contexto, y la autoría es suya
-- ---------------------------------------------------------------------------

alter table labs.settings enable row level security;
alter table labs.spaces enable row level security;
alter table labs.closures enable row level security;
alter table labs.form_versions enable row level security;

create policy settings_select on labs.settings for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy settings_insert on labs.settings for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()));
create policy settings_update on labs.settings for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

create policy spaces_select on labs.spaces for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy spaces_insert on labs.spaces for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and created_by_principal_id = (select core.current_principal_id())
    and archived_at is null
  );
create policy spaces_update on labs.spaces for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

create policy closures_select on labs.closures for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy closures_insert on labs.closures for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and created_by_principal_id = (select core.current_principal_id())
    and voided_at is null
  );
create policy closures_update on labs.closures for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (
    workspace_id = (select core.current_workspace_id())
    and voided_by_principal_id = (select core.current_principal_id())
  );

create policy form_versions_select on labs.form_versions for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy form_versions_insert on labs.form_versions for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and published_by_principal_id = (select core.current_principal_id())
  );

-- Las CHECK del horario y de los campos llaman a estas funciones con los privilegios de quien escribe.
revoke execute on function labs.weekly_hours_valid(jsonb), labs.form_fields_valid(jsonb) from public;
grant execute on function labs.weekly_hours_valid(jsonb), labs.form_fields_valid(jsonb) to platlab_api;

grant select on labs.settings to platlab_api;
grant insert (workspace_id, lead_days) on labs.settings to platlab_api;
grant update (lead_days, version) on labs.settings to platlab_api;

grant select on labs.spaces to platlab_api;
grant insert (workspace_id, area_id, capacity, weekly_hours, created_by_principal_id) on labs.spaces to platlab_api;
-- El área es la identidad del espacio: los cierres apuntan a ella.
grant update (capacity, weekly_hours, archived_at, version) on labs.spaces to platlab_api;

grant select on labs.closures to platlab_api;
grant insert (workspace_id, area_id, starts_on, ends_on, reason, created_by_principal_id) on labs.closures to platlab_api;
-- Anular es lo único que se cambia de un cierre.
grant update (voided_at, voided_by_principal_id) on labs.closures to platlab_api;

-- Una versión publicada no se edita ni se borra.
grant select on labs.form_versions to platlab_api;
grant insert (workspace_id, version, title, document_code, subject_label, unit_label, fields, published_by_principal_id)
  on labs.form_versions to platlab_api;

-- ---------------------------------------------------------------------------
-- Permisos del manifiesto (02 §4); catalog.int.test.ts verifica que coincidan
-- ---------------------------------------------------------------------------

insert into core.permissions (code, module_code) values
  ('labs.space.read', 'labs'),
  ('labs.space.manage', 'labs'),
  ('labs.form.manage', 'labs');

-- ADR 0023: el Administrador habilita espacios, cierres, anticipación y el Formato; el Operador y el
-- Docente consultan (el Docente llenará el Formato en L-01b). El Propietario hereda por
-- core.effective_role_assignments.
insert into core.role_permissions (role_code, permission_code) values
  ('admin', 'labs.space.read'),
  ('admin', 'labs.space.manage'),
  ('admin', 'labs.form.manage'),
  ('operator', 'labs.space.read'),
  ('teacher', 'labs.space.read');
