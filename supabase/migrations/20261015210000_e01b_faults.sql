-- E-01b (ADR 0019): Reportes de fallas. La capacidad incidencias es dueña de su esquema y guarda la
-- falla de un recurso con FK tipada al módulo dueño (hoy, el activo de Equipos), que autoriza con sus
-- permisos (02 §4). Una falla pasa por abierta → en atención → resuelta → cerrada; cada paso guarda
-- quién y cuándo. Nada se borra: una falla se cierra.

create schema incidents;
revoke all on schema incidents from public;
grant usage on schema incidents to platlab_api;

create table incidents.cases (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  -- Módulo dueño del recurso: sus permisos autorizan cada paso (02 §4).
  module_code text not null check (module_code in ('equipment')),
  asset_id uuid,
  fault_type text not null check (fault_type in ('electrical', 'mechanical', 'spare_part', 'other')),
  description text not null check (length(btrim(description)) between 1 and 2000),
  -- Quien reporta dice si el equipo se puede seguir usando; si no, pasa a fuera de servicio.
  usable boolean not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  reported_by_principal_id uuid not null,
  reported_at timestamptz not null default now(),
  attended_by_principal_id uuid,
  attended_at timestamptz,
  resolution text check (length(btrim(resolution)) between 1 and 2000),
  resolved_by_principal_id uuid,
  resolved_at timestamptz,
  closed_by_principal_id uuid,
  closed_at timestamptz,
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, asset_id) references equipment.assets (workspace_id, id),
  foreign key (workspace_id, reported_by_principal_id) references core.principals (workspace_id, id),
  foreign key (workspace_id, attended_by_principal_id) references core.principals (workspace_id, id),
  foreign key (workspace_id, resolved_by_principal_id) references core.principals (workspace_id, id),
  foreign key (workspace_id, closed_by_principal_id) references core.principals (workspace_id, id),
  -- FK tipada según el módulo dueño (03 §1): nunca un par genérico tipo/id.
  constraint cases_resource check (module_code <> 'equipment' or asset_id is not null),
  -- Cada estado lleva lo suyo: en atención en adelante, quién la atendió; resuelta, el resultado.
  constraint cases_attended check ((status = 'open') = (attended_at is null and attended_by_principal_id is null)),
  constraint cases_resolved check (
    (status in ('resolved', 'closed')) = (resolved_at is not null and resolved_by_principal_id is not null and resolution is not null)
  ),
  constraint cases_closed check ((status = 'closed') = (closed_at is not null and closed_by_principal_id is not null))
);

-- Reportes: lo abierto primero, por fecha; y las fallas de un equipo, en su ficha.
create index cases_status on incidents.cases (workspace_id, status, reported_at desc);
create index cases_asset on incidents.cases (workspace_id, asset_id, reported_at desc);
create index cases_reporter on incidents.cases (workspace_id, reported_by_principal_id, reported_at desc);

create trigger cases_touch before update on incidents.cases
  for each row execute function core.touch_updated_at();

-- Una falla cerrada es definitiva; el estado solo avanza, nunca retrocede.
create function incidents.protect_case() returns trigger
  language plpgsql set search_path = ''
  as $$
begin
  if old.status = 'closed' then
    raise exception 'Una falla cerrada no se modifica' using errcode = 'check_violation';
  end if;
  if array_position(array['open', 'in_progress', 'resolved', 'closed'], new.status)
     < array_position(array['open', 'in_progress', 'resolved', 'closed'], old.status) then
    raise exception 'Una falla no vuelve a un estado anterior' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

revoke execute on function incidents.protect_case() from public;

create trigger cases_protect before update on incidents.cases
  for each row execute function incidents.protect_case();

alter table incidents.cases enable row level security;

create policy cases_select on incidents.cases for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
-- La autoría del reporte es del principal del contexto y una falla nace abierta.
create policy cases_insert on incidents.cases for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and reported_by_principal_id = (select core.current_principal_id())
    and status = 'open'
  );
create policy cases_update on incidents.cases for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

grant select on incidents.cases to platlab_api;
grant insert (workspace_id, module_code, asset_id, fault_type, description, usable, reported_by_principal_id)
  on incidents.cases to platlab_api;
-- Solo avanzan el estado y sus datos; lo reportado no se edita.
grant update (
  status, attended_by_principal_id, attended_at, resolution, resolved_by_principal_id, resolved_at,
  closed_by_principal_id, closed_at, version
) on incidents.cases to platlab_api;

-- El historial de condición recuerda la falla que la cambió (03 §5).
alter table equipment.condition_changes
  add column case_id uuid,
  add constraint condition_changes_case_fk
    foreign key (workspace_id, case_id) references incidents.cases (workspace_id, id);


-- ---------------------------------------------------------------------------
-- Permisos del manifiesto (02 §4); catalog.int.test.ts verifica que coincidan
-- ---------------------------------------------------------------------------

insert into core.permissions (code, module_code) values
  ('equipment.fault.report', 'equipment'),
  ('equipment.fault.manage', 'equipment');

-- Matriz de 01 §5: todos reportan; atender, resolver y cerrar es del Operador y el Administrador.
insert into core.role_permissions (role_code, permission_code) values
  ('admin', 'equipment.fault.report'),
  ('admin', 'equipment.fault.manage'),
  ('operator', 'equipment.fault.report'),
  ('operator', 'equipment.fault.manage'),
  ('teacher', 'equipment.fault.report'),
  ('student', 'equipment.fault.report');
