-- T-02: Core mínimo y roles SQL (docs/03_datos.md §1–§3, docs/02_arquitectura.md §5–§6, ADR 0001 y 0008).
-- Crea solo lo que usan T-02 y T-03: titulares, espacios, identidades, membresías, principales,
-- catálogo de roles y permisos, asignaciones con ámbito y ubicaciones. El resto llega con su entrega.

create schema core;
create schema platform;

-- Los esquemas no se exponen por la Data API (config.toml) y solo el runtime los usa.
revoke all on schema core, platform from public;
grant usage on schema core, platform to platlab_api;

-- ---------------------------------------------------------------------------
-- Contexto local de la transacción
-- ---------------------------------------------------------------------------
-- La API lo fija con set_config(..., true). Tras una transacción anterior en la misma conexión
-- el valor queda como cadena vacía, que aquí equivale a «sin contexto».

create function core.current_auth_subject() returns text
  language sql stable parallel safe set search_path = ''
  as $$ select nullif(pg_catalog.current_setting('platlab.auth_subject', true), '') $$;

create function core.current_identity_id() returns uuid
  language sql stable parallel safe set search_path = ''
  as $$ select nullif(pg_catalog.current_setting('platlab.identity_id', true), '')::uuid $$;

create function core.current_workspace_id() returns uuid
  language sql stable parallel safe set search_path = ''
  as $$ select nullif(pg_catalog.current_setting('platlab.workspace_id', true), '')::uuid $$;

create function core.current_principal_id() returns uuid
  language sql stable parallel safe set search_path = ''
  as $$ select nullif(pg_catalog.current_setting('platlab.principal_id', true), '')::uuid $$;

revoke execute on function
  core.current_auth_subject(), core.current_identity_id(),
  core.current_workspace_id(), core.current_principal_id()
  from public;
grant execute on function
  core.current_auth_subject(), core.current_identity_id(),
  core.current_workspace_id(), core.current_principal_id()
  to platlab_api;

-- ---------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------

create function core.touch_updated_at() returns trigger
  language plpgsql set search_path = ''
  as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end
$$;

-- La zona horaria se valida al escribirla, con un trigger y no con un CHECK: así no depende de
-- tzdata al restaurar ni exige EXECUTE al runtime cuando actualiza otras columnas.
create function core.check_time_zone() returns trigger
  language plpgsql set search_path = ''
  as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.time_zone) then
    raise exception 'Zona horaria IANA desconocida: %', new.time_zone
      using errcode = 'check_violation';
  end if;
  return new;
end
$$;

revoke execute on function core.touch_updated_at(), core.check_time_zone() from public;

-- ---------------------------------------------------------------------------
-- Titulares (global de plataforma, 03 §1.1)
-- ---------------------------------------------------------------------------

create table platform.customer_accounts (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null check (length(btrim(legal_name)) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger customer_accounts_touch before update on platform.customer_accounts
  for each row execute function core.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Espacios, identidades, membresías y principales
-- ---------------------------------------------------------------------------

create table core.workspaces (
  id uuid primary key default gen_random_uuid(),
  customer_account_id uuid not null references platform.customer_accounts (id),
  code text not null unique check (code ~ '^[a-z0-9][a-z0-9-]{2,62}$'),
  name text not null check (length(btrim(name)) between 1 and 200),
  time_zone text not null,
  -- Estados de 02 §11; la admisión de dos ejes (02 §6) llega en T-04.
  status text not null default 'provisioning'
    check (status in ('provisioning', 'trial', 'active', 'suspended', 'closing', 'terminated')),
  suspension_reason text check (suspension_reason in ('commercial', 'security')),
  -- El propietario es una membresía del mismo espacio, no un rol (03 §3). FK al final.
  owner_membership_id uuid,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_suspension_reason check ((status = 'suspended') = (suspension_reason is not null)),
  constraint workspaces_owner_required check (status = 'provisioning' or owner_membership_id is not null)
);

create trigger workspaces_touch before update on core.workspaces
  for each row execute function core.touch_updated_at();

create trigger workspaces_time_zone before insert or update of time_zone on core.workspaces
  for each row execute function core.check_time_zone();

create table core.identities (
  id uuid primary key default gen_random_uuid(),
  -- Supabase Auth es el único emisor; OAuth (F3) también llega por él.
  provider text not null check (provider = 'supabase'),
  provider_subject text not null check (length(provider_subject) between 1 and 255),
  display_name text not null check (length(btrim(display_name)) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subject)
);

create trigger identities_touch before update on core.identities
  for each row execute function core.touch_updated_at();

create table core.memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  identity_id uuid not null references core.identities (id),
  -- Nada se borra: una membresía se revoca (03 §1).
  status text not null default 'active' check (status in ('active', 'revoked')),
  revoked_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, identity_id),
  constraint memberships_revoked_at check ((status = 'revoked') = (revoked_at is not null))
);

