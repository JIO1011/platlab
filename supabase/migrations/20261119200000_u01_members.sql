-- U-01 (ADR 0027): Usuarios del Núcleo. Rol Visita, lista blanca (la invitación de 03 §2 sin token: el enlace por
-- correo llega con T-03B), correo de la identidad, último acceso y lo mínimo que el runtime necesita para que una
-- persona se una, para cambiar su rol y para quitarla. Nada se borra: se revoca.

-- ---------------------------------------------------------------------------
-- Rol Visita: los mismos permisos que Docente y Estudiante (manifiestos de Laboratorios y Equipos)
-- ---------------------------------------------------------------------------

insert into core.roles (code, name) values ('visitor', 'Visita');

insert into core.role_permissions (role_code, permission_code) values
  ('visitor', 'labs.read'),
  ('visitor', 'labs.request.create'),
  ('visitor', 'equipment.fault.report');

-- ---------------------------------------------------------------------------
-- Contexto: el correo verificado del JWT, solo para encontrar las invitaciones propias
-- ---------------------------------------------------------------------------

create function core.current_auth_email() returns text
  language sql stable parallel safe set search_path = ''
  as $$ select nullif(pg_catalog.current_setting('platlab.auth_email', true), '') $$;

revoke execute on function core.current_auth_email() from public;
grant execute on function core.current_auth_email() to platlab_api;

-- ---------------------------------------------------------------------------
-- Correo de la identidad: se guarda al unirse, para mostrarlo y para no invitar dos veces a un miembro
-- ---------------------------------------------------------------------------

alter table core.identities
  add column email text check (email = lower(btrim(email)) and email ~ '^[^@[:space:]]+@[^@[:space:]]+$' and length(email) <= 254);

-- ---------------------------------------------------------------------------
-- Lista blanca
-- ---------------------------------------------------------------------------

create table core.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  email text not null check (email = lower(btrim(email)) and email ~ '^[^@[:space:]]+@[^@[:space:]]+$' and length(email) <= 254),
  display_name text not null check (length(btrim(display_name)) between 1 and 200),
  -- Los roles que se asignan en Usuarios; el Responsable de fiscalizados no (ADR 0027).
  role_code text not null references core.roles (code)
    check (role_code in ('admin', 'operator', 'teacher', 'student', 'visitor')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by_principal_id uuid not null,
  invited_at timestamptz not null default now(),
  membership_id uuid,
  accepted_at timestamptz,
  revoked_by_principal_id uuid,
  revoked_at timestamptz,
  unique (workspace_id, id),
  foreign key (workspace_id, invited_by_principal_id) references core.principals (workspace_id, id),
  foreign key (workspace_id, membership_id) references core.memberships (workspace_id, id),
  foreign key (workspace_id, revoked_by_principal_id) references core.principals (workspace_id, id),
  constraint invitations_accepted check ((status = 'accepted') = (membership_id is not null and accepted_at is not null)),
  constraint invitations_revoked check ((status = 'revoked') = (revoked_at is not null and revoked_by_principal_id is not null))
);

-- Un correo no se repite pendiente en el mismo espacio; el índice también sirve a la lista del espacio.
create unique index invitations_pending on core.invitations (workspace_id, email) where status = 'pending';
-- GET /v1/me/invitations busca el correo del JWT en todos los espacios.
create index invitations_pending_email on core.invitations (email) where status = 'pending';

-- ---------------------------------------------------------------------------
-- Último acceso: tabla aparte para no bloquear la membresía que la admisión lee con FOR SHARE
-- ---------------------------------------------------------------------------

