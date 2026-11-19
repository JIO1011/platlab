-- U-01 (ADR 0027): Usuarios del Núcleo bajo el rol de runtime. Rol Visita, lista blanca aislada por espacio y
-- visible para el correo invitado, unirse solo con la propia identidad, asignaciones que solo se revocan,
-- último acceso propio y nada se borra.
begin;
create extension if not exists pgtap with schema extensions;

select plan(31);

grant usage on schema extensions to platlab_api;
grant platlab_api to postgres with set true, inherit false;

-- ---------------------------------------------------------------------------
-- Fixtures sintéticos: A y B activos con su propietario; una identidad ajena sin membresía
-- ---------------------------------------------------------------------------

insert into platform.customer_accounts (id, legal_name)
values ('c0000000-0000-4000-8000-000000000001', 'Titular sintético');
insert into core.workspaces (id, customer_account_id, code, name, time_zone) values
  ('a0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000001', 'us-a', 'A', 'America/Guayaquil'),
  ('b0000000-0000-4000-8000-00000000000b', 'c0000000-0000-4000-8000-000000000001', 'us-b', 'B', 'America/Guayaquil');
insert into core.identities (id, provider, provider_subject, display_name) values
  ('10000000-0000-4000-8000-000000000001', 'supabase', 'us-owner-a', 'Propietaria de A'),
  ('10000000-0000-4000-8000-000000000002', 'supabase', 'us-owner-b', 'Propietario de B'),
  ('10000000-0000-4000-8000-000000000003', 'supabase', 'us-other', 'Sin espacio');
insert into core.memberships (id, workspace_id, identity_id) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000001'),
  ('b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-000000000002');
