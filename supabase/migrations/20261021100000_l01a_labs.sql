-- L-01a (ADR 0023): módulo Laboratorios. Espacios: áreas del Núcleo habilitadas para agendar, con aforo,
-- horario semanal y cierres; feriados comunes; la anticipación del espacio de trabajo; y los Formatos de
-- solicitud, cuyas revisiones son inmutables. No escribe en Core: que la ubicación sea un área activa lo
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
-- Formatos de solicitud: varios por espacio de trabajo, cada uno con sus revisiones inmutables
-- ---------------------------------------------------------------------------

-- Un texto JSON de 1 a `max` caracteres sin contar los espacios de los extremos.
create function labs.json_text_valid(value jsonb, max integer) returns boolean
  language sql immutable parallel safe set search_path = ''
  as $$
    select coalesce(jsonb_typeof(value) = 'string' and length(btrim(value #>> '{}')) between 1 and max, false)
  $$;

-- La hoja del formato (ADR 0023, «Diseño por filas y varios formatos»), un objeto con:
--   rows: de 1 a 60 títulos de sección {kind: 'section', title} y filas {kind: 'row', fields: [1..3]};
--     un dato del sistema es {key, label} con una clave reservada: docente, titulo, fecha, horario y
--     participantes son esenciales y van una vez; asignatura, carrera, tipo y grupos, a lo sumo una;
--     un dato libre es {key, label, type, required[, options]} con otra clave, hasta 30, y solo la lista
--     lleva de 1 a 30 opciones únicas; ninguna clave se repite;
--   resources: de 1 a 3 columnas {kind: reagents | equipment | materials, label} sin repetir el tipo;
--   equipmentCode: si la columna de equipos lleva «Código»; notes: si lleva Observaciones;
--   signatures: de 1 a 3 firmas {label, requester}, a lo sumo una del solicitante.
-- Las validaciones van en orden: una forma inesperada devuelve falso antes de que otra lectura falle.
create function labs.form_layout_valid(layout jsonb) returns boolean
  language plpgsql immutable parallel safe set search_path = ''
  as $$
declare
  essential constant text[] := array['docente', 'titulo', 'fecha', 'horario', 'participantes'];
  reserved constant text[] := essential || array['asignatura', 'carrera', 'tipo', 'grupos'];
  item jsonb;
  field jsonb;
  keys text[] := '{}';
  free_fields integer := 0;
  kinds text[] := '{}';
  requesters integer := 0;
begin
  if jsonb_typeof(layout) is distinct from 'object' then
    return false;
  end if;
  if layout - 'rows' - 'resources' - 'equipmentCode' - 'notes' - 'signatures' <> '{}'::jsonb
     or jsonb_typeof(layout -> 'equipmentCode') is distinct from 'boolean'
     or jsonb_typeof(layout -> 'notes') is distinct from 'boolean'
     or jsonb_typeof(layout -> 'rows') is distinct from 'array'
     or jsonb_typeof(layout -> 'resources') is distinct from 'array'
     or jsonb_typeof(layout -> 'signatures') is distinct from 'array' then
    return false;
  end if;

  if jsonb_array_length(layout -> 'rows') not between 1 and 60 then
    return false;
  end if;
  for item in select value from jsonb_array_elements(layout -> 'rows') loop
    if jsonb_typeof(item) is distinct from 'object' then
      return false;
    elsif item ->> 'kind' = 'section' then
      if item - 'kind' - 'title' <> '{}'::jsonb or not labs.json_text_valid(item -> 'title', 80) then
        return false;
      end if;
    elsif item ->> 'kind' = 'row' then
      if item - 'kind' - 'fields' <> '{}'::jsonb or jsonb_typeof(item -> 'fields') is distinct from 'array' then
        return false;
      end if;
      if jsonb_array_length(item -> 'fields') not between 1 and 3 then
        return false;
      end if;
      for field in select value from jsonb_array_elements(item -> 'fields') loop
        if jsonb_typeof(field) is distinct from 'object'
           or jsonb_typeof(field -> 'key') is distinct from 'string'
           or not labs.json_text_valid(field -> 'label', 80) then
          return false;
        end if;
        if not field ? 'type' then
          -- Dato del sistema: solo se renombra.
          if field - 'key' - 'label' <> '{}'::jsonb or not field ->> 'key' = any (reserved) then
            return false;
          end if;
        else
          if field - 'key' - 'label' - 'type' - 'required' - 'options' <> '{}'::jsonb
             or field ->> 'key' !~ '^[a-z][a-z0-9_]{0,39}$'
             or field ->> 'key' = any (reserved)
             or jsonb_typeof(field -> 'type') is distinct from 'string'
             or not field ->> 'type' = any (array['text', 'number', 'date', 'list', 'boolean'])
             or jsonb_typeof(field -> 'required') is distinct from 'boolean' then
            return false;
          end if;
          if field ->> 'type' <> 'list' then
            if field ? 'options' then
              return false;
            end if;
          elsif jsonb_typeof(field -> 'options') is distinct from 'array' then
            return false;
          elsif jsonb_array_length(field -> 'options') not between 1 and 30
             or exists (select 1 from jsonb_array_elements(field -> 'options') as o (option) where not labs.json_text_valid(option, 80))
             or (select count(distinct option) <> count(*) from jsonb_array_elements(field -> 'options') as o (option)) then
            return false;
          end if;
          free_fields := free_fields + 1;
        end if;
        keys := keys || (field ->> 'key');
      end loop;
    else
      return false;
    end if;
  end loop;
  if free_fields > 30
     or not keys @> essential
     or (select count(distinct k) <> count(*) from unnest(keys) as u (k)) then
    return false;
  end if;

  if jsonb_array_length(layout -> 'resources') not between 1 and 3 then
    return false;
  end if;
  for item in select value from jsonb_array_elements(layout -> 'resources') loop
    if jsonb_typeof(item) is distinct from 'object'
       or item - 'kind' - 'label' <> '{}'::jsonb
       or jsonb_typeof(item -> 'kind') is distinct from 'string'
       or not item ->> 'kind' = any (array['reagents', 'equipment', 'materials'])
       or not labs.json_text_valid(item -> 'label', 40) then
      return false;
    end if;
    kinds := kinds || (item ->> 'kind');
  end loop;
  if (select count(distinct k) <> count(*) from unnest(kinds) as u (k)) then
    return false;
  end if;

  if jsonb_array_length(layout -> 'signatures') not between 1 and 3 then
    return false;
  end if;
  for item in select value from jsonb_array_elements(layout -> 'signatures') loop
    if jsonb_typeof(item) is distinct from 'object'
       or item - 'label' - 'requester' <> '{}'::jsonb
       or not labs.json_text_valid(item -> 'label', 60)
       or jsonb_typeof(item -> 'requester') is distinct from 'boolean' then
      return false;
    end if;
    if (item -> 'requester')::boolean then
      requesters := requesters + 1;
    end if;
  end loop;
  return requesters <= 1;
end
$$;

-- Un formato se renombra y se archiva (la `version` es la de esas ediciones); no se borra. Su contenido
-- está en las revisiones.
create table labs.forms (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  name text not null check (length(btrim(name)) between 1 and 80),
  version integer not null default 1 check (version > 0),
  archived_at timestamptz,
  created_by_principal_id uuid not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, created_by_principal_id) references core.principals (workspace_id, id)
);

-- Dos formatos activos no se llaman igual; uno archivado libera su nombre.
create unique index forms_active_name on labs.forms (workspace_id, core.fold_text(name)) where archived_at is null;

-- Cada guardado publica la revisión siguiente, inmutable: el membrete (título y código; la revisión es el
-- número) y la hoja. Las solicitudes (L-01b) guardan el formato y la revisión con que se llenaron.
create table labs.form_revisions (
  workspace_id uuid not null,
  form_id uuid not null,
  revision integer not null check (revision >= 1),
  title text not null check (length(btrim(title)) between 1 and 120),
  document_code text check (length(btrim(document_code)) between 1 and 40),
  layout jsonb not null check (labs.form_layout_valid(layout)),
  published_by_principal_id uuid not null,
  published_at timestamptz not null default now(),
  primary key (form_id, revision),
  -- Destino de la FK compuesta de las solicitudes (L-01b).
  unique (workspace_id, form_id, revision),
  foreign key (workspace_id, form_id) references labs.forms (workspace_id, id),
  foreign key (workspace_id, published_by_principal_id) references core.principals (workspace_id, id)
);

-- ---------------------------------------------------------------------------
-- RLS y grants: el runtime lee y escribe solo en el espacio de su contexto, y la autoría es suya
-- ---------------------------------------------------------------------------

alter table labs.settings enable row level security;
alter table labs.spaces enable row level security;
alter table labs.closures enable row level security;
alter table labs.forms enable row level security;
alter table labs.form_revisions enable row level security;

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

create policy forms_select on labs.forms for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy forms_insert on labs.forms for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and created_by_principal_id = (select core.current_principal_id())
    and archived_at is null
  );
create policy forms_update on labs.forms for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

create policy form_revisions_select on labs.form_revisions for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy form_revisions_insert on labs.form_revisions for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and published_by_principal_id = (select core.current_principal_id())
  );