-- Justificado por GET /v1/me/workspaces y por la política de identidades.
create index memberships_identity_active on core.memberships (identity_id) where status = 'active';

create trigger memberships_touch before update on core.memberships
  for each row execute function core.touch_updated_at();

alter table core.workspaces
  add constraint workspaces_owner_membership_fk
  foreign key (id, owner_membership_id) references core.memberships (workspace_id, id)
  deferrable initially deferred;

-- `trial` y `active` exigen un propietario con membresía activa (03 §3). Se comprueba al confirmar,
-- para poder crear el espacio, su primera membresía y el propietario en la misma transacción.
create function core.check_workspace_owner() returns trigger
  language plpgsql set search_path = ''
  as $$
declare
  target uuid;
begin
  -- PL/pgSQL resuelve todos los campos de una expresión: se separa por tabla.
  if tg_table_name = 'workspaces' then
    target := new.id;
  else
    target := new.workspace_id;
  end if;
  if exists (
    select 1
      from core.workspaces as w
      left join core.memberships as m on m.workspace_id = w.id and m.id = w.owner_membership_id
     where w.id = target
       and w.status in ('trial', 'active')
       and m.status is distinct from 'active'
  ) then
    raise exception 'El espacio % exige un propietario con membresía activa', target
      using errcode = 'check_violation';
  end if;
  return null;
end
$$;

revoke execute on function core.check_workspace_owner() from public;

create constraint trigger workspaces_owner_active
  after insert or update of status, owner_membership_id on core.workspaces
  deferrable initially deferred
  for each row execute function core.check_workspace_owner();

create constraint trigger memberships_owner_active
  after update of status on core.memberships
  deferrable initially deferred
  for each row execute function core.check_workspace_owner();

create table core.principals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  -- Actor humano por su membresía o actor de servicio; nunca ambos (03 §3).
  kind text not null check (kind in ('member', 'service')),
  membership_id uuid,
  service_code text check (service_code ~ '^[a-z][a-z0-9_]{1,62}$'),
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, membership_id),
  unique (workspace_id, service_code),
  foreign key (workspace_id, membership_id) references core.memberships (workspace_id, id),
  constraint principals_kind check (
    (kind = 'member' and membership_id is not null and service_code is null)
    or (kind = 'service' and membership_id is null and service_code is not null)
  )
);

-- ---------------------------------------------------------------------------
-- Catálogo global de roles y permisos (03 §1.1): cambia solo por migración
-- ---------------------------------------------------------------------------

create table core.roles (
  code text primary key check (code ~ '^[a-z][a-z_]{1,62}$'),
  name text not null,
  created_at timestamptz not null default now()
);

-- Roles del espacio (ADR 0008). El propietario no es un rol: es workspaces.owner_membership_id.
insert into core.roles (code, name) values
  ('admin', 'Administrador'),
  ('operator', 'Operador'),
  ('teacher', 'Docente'),
  ('student', 'Estudiante'),
  ('regulatory_officer', 'Responsable de fiscalizados');

create table core.permissions (
  code text primary key check (code ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  -- Cada permiso lleva el prefijo de su módulo (02 §4).
  module_code text not null,
  created_at timestamptz not null default now(),
  constraint permissions_module_prefix check (module_code = split_part(code, '.', 1))
);

create table core.role_permissions (
  role_code text not null references core.roles (code),
  permission_code text not null references core.permissions (code),
  primary key (role_code, permission_code)
);

-- ---------------------------------------------------------------------------
-- Ubicaciones y asignaciones con ámbito
-- ---------------------------------------------------------------------------

create table core.locations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  parent_id uuid,
  kind text not null check (kind in ('site', 'building', 'room', 'storage', 'custody', 'transit')),
  code text not null check (code ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$'),
  name text not null check (length(btrim(name)) between 1 and 200),
  archived_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  -- Sin padres de otro espacio (03 §3).
  foreign key (workspace_id, parent_id) references core.locations (workspace_id, id),
  constraint locations_not_own_parent check (parent_id is distinct from id)
);

-- El código es único dentro del espacio, sin distinguir mayúsculas (03 §1).
create unique index locations_code on core.locations (workspace_id, lower(code));

create trigger locations_touch before update on core.locations
  for each row execute function core.touch_updated_at();

-- Mover el árbol se serializa por espacio y no admite ciclos (03 §3).
create function core.check_location_tree() returns trigger
  language plpgsql set search_path = ''
  as $$
begin
  if new.parent_id is not distinct from old.parent_id then
    return new;
  end if;
  -- Dos movimientos simultáneos podrían formar un ciclo sin verse entre sí.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('core.locations/' || new.workspace_id::text, 0)
  );
  if new.parent_id is not null and exists (
    with recursive ancestors (id, parent_id) as (
      select l.id, l.parent_id
        from core.locations as l
       where l.workspace_id = new.workspace_id and l.id = new.parent_id
      union
      select l.id, l.parent_id
        from core.locations as l
        join ancestors as a on l.id = a.parent_id
       where l.workspace_id = new.workspace_id
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'La ubicación % no puede quedar dentro de su propia descendencia', new.id
      using errcode = 'check_violation';
  end if;
  return new;
end
$$;

revoke execute on function core.check_location_tree() from public;

create trigger locations_tree before update of parent_id on core.locations
  for each row execute function core.check_location_tree();

create table core.role_assignments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  principal_id uuid not null,
  role_code text not null references core.roles (code),
  -- Ámbito: nulo es todo el espacio; si no, la ubicación y su descendencia.
  location_id uuid,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, principal_id) references core.principals (workspace_id, id),
  foreign key (workspace_id, location_id) references core.locations (workspace_id, id),
  constraint role_assignments_validity check (valid_until is null or valid_until > valid_from)
);

