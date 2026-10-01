-- T-04: ambiente, registro de módulos, contrato mínimo, derechos y admisión de dos ejes
-- (docs/02_arquitectura.md §4 y §6, docs/03_datos.md §3, ADR 0002 y 0009).

-- ---------------------------------------------------------------------------
-- Ambiente (ADR 0009, cambio del 01-10-2026)
-- ---------------------------------------------------------------------------
-- Una sola fila. Nace como datos reales: solo el seed local o de CI y el aprovisionamiento de
-- staging o demo la marcan como sintética. Si se olvida, los módulos en development se deniegan.

create table platform.environment (
  singleton boolean primary key default true check (singleton),
  data_class text not null default 'real' check (data_class in ('synthetic', 'real')),
  updated_at timestamptz not null default now()
);

insert into platform.environment default values;

create trigger environment_touch before update on platform.environment
  for each row execute function core.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Registro de módulos (02 §4): copia de los manifiestos, verificada por catalog.int.test.ts
-- ---------------------------------------------------------------------------

create table core.module_definitions (
  code text primary key check (code ~ '^[a-z][a-z_]{1,62}$'),
  name text not null check (length(btrim(name)) between 1 and 100),
  stage text not null check (stage in ('development', 'pilot', 'general')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger module_definitions_touch before update on core.module_definitions
  for each row execute function core.touch_updated_at();

-- Dependencias obligatorias entre módulos contratables; Core es implícito.
create table core.module_dependencies (
  module_code text not null references core.module_definitions (code),
  requires_code text not null references core.module_definitions (code),
  primary key (module_code, requires_code),
  constraint module_dependencies_not_self check (module_code <> requires_code)
);

insert into core.module_definitions (code, name, stage) values
  ('reagents', 'Reactivos', 'development');

alter table core.permissions
  add constraint permissions_module_fk foreign key (module_code) references core.module_definitions (code);

-- ---------------------------------------------------------------------------
-- Contrato mínimo (ADR 0002, alcance F1a)
-- ---------------------------------------------------------------------------

create table platform.contracts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  -- Un contrato por espacio mientras no haya renovaciones con contratos distintos.
  unique (workspace_id)
);

create table platform.contract_revisions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  contract_id uuid not null,
  revision_number integer not null check (revision_number > 0),
  -- demo: solo en ambientes sintéticos; pilot: admite módulos en etapa pilot (02 §6).
  kind text not null check (kind in ('demo', 'pilot', 'standard')),
  status text not null default 'draft' check (status in ('draft', 'applied')),
  applied_at timestamptz,
  -- Quién la aplicó, hasta que existan las cuentas y la auditoría de staff (O-01).
  applied_by text check (length(btrim(applied_by)) between 1 and 200),
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (contract_id, revision_number),
  foreign key (workspace_id, contract_id) references platform.contracts (workspace_id, id),
  constraint contract_revisions_applied check (
    (status = 'applied') = (applied_at is not null and applied_by is not null)
  )
);

create table platform.contract_revision_modules (
  workspace_id uuid not null,
  revision_id uuid not null,
  module_code text not null references core.module_definitions (code),
  valid_from timestamptz not null,
  valid_until timestamptz,
  -- Tras vencer: resolver pendientes hasta closing_until y consultar hasta read_until (02 §6).
  closing_until timestamptz,
  read_until timestamptz,
  primary key (revision_id, module_code),
  foreign key (workspace_id, revision_id) references platform.contract_revisions (workspace_id, id),
  constraint contract_revision_modules_dates check (
    (valid_until is null or valid_until > valid_from)
    and (closing_until is null or (valid_until is not null and closing_until >= valid_until))
    and (read_until is null or (valid_until is not null and read_until >= coalesce(closing_until, valid_until)))
  )
);

-- Una revisión aplicada es evidencia comercial: no cambia.
create function platform.protect_applied_revision() returns trigger
  language plpgsql set search_path = ''
  as $$
declare
  target uuid;
begin
  if tg_table_name = 'contract_revisions' then
    if old.status = 'applied' then
      raise exception 'La revisión % ya está aplicada y no cambia', old.id
        using errcode = 'object_not_in_prerequisite_state';
    end if;
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'DELETE' then
    target := old.revision_id;
  else
    target := new.revision_id;
  end if;
  if exists (select 1 from platform.contract_revisions where id = target and status = 'applied')
     or (tg_op = 'UPDATE' and exists (
       select 1 from platform.contract_revisions where id = old.revision_id and status = 'applied'))
  then
    raise exception 'La revisión % ya está aplicada y no cambia', target
      using errcode = 'object_not_in_prerequisite_state';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end
