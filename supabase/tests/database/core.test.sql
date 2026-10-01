-- Core de T-02/T-03: restricciones, FKs compuestas, privilegios y RLS bajo el rol real de runtime
-- (docs/03_datos.md §1 y §3, docs/02_arquitectura.md §5, docs/desarrollo/primer_incremento.md).
begin;
create extension if not exists pgtap with schema extensions;

select plan(49);

-- Solo dentro de esta transacción: pgTAP vive en `extensions` y se invoca también como platlab_api,
-- y `postgres` (que administra el rol, pero no lo usa) necesita SET para adoptarlo.
grant usage on schema extensions to platlab_api;
grant platlab_api to postgres with set true, inherit false;

-- ---------------------------------------------------------------------------
-- Fixtures sintéticos, creados como dueño de las tablas
-- ---------------------------------------------------------------------------
-- A y B activos; una identidad compartida es Administradora en A y Operadora con ámbito en B.

insert into platform.customer_accounts (id, legal_name)
values ('c0000000-0000-4000-8000-000000000001', 'Titular sintético');

insert into core.workspaces (id, customer_account_id, code, name, time_zone) values
  ('a0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000001', 'demo-a', 'Espacio A', 'America/Guayaquil'),
  ('b0000000-0000-4000-8000-00000000000b', 'c0000000-0000-4000-8000-000000000001', 'demo-b', 'Espacio B', 'America/Guayaquil');

insert into core.identities (id, provider, provider_subject, display_name) values
  ('10000000-0000-4000-8000-000000000001', 'supabase', 'sub-shared', 'Ana, de A y B'),
  ('10000000-0000-4000-8000-000000000002', 'supabase', 'sub-owner-a', 'Propietaria de A'),
  ('10000000-0000-4000-8000-000000000003', 'supabase', 'sub-owner-b', 'Propietario de B'),
  ('10000000-0000-4000-8000-000000000004', 'supabase', 'sub-revoked', 'Ex miembro de B');

insert into core.memberships (id, workspace_id, identity_id, status, revoked_at) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000001', 'active', null),
  ('a1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000002', 'active', null),
  ('b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-000000000001', 'active', null),
  ('b1000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-000000000003', 'active', null),
  ('b1000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-000000000004', 'revoked', now());