create table core.member_presence (
  workspace_id uuid not null,
  membership_id uuid not null,
  last_seen_at timestamptz not null default now(),
  primary key (workspace_id, membership_id),
  foreign key (workspace_id, membership_id) references core.memberships (workspace_id, id)
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table core.invitations enable row level security;
alter table core.member_presence enable row level security;

-- Quien fue invitado ve el espacio de su invitación pendiente, por el correo de su JWT, antes de ser miembro.
-- La política de invitaciones no consulta espacios (sin recursión).
drop policy workspaces_select on core.workspaces;
create policy workspaces_select on core.workspaces for select to platlab_api
  using (
    id = (select core.current_workspace_id())
    or id in (
      select m.workspace_id
        from core.memberships as m
       where m.identity_id = (select core.current_identity_id())
         and m.status = 'active'
    )
    or id in (
      select i.workspace_id
        from core.invitations as i
       where i.status = 'pending'
         and i.email = (select core.current_auth_email())
    )
  );

create policy invitations_select on core.invitations for select to platlab_api
  using (
    workspace_id = (select core.current_workspace_id())
    or (status = 'pending' and email = (select core.current_auth_email()))
  );

create policy invitations_insert on core.invitations for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and status = 'pending'
    and invited_by_principal_id = (select core.current_principal_id())
  );

-- Solo una pendiente cambia, y solo a aceptada o anulada: el historial queda.
create policy invitations_update on core.invitations for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()) and status = 'pending')
  with check (workspace_id = (select core.current_workspace_id()) and status in ('accepted', 'revoked'));

-- Cada persona crea y corrige solo su propia identidad, la del sujeto de su JWT.
create policy identities_insert on core.identities for insert to platlab_api
  with check (provider = 'supabase' and provider_subject = (select core.current_auth_subject()));

create policy identities_update on core.identities for update to platlab_api
  using (provider = 'supabase' and provider_subject = (select core.current_auth_subject()))
  with check (provider = 'supabase' and provider_subject = (select core.current_auth_subject()));

-- Una membresía nueva es siempre la propia, en el espacio del contexto (al unirse). La identidad sale del contexto,
-- que la API fija tras crearla por el sujeto del JWT: consultar identidades aquí recursaría en su política.
create policy memberships_insert on core.memberships for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and identity_id = (select core.current_identity_id())
  );

create policy principals_insert on core.principals for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and kind = 'member'
    and membership_id in (
      select m.id
        from core.memberships as m
       where m.workspace_id = (select core.current_workspace_id())
         and m.identity_id = (select core.current_identity_id())
    )
  );

create policy role_assignments_insert on core.role_assignments for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()));

-- Una asignación abierta solo se revoca; nunca se reabre ni se edita.
create policy role_assignments_update on core.role_assignments for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()) and revoked_at is null)
  with check (workspace_id = (select core.current_workspace_id()) and revoked_at is not null);

create policy member_presence_select on core.member_presence for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));

-- Cada miembro escribe solo su propio acceso.
create policy member_presence_insert on core.member_presence for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and membership_id in (
      select m.id
        from core.memberships as m
       where m.workspace_id = (select core.current_workspace_id())
         and m.identity_id = (select core.current_identity_id())
    )
  );

create policy member_presence_update on core.member_presence for update to platlab_api
  using (
    workspace_id = (select core.current_workspace_id())
    and membership_id in (
      select m.id
        from core.memberships as m
       where m.workspace_id = (select core.current_workspace_id())
         and m.identity_id = (select core.current_identity_id())
    )
  )
  with check (workspace_id = (select core.current_workspace_id()));

-- ---------------------------------------------------------------------------
-- Grants del runtime: columnas exactas, sin DELETE
-- ---------------------------------------------------------------------------

grant select on core.invitations, core.member_presence to platlab_api;
grant insert (workspace_id, email, display_name, role_code, invited_by_principal_id) on core.invitations to platlab_api;
grant update (status, membership_id, accepted_at, revoked_by_principal_id, revoked_at) on core.invitations to platlab_api;
grant insert (provider, provider_subject, display_name, email) on core.identities to platlab_api;
grant update (email) on core.identities to platlab_api;
grant insert (workspace_id, identity_id) on core.memberships to platlab_api;
grant update (status, revoked_at) on core.memberships to platlab_api;
grant insert (workspace_id, kind, membership_id) on core.principals to platlab_api;
grant insert (workspace_id, principal_id, role_code) on core.role_assignments to platlab_api;
grant update (revoked_at) on core.role_assignments to platlab_api;
grant insert (workspace_id, membership_id, last_seen_at) on core.member_presence to platlab_api;
grant update (last_seen_at) on core.member_presence to platlab_api;
