-- L-01b (ADR 0023, «Diseño de L-01b»): las Solicitudes de Laboratorios. El Docente o el tesista llena un formato
-- activo y lo envía; el Administrador pide cambios o lo rechaza con motivo, y programarlo llega con el Cronograma
-- (L-01c). Los datos del sistema van en columnas para las métricas y los libres en `answers`, que el servidor valida
-- contra la revisión del formato. Validar los recursos no reserva nada: se calcula al leer.

-- ---------------------------------------------------------------------------
-- Listas de asignaturas y carreras: crecen al usarlas, nunca texto libre en la solicitud
-- ---------------------------------------------------------------------------

create table labs.list_values (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  kind text not null check (kind in ('subject', 'career')),
  name text not null check (length(btrim(name)) between 1 and 120),
  created_by_principal_id uuid not null,
  created_at timestamptz not null default now(),
  -- Destino de las FK de la solicitud: fija la lista (una asignatura no es una carrera).
  unique (workspace_id, id, kind),
  foreign key (workspace_id, created_by_principal_id) references core.principals (workspace_id, id)
);

-- «Química General» y «quimica general» son el mismo valor.
create unique index list_values_name on labs.list_values (workspace_id, kind, core.fold_text(name));

-- ---------------------------------------------------------------------------
-- Número fijo de la solicitud (SOL-0042): correlativo por espacio de trabajo y sin reutilizarse
-- ---------------------------------------------------------------------------

create table labs.request_counters (
  workspace_id uuid primary key references core.workspaces (id),
  last_number integer not null check (last_number >= 1)
);

-- ---------------------------------------------------------------------------
-- Solicitudes
-- ---------------------------------------------------------------------------

-- Fechas sueltas (nunca un rango), de 1 a 20, en orden y sin repetirse; un borrador puede no tener ninguna.
create function labs.request_dates_valid(dates date[]) returns boolean
  language sql immutable set search_path = ''
  as $$
    select coalesce(array_ndims(dates), 1) = 1
      and coalesce(cardinality(dates), 0) <= 20
      and not exists (
        select 1 from unnest(dates) with ordinality as d (value, n)
        where d.value is null or (d.n > 1 and d.value <= dates[d.n - 1])
      )
  $$;

create table labs.requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  number integer not null check (number >= 1),
  form_id uuid not null,
  form_revision integer not null,
  requester_principal_id uuid not null,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'changes_requested', 'rejected', 'cancelled')),
  -- Datos del sistema (claves de la hoja: titulo, docente, tipo, asignatura, carrera, fecha, horario,
  -- participantes, grupos). Un borrador los puede tener a medias; enviado, los esenciales están.
  title text check (length(btrim(title)) between 1 and 200),
  teacher_name text check (length(btrim(teacher_name)) between 1 and 120),
  activity_type text check (activity_type in ('practice', 'research', 'service', 'training')),
  subject_id uuid,
  subject_kind text not null default 'subject' check (subject_kind = 'subject'),
  career_id uuid,
  career_kind text not null default 'career' check (career_kind = 'career'),
  dates date[] not null default '{}' check (labs.request_dates_valid(dates)),
  starts_at time,
  ends_at time,
  participants integer check (participants between 1 and 1000),
  groups integer not null default 1 check (groups between 1 and 100),
  -- Área pedida, opcional: la definitiva la elige el Administrador al programar.
  area_id uuid,
  -- Datos libres por su clave; los valida el servidor contra la revisión del formato.
  answers jsonb not null default '{}' check (jsonb_typeof(answers) = 'object'),
  notes text check (length(btrim(notes)) between 1 and 2000),
  -- La primera fecha cae antes de la anticipación: entra igual y el Administrador decide.
  late boolean not null default false,
  submitted_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  constraint requests_number unique (workspace_id, number),
  constraint requests_hours check (starts_at < ends_at),
  constraint requests_complete check (
    status = 'draft'
    or (title is not null and teacher_name is not null and cardinality(dates) >= 1 and starts_at is not null
        and ends_at is not null and participants is not null and submitted_at is not null)
  ),
  foreign key (workspace_id, form_id, form_revision) references labs.form_revisions (workspace_id, form_id, revision),
  foreign key (workspace_id, requester_principal_id) references core.principals (workspace_id, id),
  foreign key (workspace_id, subject_id, subject_kind) references labs.list_values (workspace_id, id, kind),
  foreign key (workspace_id, career_id, career_kind) references labs.list_values (workspace_id, id, kind),
  foreign key (workspace_id, area_id) references labs.spaces (workspace_id, area_id)
);

