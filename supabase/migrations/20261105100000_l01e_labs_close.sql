-- L-01e (ADR 0023, «Cierre de Laboratorios»): cada bloque pasa programada → lista → en curso → cerrada. El
-- responsable prepara con la lista de chequeo (los recursos del bloque), marca «Lista», la inicia el día de la práctica
-- y la cierra con lo utilizado de cada reactivo: eso sale del inventario como salida y lo demás, lo devuelto, vuelve a
-- estar disponible. Una práctica que empezó no se mueve ni se libera, y una cerrada no cambia. Con todos sus bloques
-- cerrados, la solicitud queda «finalizada». Un incidente de un equipo apartado nace en Equipos con el vínculo a la
-- práctica, que guarda Laboratorios. Nada se borra.

-- ---------------------------------------------------------------------------
-- Etapas del bloque
-- ---------------------------------------------------------------------------

alter table labs.activities
  add column stage text not null default 'scheduled' check (stage in ('scheduled', 'ready', 'running', 'closed')),
  -- Las líneas de la solicitud ya preparadas: la lista de chequeo. No bloquea «Lista».
  add column prepared_lines smallint[] not null default '{}'
    check (array_position(prepared_lines, null) is null and 1 <= all (prepared_lines) and 90 >= all (prepared_lines)),
  add column ready_at timestamptz,
  add column ready_by_principal_id uuid,
  add column started_at timestamptz,
  add column started_by_principal_id uuid,
  add column closed_at timestamptz,
  add column closed_by_principal_id uuid,
  add column closing_notes text check (length(btrim(closing_notes)) between 1 and 1000),
  add constraint activities_ready_by_fk foreign key (workspace_id, ready_by_principal_id) references core.principals (workspace_id, id),
  add constraint activities_started_by_fk foreign key (workspace_id, started_by_principal_id) references core.principals (workspace_id, id),
  add constraint activities_closed_by_fk foreign key (workspace_id, closed_by_principal_id) references core.principals (workspace_id, id),
  -- Cada etapa lleva quién y cuándo de las anteriores.
  add constraint activities_stage_marks check (
    (stage = 'scheduled' and ready_at is null and started_at is null and closed_at is null)
    or (stage = 'ready' and ready_at is not null and ready_by_principal_id is not null and started_at is null and closed_at is null)
    or (stage = 'running' and ready_at is not null and started_at is not null and started_by_principal_id is not null and closed_at is null)
    or (stage = 'closed' and ready_at is not null and started_at is not null and closed_at is not null and closed_by_principal_id is not null)
  ),
  -- Una práctica que empezó no se libera: se cierra.
  add constraint activities_started_kept check (cancelled_at is null or started_at is null);

-- Programada → lista → en curso → cerrada, sin saltos ni retrocesos. En curso no cambia de área, día ni hora; cerrada,
-- nada. Lo de antes (liberado no cambia; solo se programa una fecha de una solicitud enviada) sigue igual.
create or replace function labs.protect_activity() returns trigger
  language plpgsql set search_path = ''
  as $$
declare
  request_status text;
  request_dates date[];
  steps constant text[] := array['scheduled', 'ready', 'running', 'closed'];
begin
  if tg_op = 'UPDATE' then
    if old.cancelled_at is not null then
      raise exception 'Un bloque liberado no se modifica' using errcode = 'check_violation';
    end if;
    if old.stage = 'closed' then
      raise exception 'Una práctica cerrada no se modifica' using errcode = 'check_violation';
    end if;
    if new.stage <> old.stage and array_position(steps, new.stage) <> array_position(steps, old.stage) + 1 then
      raise exception 'La práctica avanza de a un paso: programada, lista, en curso, cerrada' using errcode = 'check_violation';
    end if;
    if old.stage = 'running' and (new.area_id, new.on_date, new.starts_at, new.ends_at) is distinct from (old.area_id, old.on_date, old.starts_at, old.ends_at) then
      raise exception 'Una práctica en curso no se mueve' using errcode = 'check_violation';
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

