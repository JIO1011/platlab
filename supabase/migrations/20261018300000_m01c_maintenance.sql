-- M-01c (ADR 0020): Indicadores, «Requisito» del plan y «Evaluar reemplazo». Los indicadores se calculan
-- al consultar; el registro guarda la fecha que tocaba para medir el cumplimiento, y el descarte del aviso
-- de reemplazo se guarda y no se edita.

-- ---------------------------------------------------------------------------
-- Directorio de equipos: Equipos deja leer también los datos de compra que «Evaluar reemplazo» compara
-- (vida útil y valor de reposición). Las columnas nuevas van al final, como exige create or replace view.
-- ---------------------------------------------------------------------------

create or replace view equipment.asset_directory with (security_invoker = true) as
  select workspace_id, id, type_id, code, name, location_id, condition, conservation, created_at,
         acquired_on, useful_life_years, replacement_value
    from equipment.assets;

-- ---------------------------------------------------------------------------
-- Requisito del plan (p. ej. «ISO/IEC 17025 6.4.10»): opcional, para el cumplimiento por requisito
-- ---------------------------------------------------------------------------

alter table maintenance.plans
  add column requirement text check (length(btrim(requirement)) between 1 and 120);

grant insert (requirement), update (requirement) on maintenance.plans to platlab_api;

-- ---------------------------------------------------------------------------
-- La fecha que tocaba: la próxima del plan al registrar. La calcula la API; un registro sin plan, de historia
-- cargada o que repite un «No conforme» no la tiene y no cuenta para el cumplimiento.
-- ---------------------------------------------------------------------------

alter table maintenance.records
  add column due_on date,
  add constraint records_due check (due_on is null or plan_id is not null);

-- Programado frente a realizado y el cumplimiento leen por la fecha que tocaba, sin los anulados.
create index records_due on maintenance.records (workspace_id, due_on)
  where due_on is not null and voided_at is null;
-- Los costos del periodo y los registros por día del Inicio leen por la fecha del trabajo.
create index records_performed on maintenance.records (workspace_id, performed_on);

grant insert (due_on) on maintenance.records to platlab_api;

-- ---------------------------------------------------------------------------
-- Descartes de «Evaluar reemplazo»: ocultan el aviso del equipo hasta `dismissed_until`, con motivo
-- ---------------------------------------------------------------------------

create table maintenance.replacement_reviews (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  asset_id uuid not null,
  reason text not null check (length(btrim(reason)) between 1 and 500),
  dismissed_until date not null,
  created_by_principal_id uuid not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, asset_id) references equipment.assets (workspace_id, id),
  foreign key (workspace_id, created_by_principal_id) references core.principals (workspace_id, id),
  -- Descartar dos veces el mismo día no suma otro descarte; el índice responde también si hay uno vigente.
  unique (workspace_id, asset_id, dismissed_until)
);

alter table maintenance.replacement_reviews enable row level security;

create policy replacement_reviews_select on maintenance.replacement_reviews for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy replacement_reviews_insert on maintenance.replacement_reviews for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and created_by_principal_id = (select core.current_principal_id())
  );

-- El descarte no se edita ni se borra.
grant select on maintenance.replacement_reviews to platlab_api;
grant insert (workspace_id, asset_id, reason, dismissed_until, created_by_principal_id)
  on maintenance.replacement_reviews to platlab_api;

-- ---------------------------------------------------------------------------
-- Permiso del manifiesto (02 §4): descartar el aviso es del Administrador; el Propietario hereda por
-- core.effective_role_assignments
-- ---------------------------------------------------------------------------

insert into core.permissions (code, module_code) values ('maintenance.replacement.review', 'maintenance');
insert into core.role_permissions (role_code, permission_code) values ('admin', 'maintenance.replacement.review');