insert into core.principals (id, workspace_id, kind, membership_id) values
  ('a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'member', 'a1000000-0000-4000-8000-000000000001'),
  ('a2000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'member', 'a1000000-0000-4000-8000-000000000002'),
  ('b2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'member', 'b1000000-0000-4000-8000-000000000001'),
  ('b2000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-00000000000b', 'member', 'b1000000-0000-4000-8000-000000000002');

update core.workspaces set owner_membership_id = 'a1000000-0000-4000-8000-000000000002', status = 'active'
 where id = 'a0000000-0000-4000-8000-00000000000a';
update core.workspaces set owner_membership_id = 'b1000000-0000-4000-8000-000000000002', status = 'active'
 where id = 'b0000000-0000-4000-8000-00000000000b';

insert into core.locations (id, workspace_id, parent_id, kind, code, name) values
  ('a3000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', null, 'site', 'SEDE', 'Sede A'),
  ('a3000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'a3000000-0000-4000-8000-000000000001', 'room', 'LAB-1', 'Laboratorio 1'),
  ('a3000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-00000000000a', 'a3000000-0000-4000-8000-000000000002', 'storage', 'ALM-1', 'Almacén 1'),
  ('b3000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', null, 'site', 'SEDE', 'Sede B');

insert into core.role_assignments (workspace_id, principal_id, role_code, location_id) values
  ('a0000000-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000001', 'admin', null),
  ('b0000000-0000-4000-8000-00000000000b', 'b2000000-0000-4000-8000-000000000001', 'operator', 'b3000000-0000-4000-8000-000000000001');

-- Los fixtures cumplen las restricciones diferidas; desde aquí cada sentencia se comprueba al instante.
set constraints all immediate;

-- ---------------------------------------------------------------------------
-- Estructura, RLS y privilegios
-- ---------------------------------------------------------------------------

select tables_are('core',
  array['workspaces', 'identities', 'memberships', 'principals', 'roles', 'permissions',
        'role_permissions', 'locations', 'role_assignments'],
  'core contiene solo las tablas de T-02/T-03');

select tables_are('platform', array['customer_accounts'], 'platform contiene solo los titulares');

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('core', 'platform') and c.relkind = 'r' and not c.relrowsecurity),
  0, 'todas las tablas de core y platform tienen RLS');

select is(
  (select count(*)::int from pg_class where relowner = 'platlab_api'::regrole),
  0, 'platlab_api no es dueño de ninguna relación');

select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema in ('core', 'platform')
      and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')),
  0, 'PUBLIC, anon, authenticated y service_role no tienen privilegios en core ni platform');

select ok(
  not has_schema_privilege('anon', 'core', 'USAGE')
    and not has_schema_privilege('authenticated', 'core', 'USAGE')
    and not has_schema_privilege('anon', 'platform', 'USAGE')
    and not has_schema_privilege('authenticated', 'platform', 'USAGE'),
  'anon y authenticated no usan los esquemas core ni platform');

select is(
  (select count(*)::int from information_schema.role_table_grants
    where grantee = 'platlab_api' and table_schema in ('core', 'platform')
      and privilege_type <> 'SELECT'),
  0, 'platlab_api no tiene INSERT, UPDATE de tabla, DELETE ni TRUNCATE en core ni platform');

select set_eq(
  $$ select table_name::text || '.' || column_name::text from information_schema.column_privileges
      where grantee = 'platlab_api' and table_schema = 'core' and privilege_type = 'UPDATE' $$,
  array['workspaces.version', 'memberships.version'],
  'platlab_api solo puede actualizar version de espacios y membresías (para FOR SHARE)');

select ok(
  not has_table_privilege('platlab_api', 'platform.customer_accounts', 'SELECT'),
  'platlab_api no lee los titulares');

select set_eq(
  'select code from core.roles',
  array['admin', 'operator', 'teacher', 'student', 'regulatory_officer'],
  'catálogo fijo de roles del espacio (ADR 0008), sin propietario');

-- ---------------------------------------------------------------------------
-- Propietario y estados del espacio
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ insert into core.workspaces (customer_account_id, code, name, time_zone, status)
     values ('c0000000-0000-4000-8000-000000000001', 'sin-propietario', 'X', 'UTC', 'active') $$,
  '23514', null, 'un espacio activo exige propietario');

select throws_ok(
  $$ update core.workspaces set owner_membership_id = 'b1000000-0000-4000-8000-000000000002'
      where id = 'a0000000-0000-4000-8000-00000000000a' $$,
  '23503', null, 'el propietario debe ser una membresía del mismo espacio');

select throws_ok(
  $$ update core.memberships set status = 'revoked', revoked_at = now()
      where id = 'a1000000-0000-4000-8000-000000000002' $$,
  '23514', null, 'no se revoca la membresía del propietario de un espacio activo');

select lives_ok(
  $$ insert into core.workspaces (customer_account_id, code, name, time_zone)
     values ('c0000000-0000-4000-8000-000000000001', 'en-alta', 'En alta', 'America/Guayaquil') $$,
  'un espacio en provisioning puede no tener propietario');

select throws_ok(
  $$ update core.workspaces set status = 'suspended' where id = 'a0000000-0000-4000-8000-00000000000a' $$,
  '23514', null, 'una suspensión exige motivo comercial o de seguridad');

select throws_ok(
  $$ insert into core.workspaces (customer_account_id, code, name, time_zone)
     values ('c0000000-0000-4000-8000-000000000001', 'zona-mala', 'X', 'America/Quito_Falsa') $$,
  '23514', null, 'la zona horaria debe ser IANA');

select throws_ok(
  $$ update core.memberships set status = 'revoked'
      where id = 'a1000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'una membresía revocada registra cuándo');

select throws_ok(
  $$ insert into core.memberships (workspace_id, identity_id)
     values ('a0000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000001') $$,
  '23505', null, 'una identidad tiene una sola membresía por espacio');

-- ---------------------------------------------------------------------------
-- FKs compuestas: nada referencia filas de otro espacio
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ insert into core.principals (workspace_id, kind, membership_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'member', 'b1000000-0000-4000-8000-000000000002') $$,
  '23503', null, 'un principal de A no usa una membresía de B');