-- Una sola asignación abierta por principal, rol y ámbito; el ámbito nulo cuenta como valor.
create unique index role_assignments_open
  on core.role_assignments (workspace_id, principal_id, role_code, location_id) nulls not distinct
  where revoked_at is null;

-- ---------------------------------------------------------------------------
-- RLS (02 §5): el runtime ve solo el espacio de su contexto
-- ---------------------------------------------------------------------------
-- El dueño de las tablas (rol de migraciones) no es el runtime. Las políticas usan
-- `(select core.current_…())` para evaluar el contexto una vez por consulta.

alter table platform.customer_accounts enable row level security;
alter table core.workspaces enable row level security;
alter table core.identities enable row level security;
alter table core.memberships enable row level security;
alter table core.principals enable row level security;
alter table core.roles enable row level security;
alter table core.permissions enable row level security;
alter table core.role_permissions enable row level security;
alter table core.locations enable row level security;
alter table core.role_assignments enable row level security;

-- platform.customer_accounts no tiene políticas: el runtime de clientes no lo lee.

-- Un espacio se ve en su contexto o si la identidad tiene una membresía activa en él.
create policy workspaces_select on core.workspaces for select to platlab_api
  using (
    id = (select core.current_workspace_id())
    or id in (
      select m.workspace_id
        from core.memberships as m
       where m.identity_id = (select core.current_identity_id())
         and m.status = 'active'
    )
  );

-- La admisión bloquea con FOR SHARE, que exige pasar también la política de UPDATE (02 §6).
create policy workspaces_update on core.workspaces for update to platlab_api
  using (id = (select core.current_workspace_id()))
  with check (id = (select core.current_workspace_id()));

-- La identidad ve sus propias membresías sin consultar otras políticas (sin recursión).
create policy memberships_select on core.memberships for select to platlab_api
  using (
    workspace_id = (select core.current_workspace_id())
    or identity_id = (select core.current_identity_id())
  );

create policy memberships_update on core.memberships for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

-- Propia identidad (por sujeto del JWT o por id) y miembros del espacio del contexto,
-- para mostrar responsables. La política de membresías no consulta identidades.
create policy identities_select on core.identities for select to platlab_api
  using (
    (provider = 'supabase' and provider_subject = (select core.current_auth_subject()))
    or id = (select core.current_identity_id())
    or id in (
      select m.identity_id
        from core.memberships as m
       where m.workspace_id = (select core.current_workspace_id())
    )
  );

create policy principals_select on core.principals for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));

create policy locations_select on core.locations for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));

create policy role_assignments_select on core.role_assignments for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));

-- Catálogo global de solo lectura.
create policy roles_select on core.roles for select to platlab_api using (true);
create policy permissions_select on core.permissions for select to platlab_api using (true);
create policy role_permissions_select on core.role_permissions for select to platlab_api using (true);

-- ---------------------------------------------------------------------------
-- Grants del runtime: mínimo para T-02/T-03
-- ---------------------------------------------------------------------------
-- Sin INSERT ni DELETE: en G0 los miembros, roles y ubicaciones se crean con fixtures.

grant select on
  core.workspaces, core.identities, core.memberships, core.principals,
  core.roles, core.permissions, core.role_permissions,
  core.locations, core.role_assignments
  to platlab_api;

-- FOR SHARE exige UPDATE sobre alguna columna. `version` es la única que el runtime puede tocar;
-- los cambios de estado la incrementan para esperar a las operaciones en curso (02 §6).
grant update (version) on core.workspaces, core.memberships to platlab_api;