insert into core.principals (id, workspace_id, kind, membership_id) values
  ('a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'member', 'a1000000-0000-4000-8000-000000000001'),
  ('b2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'member', 'b1000000-0000-4000-8000-000000000001');
update core.workspaces set owner_membership_id = 'a1000000-0000-4000-8000-000000000001', status = 'active'
 where id = 'a0000000-0000-4000-8000-00000000000a';
update core.workspaces set owner_membership_id = 'b1000000-0000-4000-8000-000000000001', status = 'active'
 where id = 'b0000000-0000-4000-8000-00000000000b';
-- B también invitó a la persona nueva: ella ve las dos, cada espacio solo la suya.
insert into core.invitations (id, workspace_id, email, display_name, role_code, invited_by_principal_id) values
  ('b4000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'nueva@demo.test', 'Nueva', 'operator',
   'b2000000-0000-4000-8000-000000000001');

-- ---------------------------------------------------------------------------
-- Rol Visita: los mismos permisos que Docente y Estudiante
-- ---------------------------------------------------------------------------

select set_eq(
  $$ select permission_code from core.role_permissions where role_code = 'visitor' $$,
  $$ select permission_code from core.role_permissions where role_code = 'teacher' $$,
  'la Visita tiene los permisos del Docente');

select set_eq(
  $$ select permission_code from core.role_permissions where role_code = 'visitor' $$,
  $$ select permission_code from core.role_permissions where role_code = 'student' $$,
  'la Visita tiene los permisos del Estudiante');

set local role platlab_api;
select set_config('platlab.auth_subject', 'us-owner-a', true);
select set_config('platlab.workspace_id', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config('platlab.principal_id', 'a2000000-0000-4000-8000-000000000001', true);

-- ---------------------------------------------------------------------------
-- Lista blanca del Propietario: espacio, autoría, correo único pendiente y roles de Usuarios
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into core.invitations (workspace_id, email, display_name, role_code, invited_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'nueva@demo.test', 'Nueva', 'visitor', 'a2000000-0000-4000-8000-000000000001') $$,
  'el runtime suma un correo a la lista blanca de su espacio');

select lives_ok(
  $$ insert into core.invitations (workspace_id, email, display_name, role_code, invited_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'otra@demo.test', 'Otra', 'teacher', 'a2000000-0000-4000-8000-000000000001') $$,
  'otra persona en la misma lista');

select throws_ok(
  $$ insert into core.invitations (workspace_id, email, display_name, role_code, invited_by_principal_id)
     values ('b0000000-0000-4000-8000-00000000000b', 'x@demo.test', 'X', 'teacher', 'b2000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'no invita en otro espacio');

select throws_ok(
  $$ insert into core.invitations (workspace_id, email, display_name, role_code, invited_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'nueva@demo.test', 'Nueva', 'teacher', 'a2000000-0000-4000-8000-000000000001') $$,
  '23505', null, 'un correo no se repite pendiente en el mismo espacio');

select throws_ok(
  $$ insert into core.invitations (workspace_id, email, display_name, role_code, invited_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'Mayus@demo.test', 'M', 'teacher', 'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'el correo se guarda en minúsculas');

select throws_ok(
  $$ insert into core.invitations (workspace_id, email, display_name, role_code, invited_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'rf@demo.test', 'RF', 'regulatory_officer', 'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'el Responsable de fiscalizados no se asigna en Usuarios');

select lives_ok(
  $$ update core.invitations set status = 'revoked', revoked_at = now(), revoked_by_principal_id = 'a2000000-0000-4000-8000-000000000001'
      where email = 'otra@demo.test' $$,
  'una invitación pendiente se anula');

select results_eq(
  $$ with changed as (update core.invitations set status = 'pending', revoked_at = null, revoked_by_principal_id = null
       where email = 'otra@demo.test' returning 1) select count(*)::int from changed $$,
  $$ values (0) $$,
  'una invitación anulada no vuelve a pendiente');

select throws_ok(
  $$ delete from core.invitations where email = 'otra@demo.test' $$,
  '42501', null, 'el runtime no borra invitaciones');

select set_eq($$ select email from core.invitations $$, array['nueva@demo.test', 'otra@demo.test'],
  'el Propietario de A no ve la lista de B');

-- ---------------------------------------------------------------------------
-- Quien fue invitado, antes de ser miembro: solo lo pendiente de su correo
-- ---------------------------------------------------------------------------

select set_config('platlab.workspace_id', '', true);
select set_config('platlab.principal_id', '', true);
select set_config('platlab.auth_subject', 'us-new', true);
select set_config('platlab.auth_email', 'nueva@demo.test', true);

select is((select count(*)::int from core.invitations), 2, 've sus invitaciones pendientes en A y en B');

select set_eq($$ select id from core.workspaces $$,
  array['a0000000-0000-4000-8000-00000000000a', 'b0000000-0000-4000-8000-00000000000b']::uuid[],
  've los espacios que la invitaron');

select set_config('platlab.auth_email', 'otra@demo.test', true);

select is((select count(*)::int from core.invitations), 0, 'una invitación anulada no se ve sin el espacio');

select set_config('platlab.auth_email', 'nueva@demo.test', true);

-- ---------------------------------------------------------------------------
-- Unirse a A: la propia identidad, la propia membresía y el propio principal
-- ---------------------------------------------------------------------------

select set_config('platlab.workspace_id', 'a0000000-0000-4000-8000-00000000000a', true);

select throws_ok(
  $$ insert into core.identities (provider, provider_subject, display_name, email)
     values ('supabase', 'us-impostor', 'Otra', 'nueva@demo.test') $$,
  '42501', null, 'no crea la identidad de otro sujeto');

select lives_ok(
  $$ insert into core.identities (provider, provider_subject, display_name, email)
     values ('supabase', 'us-new', 'Nueva', 'nueva@demo.test') $$,
  'crea su propia identidad');

-- La API fija la identidad recién creada en el contexto, como al entrar a un espacio.
select set_config('platlab.identity_id', (select id::text from core.identities where provider_subject = 'us-new'), true);

select throws_ok(
  $$ insert into core.memberships (workspace_id, identity_id)
     values ('a0000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000003') $$,
  '42501', null, 'no crea la membresía de otra identidad');

select throws_ok(
  $$ insert into core.memberships (workspace_id, identity_id)
     select 'b0000000-0000-4000-8000-00000000000b', id from core.identities where provider_subject = 'us-new' $$,
  '42501', null, 'no se une a un espacio distinto del contexto');

select lives_ok(
  $$ insert into core.memberships (workspace_id, identity_id)
     select 'a0000000-0000-4000-8000-00000000000a', id from core.identities where provider_subject = 'us-new' $$,
  'crea su membresía en el espacio del contexto');

select throws_ok(
  $$ insert into core.principals (workspace_id, kind, membership_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'service', null) $$,
  '42501', null, 'no crea principales de servicio');

select lives_ok(
  $$ insert into core.principals (workspace_id, kind, membership_id)
     select m.workspace_id, 'member', m.id from core.memberships as m
       join core.identities as i on i.id = m.identity_id
      where i.provider_subject = 'us-new' and m.workspace_id = 'a0000000-0000-4000-8000-00000000000a' $$,
  'crea el principal de su membresía');

select lives_ok(
  $$ update core.invitations set status = 'accepted', accepted_at = now(),
            membership_id = (select m.id from core.memberships as m join core.identities as i on i.id = m.identity_id
                              where i.provider_subject = 'us-new' and m.workspace_id = 'a0000000-0000-4000-8000-00000000000a')
      where workspace_id = 'a0000000-0000-4000-8000-00000000000a' and email = 'nueva@demo.test' and status = 'pending' $$,
  'marca su invitación como aceptada');

-- ---------------------------------------------------------------------------
-- Roles: se asignan en el espacio del contexto y solo se revocan
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into core.role_assignments (workspace_id, principal_id, role_code)
     select p.workspace_id, p.id, 'visitor' from core.principals as p
       join core.memberships as m on m.workspace_id = p.workspace_id and m.id = p.membership_id
       join core.identities as i on i.id = m.identity_id
      where i.provider_subject = 'us-new' and p.workspace_id = 'a0000000-0000-4000-8000-00000000000a' $$,
  'asigna el rol de la invitación');

select throws_ok(
  $$ insert into core.role_assignments (workspace_id, principal_id, role_code)
     values ('b0000000-0000-4000-8000-00000000000b', 'b2000000-0000-4000-8000-000000000001', 'admin') $$,
  '42501', null, 'no asigna roles en otro espacio');

select lives_ok(
  $$ update core.role_assignments set revoked_at = now() where workspace_id = 'a0000000-0000-4000-8000-00000000000a' and role_code = 'visitor' $$,
  'revoca una asignación abierta');

select results_eq(
  $$ with changed as (update core.role_assignments set revoked_at = null
       where workspace_id = 'a0000000-0000-4000-8000-00000000000a' returning 1) select count(*)::int from changed $$,
  $$ values (0) $$,
  'una asignación revocada no se reabre');

-- ---------------------------------------------------------------------------
-- Último acceso: cada miembro escribe solo el suyo
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into core.member_presence (workspace_id, membership_id)
     select m.workspace_id, m.id from core.memberships as m join core.identities as i on i.id = m.identity_id
      where i.provider_subject = 'us-new' and m.workspace_id = 'a0000000-0000-4000-8000-00000000000a' $$,
  'registra su propio acceso');

select throws_ok(
  $$ insert into core.member_presence (workspace_id, membership_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a1000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'no registra el acceso de otro miembro');

-- ---------------------------------------------------------------------------
-- Quitar: el Propietario revoca la membresía; nada se borra
-- ---------------------------------------------------------------------------

select set_config('platlab.auth_subject', 'us-owner-a', true);
select set_config('platlab.auth_email', '', true);

select lives_ok(
  $$ update core.memberships set status = 'revoked', revoked_at = now(), version = version + 1
      where workspace_id = 'a0000000-0000-4000-8000-00000000000a' and id <> 'a1000000-0000-4000-8000-000000000001' $$,
  'el runtime revoca una membresía de su espacio');

select throws_ok(
  $$ delete from core.role_assignments where workspace_id = 'a0000000-0000-4000-8000-00000000000a' $$,
  '42501', null, 'el runtime no borra asignaciones de rol');

select * from finish();
rollback;