create index requests_requester on labs.requests (workspace_id, requester_principal_id, created_at desc);
create index requests_status on labs.requests (workspace_id, status);

create trigger requests_touch before update on labs.requests
  for each row execute function core.touch_updated_at();

-- Rechazada y cancelada son finales; enviada ya no vuelve a borrador.
create function labs.protect_request() returns trigger
  language plpgsql set search_path = ''
  as $$
begin
  if old.status in ('rejected', 'cancelled') then
    raise exception 'Una solicitud rechazada o cancelada no se modifica' using errcode = 'check_violation';
  end if;
  if new.status = 'draft' and old.status <> 'draft' then
    raise exception 'Una solicitud enviada no vuelve a borrador' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger requests_protect before update on labs.requests
  for each row execute function labs.protect_request();

-- ---------------------------------------------------------------------------
-- Recursos pedidos: reactivos, equipos por tipo y materiales en texto
-- ---------------------------------------------------------------------------

-- Una línea es del catálogo (reactivo o tipo de equipo) o «no catalogada» con su descripción. Los reactivos
-- van en total con su unidad; equipos y materiales, en total y, si se pidió así, por grupo.
create table labs.request_lines (
  workspace_id uuid not null,
  request_id uuid not null,
  line smallint not null check (line between 1 and 90),
  kind text not null check (kind in ('reagent', 'equipment', 'material')),
  item_id uuid,
  asset_type_id uuid,
  description text check (length(btrim(description)) between 1 and 200),
  quantity numeric(24, 9) not null check (quantity > 0),
  per_group numeric(24, 9) check (per_group > 0),
  unit text references inventory.units (code),
  primary key (request_id, line),
  foreign key (workspace_id, request_id) references labs.requests (workspace_id, id),
  foreign key (workspace_id, item_id) references reagents.products (workspace_id, item_id),
  foreign key (workspace_id, asset_type_id) references equipment.asset_types (workspace_id, id),
  constraint request_lines_shape check (
    case kind
      when 'reagent' then asset_type_id is null and per_group is null and unit is not null
        and (item_id is null) <> (description is null)
      when 'equipment' then item_id is null and unit is null and quantity = trunc(quantity)
        and (per_group is null or per_group = trunc(per_group))
        and (asset_type_id is null) <> (description is null)
      else item_id is null and asset_type_id is null and unit is null and description is not null
    end
  )
);

-- Las líneas se reemplazan solo mientras quien pide edita: en borrador o con cambios solicitados.
create function labs.protect_request_lines() returns trigger
  language plpgsql set search_path = ''
  as $$
declare
  current_status text;
begin
  select status into current_status from labs.requests
  where id = coalesce(new.request_id, old.request_id);
  if current_status not in ('draft', 'changes_requested') then
    raise exception 'Los recursos de una solicitud enviada no se modifican' using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger request_lines_protect before insert or delete on labs.request_lines
  for each row execute function labs.protect_request_lines();

-- ---------------------------------------------------------------------------
-- Historial de la solicitud, visible para quien pide (aparte de la auditoría)
-- ---------------------------------------------------------------------------

create table labs.request_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  request_id uuid not null,
  action text not null check (action in ('submitted', 'changes_requested', 'resubmitted', 'rejected', 'cancelled')),
  reason text check (length(btrim(reason)) between 1 and 500),
  principal_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  constraint request_events_reason check (action not in ('changes_requested', 'rejected') or reason is not null),
  foreign key (workspace_id, request_id) references labs.requests (workspace_id, id),
  foreign key (workspace_id, principal_id) references core.principals (workspace_id, id)
);

