-- L-01c (ADR 0023, «Reglas y diseño de L-01c, Cronograma»): cada fecha de una solicitud enviada se programa como
-- un bloque en un área, a una hora y con un responsable. Programar es aprobar esa fecha; con todas programadas, la
-- solicitud queda «programada». El código P1-S12-ANT03 se fija al programar y su historial no se pierde. Horario,
-- cierres, período y aforo los valida el comando con las reglas del contrato; el choque en un área lo impide aquí la
-- exclusión GiST.

-- ---------------------------------------------------------------------------
-- La solicitud gana el estado «programada» y su historial, el evento
-- ---------------------------------------------------------------------------

alter table labs.requests drop constraint requests_status_check;
alter table labs.requests add constraint requests_status_check
  check (status in ('draft', 'submitted', 'changes_requested', 'scheduled', 'rejected', 'cancelled'));

alter table labs.request_events drop constraint request_events_action_check;
alter table labs.request_events add constraint request_events_action_check
  check (action in ('submitted', 'changes_requested', 'resubmitted', 'scheduled', 'rejected', 'cancelled'));

-- ---------------------------------------------------------------------------
-- Número siguiente de un área en una semana de un período (el «03» de ANT03): sin reutilizarse
-- ---------------------------------------------------------------------------

create table labs.activity_sequences (
  workspace_id uuid not null,
  period_id uuid not null,
  week integer not null check (week between 1 and 53),
  area_id uuid not null,
  last_number integer not null check (last_number >= 1),
  primary key (workspace_id, period_id, week, area_id),
  foreign key (workspace_id, period_id) references labs.periods (workspace_id, id),
  foreign key (workspace_id, area_id) references labs.spaces (workspace_id, area_id)
);

-- ---------------------------------------------------------------------------
-- Bloques del Cronograma: uno por fecha de la solicitud
-- ---------------------------------------------------------------------------

create table labs.activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  request_id uuid not null,
  on_date date not null,
  area_id uuid not null,
  starts_at time not null,
  ends_at time not null,
  responsible_principal_id uuid not null,
  -- El código vigente y sus partes, para filtrar; el texto queda fijo aunque cambie la sigla del área.
  period_id uuid not null,
  week integer not null check (week between 1 and 53),
  sequence integer not null check (sequence between 1 and 99),
  code text not null check (code ~ '^[A-Z0-9][A-Z0-9-]{0,9}-S[0-9]{1,2}-[A-Z][A-Z0-9]{1,4}[0-9]{2}$'),
  version integer not null default 1 check (version > 0),
  -- Se libera al cancelar o al resolver la solicitud de otro modo; no se borra.
  cancelled_at timestamptz,
  created_by_principal_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  constraint activities_hours check (starts_at < ends_at),
  foreign key (workspace_id, request_id) references labs.requests (workspace_id, id),
  foreign key (workspace_id, area_id) references labs.spaces (workspace_id, area_id),
  foreign key (workspace_id, responsible_principal_id) references core.principals (workspace_id, id),
  foreign key (workspace_id, period_id) references labs.periods (workspace_id, id),
  foreign key (workspace_id, created_by_principal_id) references core.principals (workspace_id, id),
  -- Dos bloques activos no se cruzan en la misma área: [inicio, fin), así que uno puede empezar cuando otro termina.
  constraint activities_no_overlap exclude using gist (
    workspace_id with =, area_id with =, tsrange(on_date + starts_at, on_date + ends_at) with &&
  ) where (cancelled_at is null)
);

-- Cada fecha de una solicitud tiene a lo sumo un bloque activo.
create unique index activities_request_date on labs.activities (request_id, on_date) where cancelled_at is null;
create index activities_day on labs.activities (workspace_id, on_date) where cancelled_at is null;

create trigger activities_touch before update on labs.activities
  for each row execute function core.touch_updated_at();

-- Un bloque nace de una fecha de una solicitud enviada; cancelado, no cambia.
create function labs.protect_activity() returns trigger
  language plpgsql set search_path = ''
  as $$
declare
  request_status text;
  request_dates date[];
begin
  if tg_op = 'UPDATE' then
    if old.cancelled_at is not null then
      raise exception 'Un bloque liberado no se modifica' using errcode = 'check_violation';
    end if;
    return new;
  end if;
  select status, dates into request_status, request_dates from labs.requests where id = new.request_id;
  if request_status is distinct from 'submitted' or not new.on_date = any (request_dates) then
    raise exception 'Solo se programa una fecha de una solicitud enviada' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger activities_protect before insert or update on labs.activities
  for each row execute function labs.protect_activity();

-- Los códigos que tuvo cada bloque: el vigente y los anteriores, al cambiar de área o de semana.
create table labs.activity_codes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  activity_id uuid not null,
  code text not null,
  principal_id uuid not null,
  created_at timestamptz not null default clock_timestamp(),
  foreign key (workspace_id, activity_id) references labs.activities (workspace_id, id),
  foreign key (workspace_id, principal_id) references core.principals (workspace_id, id)
);

create index activity_codes_activity on labs.activity_codes (activity_id, created_at);

-- ---------------------------------------------------------------------------
-- RLS y grants
-- ---------------------------------------------------------------------------

alter table labs.activity_sequences enable row level security;
alter table labs.activities enable row level security;
alter table labs.activity_codes enable row level security;

create policy activity_sequences_select on labs.activity_sequences for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy activity_sequences_insert on labs.activity_sequences for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()));
create policy activity_sequences_update on labs.activity_sequences for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

create policy activities_select on labs.activities for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy activities_insert on labs.activities for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and created_by_principal_id = (select core.current_principal_id())
  );
create policy activities_update on labs.activities for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

create policy activity_codes_select on labs.activity_codes for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy activity_codes_insert on labs.activity_codes for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and principal_id = (select core.current_principal_id())
  );

grant select on labs.activity_sequences to platlab_api;
grant insert (workspace_id, period_id, week, area_id, last_number) on labs.activity_sequences to platlab_api;
grant update (last_number) on labs.activity_sequences to platlab_api;

grant select on labs.activities to platlab_api;
grant insert (workspace_id, request_id, on_date, area_id, starts_at, ends_at, responsible_principal_id, period_id, week,
  sequence, code, created_by_principal_id) on labs.activities to platlab_api;
-- La fecha y la solicitud no cambian: cambiar el día es pedir cambios al docente.
grant update (area_id, starts_at, ends_at, responsible_principal_id, period_id, week, sequence, code, cancelled_at, version)
  on labs.activities to platlab_api;

-- El historial de códigos solo crece.
grant select on labs.activity_codes to platlab_api;
grant insert (workspace_id, activity_id, code, principal_id) on labs.activity_codes to platlab_api;

-- ---------------------------------------------------------------------------
-- Permisos del manifiesto (02 §4); catalog.int.test.ts verifica que coincidan
-- ---------------------------------------------------------------------------

insert into core.permissions (code, module_code) values
  ('labs.schedule.manage', 'labs'),
  ('labs.schedule.lead', 'labs');

-- Programa el Administrador (y el Propietario, que hereda); un bloque lo lleva un Operador o el Administrador.
insert into core.role_permissions (role_code, permission_code) values
  ('admin', 'labs.schedule.manage'),
  ('admin', 'labs.schedule.lead'),
  ('operator', 'labs.schedule.lead');