$$;

create trigger contract_revisions_immutable before update or delete on platform.contract_revisions
  for each row execute function platform.protect_applied_revision();

create trigger contract_revision_modules_immutable
  before insert or update or delete on platform.contract_revision_modules
  for each row execute function platform.protect_applied_revision();

-- ---------------------------------------------------------------------------
-- Derechos efectivos (03 §3): solo los proyecta apply_contract_revision
-- ---------------------------------------------------------------------------

create table core.workspace_entitlements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  module_code text not null references core.module_definitions (code),
  -- Estado operativo, independiente del derecho (02 §6).
  status text not null check (status in ('disabled', 'enabled', 'draining', 'read_only')),
  contract_kind text not null check (contract_kind in ('demo', 'pilot', 'standard')),
  valid_from timestamptz not null,
  valid_until timestamptz,
  closing_until timestamptz,
  read_until timestamptz,
  revision_id uuid not null,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, module_code),
  foreign key (workspace_id, revision_id) references platform.contract_revisions (workspace_id, id),
  constraint workspace_entitlements_dates check (
    (valid_until is null or valid_until > valid_from)
    and (closing_until is null or (valid_until is not null and closing_until >= valid_until))
    and (read_until is null or (valid_until is not null and read_until >= coalesce(closing_until, valid_until)))
  )
);

create trigger workspace_entitlements_touch before update on core.workspace_entitlements
  for each row execute function core.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Admisión de dos ejes (02 §6, ADR 0009): funciones puras, sin leer tablas
-- ---------------------------------------------------------------------------
-- Clases de acción: operación nueva, resolver pendientes, consultar y exportar.

create function core.action_classes() returns text[]
  language sql immutable parallel safe set search_path = ''
  as $$ select array['new_operation', 'resolve_pending', 'read_export'] $$;

-- Eje espacio. La suspensión por seguridad solo admite la exportación por un canal seguro,
-- que no pasa por la admisión normal: aquí no admite nada. Un estado desconocido se deniega.
create function core.workspace_axis(p_status text, p_suspension_reason text) returns text[]
  language sql immutable parallel safe set search_path = ''
  as $$
    select case
      when p_status in ('trial', 'active') then core.action_classes()
      when p_status = 'suspended' and p_suspension_reason = 'commercial'
        then array['resolve_pending', 'read_export']
      when p_status = 'closing' then array['resolve_pending', 'read_export']
      else '{}'::text[]
    end
  $$;

-- Etapa admitida según el tipo de contrato y el ambiente (02 §6, «Etapas del módulo»).
create function core.stage_admitted(p_stage text, p_contract_kind text, p_data_class text)
  returns boolean
  language sql immutable parallel safe set search_path = ''
  as $$
    select case
      when coalesce(p_data_class, '') not in ('synthetic', 'real') then false
      when coalesce(p_contract_kind, '') not in ('demo', 'pilot', 'standard') then false
      when p_contract_kind = 'demo' and p_data_class <> 'synthetic' then false
      when p_stage = 'general' then true
      when p_stage = 'pilot' then p_data_class = 'synthetic' or p_contract_kind = 'pilot'
      when p_stage = 'development' then p_data_class = 'synthetic'
      else false
    end
  $$;

-- Eje módulo: intersección de lo que admiten el estado operativo y la vigencia del derecho,
-- siempre que la etapa esté admitida. Sin derecho, estado desconocido o etapa no admitida: nada.
create function core.module_axis(
  p_status text,
  p_valid_from timestamptz,
  p_valid_until timestamptz,
  p_closing_until timestamptz,
  p_read_until timestamptz,
  p_stage text,
  p_contract_kind text,
  p_data_class text,
  p_at timestamptz
) returns text[]
  language plpgsql immutable parallel safe set search_path = ''
  as $$
declare
  all_classes constant text[] := core.action_classes();
  by_status text[];
  by_dates text[];