-- Las CHECK del horario y de la hoja llaman a estas funciones con los privilegios de quien escribe.
revoke execute on function labs.weekly_hours_valid(jsonb), labs.json_text_valid(jsonb, integer), labs.form_layout_valid(jsonb)
  from public;
grant execute on function labs.weekly_hours_valid(jsonb), labs.json_text_valid(jsonb, integer), labs.form_layout_valid(jsonb)
  to platlab_api;

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

grant select on labs.forms to platlab_api;
grant insert (workspace_id, name, created_by_principal_id) on labs.forms to platlab_api;
grant update (name, archived_at, version) on labs.forms to platlab_api;

-- Una revisión publicada no se edita ni se borra.
grant select on labs.form_revisions to platlab_api;
grant insert (workspace_id, form_id, revision, title, document_code, layout, published_by_principal_id)
  on labs.form_revisions to platlab_api;

-- ---------------------------------------------------------------------------
-- Permisos del manifiesto (02 §4); catalog.int.test.ts verifica que coincidan
-- ---------------------------------------------------------------------------

insert into core.permissions (code, module_code) values
  ('labs.read', 'labs'),
  ('labs.space.manage', 'labs'),
  ('labs.form.manage', 'labs');

-- ADR 0023: el Administrador habilita espacios, cierres, anticipación y los Formatos; el Operador y el
-- Docente consultan (el Docente llenará los formatos activos en L-01b). El Propietario hereda por
-- core.effective_role_assignments.
insert into core.role_permissions (role_code, permission_code) values
  ('admin', 'labs.read'),
  ('admin', 'labs.space.manage'),
  ('admin', 'labs.form.manage'),
  ('operator', 'labs.read'),
  ('teacher', 'labs.read');