select throws_ok(
  $$ insert into core.locations (workspace_id, parent_id, kind, code, name)
     values ('a0000000-0000-4000-8000-00000000000a', 'b3000000-0000-4000-8000-000000000001', 'room', 'CRUZ', 'Cruzada') $$,
  '23503', null, 'una ubicación de A no cuelga de una ubicación de B');

select throws_ok(
  $$ insert into core.role_assignments (workspace_id, principal_id, role_code, location_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000001', 'operator', 'b3000000-0000-4000-8000-000000000001') $$,
  '23503', null, 'un rol en A no tiene ámbito en una ubicación de B');

select throws_ok(
  $$ insert into core.role_assignments (workspace_id, principal_id, role_code)
     values ('a0000000-0000-4000-8000-00000000000a', 'b2000000-0000-4000-8000-000000000001', 'operator') $$,
  '23503', null, 'un rol en A no se asigna a un principal de B');

select throws_ok(
  $$ insert into core.principals (workspace_id, kind, membership_id, service_code)
     values ('a0000000-0000-4000-8000-00000000000a', 'member', 'a1000000-0000-4000-8000-000000000001', 'worker') $$,
  '23514', null, 'un principal no mezcla actor humano y de servicio');

-- ---------------------------------------------------------------------------
-- Roles con ámbito y árbol de ubicaciones
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ insert into core.role_assignments (workspace_id, principal_id, role_code)
     values ('a0000000-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000001', 'admin') $$,
  '23505', null, 'no se duplica una asignación abierta con ámbito de todo el espacio');

select throws_ok(
  $$ insert into core.role_assignments (workspace_id, principal_id, role_code)
     values ('a0000000-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000001', 'owner') $$,
  '23503', null, 'solo se asignan roles del catálogo; propietario no es un rol');