begin
  if p_status is null or p_valid_from is null or p_at is null
     or not core.stage_admitted(p_stage, p_contract_kind, p_data_class) then
    return '{}'::text[];
  end if;
  by_status := case p_status
    when 'enabled' then all_classes
    when 'draining' then array['resolve_pending', 'read_export']
    when 'read_only' then array['read_export']
    else '{}'::text[]
  end;
  by_dates := case
    when p_at < p_valid_from then '{}'::text[]
    when p_valid_until is null or p_at < p_valid_until then all_classes
    when p_closing_until is not null and p_at < p_closing_until
      then array['resolve_pending', 'read_export']
    when p_read_until is not null and p_at < p_read_until then array['read_export']
    else '{}'::text[]
  end;
  return array(
    select c
      from unnest(all_classes) with ordinality as a (c, n)
     where c = any (by_status) and c = any (by_dates)
     order by n
  );
end
$$;

-- La única decisión: admite solo lo que ambos ejes permiten; gana lo más restrictivo.
-- El resultado elige el error: sin acceso, módulo no disponible o restricción de un eje.
create function core.admission(p_action text, p_workspace text[], p_module text[]) returns text
  language sql immutable parallel safe set search_path = ''
  as $$
    select case
      when p_action is null or not (p_action = any (core.action_classes())) then 'denied'
      when coalesce(cardinality(p_workspace), 0) = 0 then 'denied'
      when coalesce(cardinality(p_module), 0) = 0 then 'module_unavailable'
      when not (p_action = any (p_workspace)) then 'workspace_restricted'
      when not (p_action = any (p_module)) then 'module_read_only'
      else 'admitted'
    end
  $$;

revoke execute on function
  core.action_classes(), core.workspace_axis(text, text), core.stage_admitted(text, text, text),
  core.module_axis(text, timestamptz, timestamptz, timestamptz, timestamptz, text, text, text, timestamptz),
  core.admission(text, text[], text[]), platform.protect_applied_revision()
  from public;
grant execute on function
  core.action_classes(), core.workspace_axis(text, text), core.stage_admitted(text, text, text),
  core.module_axis(text, timestamptz, timestamptz, timestamptz, timestamptz, text, text, text, timestamptz),
  core.admission(text, text[], text[])
  to platlab_api;

-- ---------------------------------------------------------------------------
-- Comandos del Equipo PlatLab (alcance F1a): solo los ejecuta el rol de migraciones
-- ---------------------------------------------------------------------------

-- Aplica una revisión: valida orden, ambiente, etapas y dependencias, y proyecta los derechos
-- en la misma transacción (ADR 0002). Bloquea en el orden fijo espacio → derecho (02 §6), así
-- espera a las operaciones en curso. Repetirla sobre una revisión aplicada no cambia nada.
create function platform.apply_contract_revision(p_revision_id uuid, p_applied_by text) returns void
  language plpgsql set search_path = ''
  as $$
declare
  rev platform.contract_revisions%rowtype;
  data_class text;
  last_applied integer;
  rejected text;
begin
  select * into rev from platform.contract_revisions where id = p_revision_id;
  if not found then
    raise exception 'La revisión % no existe', p_revision_id using errcode = 'no_data_found';
  end if;

  perform 1 from core.workspaces where id = rev.workspace_id for no key update;
  select * into rev from platform.contract_revisions where id = p_revision_id for update;
  if rev.status = 'applied' then
    return;
  end if;

  select coalesce(max(revision_number), 0) into last_applied
    from platform.contract_revisions
   where contract_id = rev.contract_id and status = 'applied';
  if rev.revision_number <> last_applied + 1 then
    raise exception 'La revisión % no sigue a la última aplicada (%)', rev.revision_number, last_applied
      using errcode = 'object_not_in_prerequisite_state';
  end if;

  select e.data_class into data_class from platform.environment as e;
  if rev.kind = 'demo' and data_class is distinct from 'synthetic' then
    raise exception 'Un contrato demo solo se aplica en un ambiente sintético'
      using errcode = 'check_violation';
  end if;

  select string_agg(rm.module_code || ' (' || md.stage || ')', ', ' order by rm.module_code)
    into rejected
    from platform.contract_revision_modules as rm
    join core.module_definitions as md on md.code = rm.module_code
   where rm.revision_id = rev.id
     and not core.stage_admitted(md.stage, rev.kind, data_class);
  if rejected is not null then
    raise exception 'Etapa no admitida para un contrato % en este ambiente: %', rev.kind, rejected
      using errcode = 'check_violation';
  end if;

  select string_agg(d.module_code || ' → ' || d.requires_code, ', ' order by d.module_code)
    into rejected
    from platform.contract_revision_modules as rm
    join core.module_dependencies as d on d.module_code = rm.module_code
   where rm.revision_id = rev.id
     and not exists (
       select 1 from platform.contract_revision_modules as r2
        where r2.revision_id = rev.id and r2.module_code = d.requires_code
     );
  if rejected is not null then
    raise exception 'Faltan dependencias en la revisión: %', rejected using errcode = 'check_violation';
  end if;

  -- Retirar un módulo exige definir su cierre y sus pendientes: llega con la consola (O-01).
  select string_agg(e.module_code, ', ' order by e.module_code) into rejected
    from core.workspace_entitlements as e
   where e.workspace_id = rev.workspace_id
     and not exists (
       select 1 from platform.contract_revision_modules as rm
        where rm.revision_id = rev.id and rm.module_code = e.module_code
     );
  if rejected is not null then
    raise exception 'La revisión retira módulos, todavía no admitido: %', rejected
      using errcode = 'feature_not_supported';
  end if;

  perform 1
     from core.workspace_entitlements
    where workspace_id = rev.workspace_id
    order by module_code
      for update;

  insert into core.workspace_entitlements as e
    (workspace_id, module_code, status, contract_kind, valid_from, valid_until, closing_until, read_until, revision_id)
  select rev.workspace_id, rm.module_code, 'enabled', rev.kind,
         rm.valid_from, rm.valid_until, rm.closing_until, rm.read_until, rev.id
    from platform.contract_revision_modules as rm
   where rm.revision_id = rev.id
  on conflict (workspace_id, module_code) do update
     set contract_kind = excluded.contract_kind,
         valid_from = excluded.valid_from,
         valid_until = excluded.valid_until,
         closing_until = excluded.closing_until,
         read_until = excluded.read_until,
         revision_id = excluded.revision_id,
         version = e.version + 1;

  update platform.contract_revisions
     set status = 'applied', applied_at = now(), applied_by = p_applied_by
   where id = rev.id;