create index request_events_request on labs.request_events (request_id, created_at);

-- ---------------------------------------------------------------------------
-- RLS y grants
-- ---------------------------------------------------------------------------

alter table labs.list_values enable row level security;
alter table labs.request_counters enable row level security;
alter table labs.requests enable row level security;
alter table labs.request_lines enable row level security;
alter table labs.request_events enable row level security;

create policy list_values_select on labs.list_values for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy list_values_insert on labs.list_values for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and created_by_principal_id = (select core.current_principal_id())
  );

create policy request_counters_select on labs.request_counters for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy request_counters_insert on labs.request_counters for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()));
create policy request_counters_update on labs.request_counters for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

-- Quién ve qué solicitud del espacio (solo las suyas o todas) lo decide la API por permiso.
create policy requests_select on labs.requests for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy requests_insert on labs.requests for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and requester_principal_id = (select core.current_principal_id())
  );
create policy requests_update on labs.requests for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

create policy request_lines_select on labs.request_lines for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy request_lines_insert on labs.request_lines for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()));
create policy request_lines_delete on labs.request_lines for delete to platlab_api
  using (workspace_id = (select core.current_workspace_id()));

create policy request_events_select on labs.request_events for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy request_events_insert on labs.request_events for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and principal_id = (select core.current_principal_id())
  );

revoke execute on function labs.request_dates_valid(date[]) from public;
grant execute on function labs.request_dates_valid(date[]) to platlab_api;

grant select on labs.list_values to platlab_api;
grant insert (workspace_id, kind, name, created_by_principal_id) on labs.list_values to platlab_api;

grant select on labs.request_counters to platlab_api;
grant insert (workspace_id, last_number) on labs.request_counters to platlab_api;
grant update (last_number) on labs.request_counters to platlab_api;

grant select on labs.requests to platlab_api;
grant insert (workspace_id, number, form_id, form_revision, requester_principal_id, title, teacher_name, activity_type,
  subject_id, career_id, dates, starts_at, ends_at, participants, groups, area_id, answers, notes)
  on labs.requests to platlab_api;
-- El número, el formato y quien pide no cambian.
grant update (status, title, teacher_name, activity_type, subject_id, career_id, dates, starts_at, ends_at, participants,
  groups, area_id, answers, notes, late, submitted_at, version) on labs.requests to platlab_api;

-- Las líneas se reemplazan enteras (borrar e insertar) mientras se edita; no se actualizan.
grant select, delete on labs.request_lines to platlab_api;
grant insert (workspace_id, request_id, line, kind, item_id, asset_type_id, description, quantity, per_group, unit)
  on labs.request_lines to platlab_api;

-- El historial solo crece.
grant select on labs.request_events to platlab_api;
grant insert (workspace_id, request_id, action, reason, principal_id) on labs.request_events to platlab_api;

-- ---------------------------------------------------------------------------
-- Permisos del manifiesto (02 §4); catalog.int.test.ts verifica que coincidan
-- ---------------------------------------------------------------------------

insert into core.permissions (code, module_code) values
  ('labs.request.create', 'labs'),
  ('labs.request.view', 'labs'),
  ('labs.request.review', 'labs');

-- ADR 0023, «Reglas de L-01b»: piden el Docente, el tesista y quien administra; el Operador consulta las
-- recibidas y el Administrador pide cambios o rechaza. El tesista lee los formatos activos para llenarlos.
insert into core.role_permissions (role_code, permission_code) values
  ('admin', 'labs.request.create'),
  ('admin', 'labs.request.view'),
  ('admin', 'labs.request.review'),
  ('operator', 'labs.request.view'),
  ('teacher', 'labs.request.create'),
  ('student', 'labs.read'),
  ('student', 'labs.request.create');