select throws_ok(
  $$ update core.locations set parent_id = 'a3000000-0000-4000-8000-000000000003'
      where id = 'a3000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'el árbol de ubicaciones no admite ciclos');

select throws_ok(
  $$ update core.locations set parent_id = id where id = 'a3000000-0000-4000-8000-000000000002' $$,
  '23514', null, 'una ubicación no es su propio padre');

select throws_ok(
  $$ insert into core.locations (workspace_id, kind, code, name)
     values ('a0000000-0000-4000-8000-00000000000a', 'site', 'sede', 'Duplicada') $$,
  '23505', null, 'el código de ubicación es único en el espacio sin distinguir mayúsculas');

select lives_ok(
  $$ insert into core.locations (workspace_id, kind, code, name)
     values ('b0000000-0000-4000-8000-00000000000b', 'room', 'LAB-1', 'Laboratorio 1 de B') $$,
  'el mismo código puede existir en otro espacio');

-- ---------------------------------------------------------------------------
-- RLS bajo el rol real de runtime
-- ---------------------------------------------------------------------------

set local role platlab_api;

select is(
  (select (select count(*) from core.workspaces) + (select count(*) from core.memberships)
        + (select count(*) from core.identities) + (select count(*) from core.principals)
        + (select count(*) from core.locations) + (select count(*) from core.role_assignments))::int,
  0, 'sin contexto no se ve ninguna fila del espacio');

select set_config('platlab.workspace_id', 'a0000000-0000-4000-8000-00000000000a', true);

select set_eq('select id from core.workspaces',
  array['a0000000-0000-4000-8000-00000000000a']::uuid[], 'con contexto A solo se ve el espacio A');

select set_eq('select distinct workspace_id from core.locations',
  array['a0000000-0000-4000-8000-00000000000a']::uuid[], 'con contexto A solo se ven ubicaciones de A');

select set_eq(
  $$ select workspace_id from core.principals union select workspace_id from core.role_assignments
     union select workspace_id from core.memberships $$,
  array['a0000000-0000-4000-8000-00000000000a']::uuid[],
  'con contexto A solo se ven principales, roles y membresías de A');

select set_eq('select id from core.identities',
  array['10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002']::uuid[],
  'con contexto A solo se ven las identidades de sus miembros');

select is_empty(
  $$ select m.id from core.workspaces w join core.memberships m on m.workspace_id = w.id
      where w.id = 'b0000000-0000-4000-8000-00000000000b' for share of w, m $$,
  'con contexto A no se bloquea ni se ve una membresía de B');

select lives_ok(
  $$ select 1 from core.workspaces w join core.memberships m on m.workspace_id = w.id
      where w.id = 'a0000000-0000-4000-8000-00000000000a' for share of w, m $$,
  'la admisión puede bloquear con FOR SHARE el espacio y la membresía de su contexto');

select set_config('platlab.workspace_id', 'b0000000-0000-4000-8000-00000000000b', true);

select set_eq('select distinct workspace_id from core.locations',
  array['b0000000-0000-4000-8000-00000000000b']::uuid[], 'al cambiar a B el contexto de A no se conserva');

select set_config('platlab.workspace_id', '', true);

select is((select count(*)::int from core.locations), 0, 'un contexto vacío equivale a no tener contexto');

-- Identidad sin espacio: para GET /v1/me/workspaces.
select set_config('platlab.identity_id', '10000000-0000-4000-8000-000000000001', true);

select set_eq('select workspace_id from core.memberships',
  array['a0000000-0000-4000-8000-00000000000a', 'b0000000-0000-4000-8000-00000000000b']::uuid[],
  'la identidad ve sus propias membresías en A y B');

select set_eq('select id from core.workspaces',
  array['a0000000-0000-4000-8000-00000000000a', 'b0000000-0000-4000-8000-00000000000b']::uuid[],
  'la identidad ve los espacios donde tiene membresía activa');

select set_config('platlab.identity_id', '10000000-0000-4000-8000-000000000004', true);

select is((select count(*)::int from core.workspaces), 0, 'una membresía revocada no muestra el espacio');

select set_config('platlab.identity_id', '', true);
select set_config('platlab.auth_subject', 'sub-owner-b', true);

select set_eq('select id from core.identities',
  array['10000000-0000-4000-8000-000000000003']::uuid[],
  'el sujeto verificado del JWT solo encuentra su propia identidad');

select set_config('platlab.workspace_id', 'a0000000-0000-4000-8000-00000000000a', true);

select throws_ok(
  $$ insert into core.locations (workspace_id, kind, code, name)
     values ('a0000000-0000-4000-8000-00000000000a', 'room', 'NUEVA', 'Nueva') $$,
  '42501', null, 'el runtime no crea ubicaciones en T-02/T-03');

select throws_ok(
  $$ delete from core.memberships where workspace_id = 'a0000000-0000-4000-8000-00000000000a' $$,
  '42501', null, 'el runtime no borra membresías');

select throws_ok(
  $$ update core.memberships set status = 'revoked', revoked_at = now()
      where id = 'a1000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'el runtime no cambia el estado de una membresía');

-- Los cambios de estado incrementan `version` para esperar a la admisión en curso (02 §6).
select lives_ok(
  $$ update core.workspaces set version = version + 1 where id = 'a0000000-0000-4000-8000-00000000000a' $$,
  'el runtime incrementa la versión del espacio de su contexto');

select lives_ok(
  $$ update core.memberships set version = version + 1 where id = 'a1000000-0000-4000-8000-000000000001' $$,
  'el runtime incrementa la versión de una membresía de su contexto');

select is(
  (select version from core.workspaces where id = 'a0000000-0000-4000-8000-00000000000a'),
  2, 'el incremento de versión se aplicó');

update core.workspaces set version = version + 1 where id = 'b0000000-0000-4000-8000-00000000000b';
update core.memberships set version = version + 1 where workspace_id = 'b0000000-0000-4000-8000-00000000000b';

reset role;

select is(
  (select max(version) from core.workspaces where id = 'b0000000-0000-4000-8000-00000000000b')
    + (select max(version) from core.memberships where workspace_id = 'b0000000-0000-4000-8000-00000000000b'),
  2, 'con contexto A, el runtime no modifica filas de B');

set local role platlab_api;

reset role;

select * from finish();
rollback;