grant update (stage, prepared_lines, ready_at, ready_by_principal_id, started_at, started_by_principal_id, closed_at,
  closed_by_principal_id, closing_notes) on labs.activities to platlab_api;

-- La bandeja del responsable: lo que falta cerrar de los días que ya pasaron.
create index activities_open on labs.activities (workspace_id, on_date) where cancelled_at is null and stage <> 'closed';

-- ---------------------------------------------------------------------------
-- La solicitud se finaliza con todos sus bloques cerrados
-- ---------------------------------------------------------------------------

alter table labs.requests drop constraint requests_status_check;
alter table labs.requests add constraint requests_status_check
  check (status in ('draft', 'submitted', 'changes_requested', 'scheduled', 'completed', 'rejected', 'cancelled'));

alter table labs.request_events drop constraint request_events_action_check;
alter table labs.request_events add constraint request_events_action_check
  check (action in ('submitted', 'changes_requested', 'resubmitted', 'scheduled', 'completed', 'rejected', 'cancelled'));

-- Finalizada, tampoco cambia; solo se llega a ella desde programada.
create or replace function labs.protect_request() returns trigger
  language plpgsql set search_path = ''
  as $$
begin
  if old.status in ('rejected', 'cancelled', 'completed') then
    raise exception 'Una solicitud rechazada, cancelada o finalizada no se modifica' using errcode = 'check_violation';
  end if;
  if new.status = 'draft' and old.status <> 'draft' then
    raise exception 'Una solicitud enviada no vuelve a borrador' using errcode = 'check_violation';
  end if;
  if new.status = 'completed' and old.status <> 'scheduled' then
    raise exception 'Solo se finaliza una solicitud programada' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Lo utilizado al cerrar, por línea de reactivo
-- ---------------------------------------------------------------------------

-- Lo apartado al cerrar, lo utilizado (sale del inventario) y lo devuelto (vuelve a estar disponible). Solo se agrega.
create table labs.activity_usage (
  workspace_id uuid not null,
  activity_id uuid not null,
  line smallint not null check (line between 1 and 90),
  held numeric(24, 9) not null check (held >= 0),
  used numeric(24, 9) not null check (used >= 0),
  returned numeric(24, 9) generated always as (held - used) stored,
  created_at timestamptz not null default now(),
  primary key (activity_id, line),
  foreign key (workspace_id, activity_id) references labs.activities (workspace_id, id),
  constraint activity_usage_within check (used <= held)
);

-- ---------------------------------------------------------------------------
-- Incidentes de equipos con el contexto de la práctica
-- ---------------------------------------------------------------------------

-- El incidente es de Equipos (la capacidad incidencias); Laboratorios guarda en qué práctica ocurrió.
create table labs.activity_incidents (
  workspace_id uuid not null,
  activity_id uuid not null,
  case_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (case_id),
  foreign key (workspace_id, activity_id) references labs.activities (workspace_id, id),
  foreign key (workspace_id, case_id) references incidents.cases (workspace_id, id)
);

create index activity_incidents_activity on labs.activity_incidents (activity_id);

-- ---------------------------------------------------------------------------
-- RLS y grants
-- ---------------------------------------------------------------------------

alter table labs.activity_usage enable row level security;
alter table labs.activity_incidents enable row level security;

create policy activity_usage_select on labs.activity_usage for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy activity_usage_insert on labs.activity_usage for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()));

create policy activity_incidents_select on labs.activity_incidents for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy activity_incidents_insert on labs.activity_incidents for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()));

grant select on labs.activity_usage to platlab_api;
grant insert (workspace_id, activity_id, line, held, used) on labs.activity_usage to platlab_api;

grant select on labs.activity_incidents to platlab_api;
grant insert (workspace_id, activity_id, case_id) on labs.activity_incidents to platlab_api;