end
$$;

-- Cambia el estado operativo de un módulo en un espacio (02 §6). Bloquea el espacio con FOR SHARE
-- y después el derecho, así espera a las operaciones en curso sin invertir el orden fijo.
create function platform.set_module_status(p_workspace_id uuid, p_module_code text, p_status text)
  returns void
  language plpgsql set search_path = ''
  as $$
declare
  dependents text;
begin
  perform 1 from core.workspaces where id = p_workspace_id for share;

  -- No se apaga una dependencia mientras sus dependientes admiten operaciones nuevas.
  if p_status <> 'enabled' then
    select string_agg(e.module_code, ', ' order by e.module_code) into dependents
      from core.module_dependencies as d
      join core.workspace_entitlements as e
        on e.workspace_id = p_workspace_id and e.module_code = d.module_code and e.status = 'enabled'
     where d.requires_code = p_module_code;
    if dependents is not null then
      raise exception 'Módulos que dependen de % siguen habilitados: %', p_module_code, dependents
        using errcode = 'object_not_in_prerequisite_state';
    end if;
  end if;

  update core.workspace_entitlements
     set status = p_status, version = version + 1
   where workspace_id = p_workspace_id and module_code = p_module_code;
  if not found then
    raise exception 'El espacio % no tiene derecho sobre %', p_workspace_id, p_module_code
      using errcode = 'no_data_found';
  end if;
end
$$;

revoke execute on function
  platform.apply_contract_revision(uuid, text), platform.set_module_status(uuid, text, text)
  from public;

-- ---------------------------------------------------------------------------
-- RLS y grants
-- ---------------------------------------------------------------------------

alter table platform.environment enable row level security;
alter table core.module_definitions enable row level security;
alter table core.module_dependencies enable row level security;
alter table platform.contracts enable row level security;
alter table platform.contract_revisions enable row level security;
alter table platform.contract_revision_modules enable row level security;
alter table core.workspace_entitlements enable row level security;

-- Contratos y revisiones: sin políticas; el runtime de clientes no los lee.

create policy environment_select on platform.environment for select to platlab_api using (true);
create policy module_definitions_select on core.module_definitions for select to platlab_api using (true);
create policy module_dependencies_select on core.module_dependencies for select to platlab_api using (true);

create policy workspace_entitlements_select on core.workspace_entitlements for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));

-- La admisión bloquea el derecho con FOR SHARE, que exige pasar la política de UPDATE.
create policy workspace_entitlements_update on core.workspace_entitlements for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

grant select on platform.environment, core.module_definitions, core.module_dependencies,
  core.workspace_entitlements to platlab_api;
grant update (version) on core.workspace_entitlements to platlab_api;
