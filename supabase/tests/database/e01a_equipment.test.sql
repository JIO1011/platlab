-- E-01a (ADR 0019): equipos con su ficha, condición e historial bajo el rol de runtime. Aislamiento
-- por espacio y FKs compuestas, autoría propia, historial inmutable, baja definitiva y reglas de la ficha.
begin;
create extension if not exists pgtap with schema extensions;

select plan(19);

grant usage on schema extensions to platlab_api;
grant platlab_api to postgres with set true, inherit false;

-- ---------------------------------------------------------------------------
-- Fixtures sintéticos: A con dos miembros, dos ubicaciones y un tipo; B con su propio equipo
-- ---------------------------------------------------------------------------

insert into platform.customer_accounts (id, legal_name)
values ('c0000000-0000-4000-8000-000000000001', 'Titular sintético');
insert into core.workspaces (id, customer_account_id, code, name, time_zone) values
  ('a0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000001', 'eq-a', 'A', 'America/Guayaquil'),
  ('b0000000-0000-4000-8000-00000000000b', 'c0000000-0000-4000-8000-000000000001', 'eq-b', 'B', 'America/Guayaquil');
insert into core.identities (id, provider, provider_subject, display_name) values
  ('10000000-0000-4000-8000-000000000001', 'supabase', 'eq-a1', 'Administradora A'),
  ('10000000-0000-4000-8000-000000000002', 'supabase', 'eq-a2', 'Operador A'),
  ('10000000-0000-4000-8000-000000000003', 'supabase', 'eq-b1', 'Administradora B');
insert into core.memberships (id, workspace_id, identity_id) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000001'),
  ('a1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000002'),
  ('b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-000000000003');
insert into core.principals (id, workspace_id, kind, membership_id) values
  ('a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'member', 'a1000000-0000-4000-8000-000000000001'),
  ('a2000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'member', 'a1000000-0000-4000-8000-000000000002'),
  ('b2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'member', 'b1000000-0000-4000-8000-000000000001');
insert into core.locations (id, workspace_id, parent_id, kind, code, name) values
  ('a3000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', null, 'room', 'LAB-1', 'Laboratorio 1'),
  ('a3000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', null, 'room', 'LAB-2', 'Laboratorio 2'),
  ('b3000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', null, 'room', 'LAB-B', 'Laboratorio B');
insert into equipment.asset_types (id, workspace_id, name) values
  ('a4000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'Centrífuga'),
  ('b4000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'Balanza');
-- Un equipo de B, escrito como propietario para probar que A no lo alcanza.
insert into equipment.assets (id, workspace_id, type_id, code, name, location_id, created_by_principal_id) values
  ('b5000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'b4000000-0000-4000-8000-000000000001',
   'BAL-01', 'Balanza analítica', 'b3000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000001');

set local role platlab_api;
select set_config('platlab.workspace_id', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config('platlab.principal_id', 'a2000000-0000-4000-8000-000000000001', true);

-- ---------------------------------------------------------------------------
-- Alta: espacio, autoría, FKs compuestas y código único
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into equipment.assets (workspace_id, type_id, code, name, location_id, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a4000000-0000-4000-8000-000000000001',
             'CEN-01', 'Centrífuga refrigerada', 'a3000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001') $$,
  'el runtime da de alta un equipo del espacio');

select throws_ok(
  $$ insert into equipment.assets (workspace_id, type_id, code, name, location_id, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a4000000-0000-4000-8000-000000000001',
             'CEN-02', 'Centrífuga', 'a3000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002') $$,
  '42501', null, 'la autoría del alta es del principal del contexto');

select throws_ok(
  $$ insert into equipment.assets (workspace_id, type_id, code, name, location_id, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a4000000-0000-4000-8000-000000000001',
             'CEN-03', 'Centrífuga', 'b3000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001') $$,
  '23503', null, 'un equipo no se ubica en un lugar de otro espacio');

select throws_ok(
  $$ insert into equipment.assets (workspace_id, type_id, code, name, location_id, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'b4000000-0000-4000-8000-000000000001',
             'CEN-04', 'Centrífuga', 'a3000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001') $$,
  '23503', null, 'un equipo no usa el tipo de otro espacio');

select throws_ok(
  $$ insert into equipment.assets (workspace_id, type_id, code, name, location_id, condition, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a4000000-0000-4000-8000-000000000001',
             'CEN-05', 'Centrífuga', 'a3000000-0000-4000-8000-000000000001', 'retired', 'a2000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'un alta nunca nace dada de baja');

select throws_ok(
  $$ insert into equipment.assets (workspace_id, type_id, code, name, location_id, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a4000000-0000-4000-8000-000000000001',
             'cen-01', 'Otra centrífuga', 'a3000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001') $$,
  '23505', null, 'el código es único en el espacio sin distinguir mayúsculas');

select throws_ok(
  $$ insert into equipment.assets (workspace_id, type_id, code, name, location_id, acquired_on, warranty_until, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a4000000-0000-4000-8000-000000000001',
             'CEN-06', 'Centrífuga', 'a3000000-0000-4000-8000-000000000001', '2026-05-01', '2026-04-01',
             'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'la garantía no termina antes de la compra');

select throws_ok(
  $$ insert into equipment.asset_types (workspace_id, name) values ('a0000000-0000-4000-8000-00000000000a', '  centrifuga ') $$,
  '23505', null, 'un tipo activo no se repite sin tildes, mayúsculas ni espacios de más');

select is(
  (select count(*)::int from equipment.assets),
  1,
  'RLS: el runtime solo ve los equipos de su espacio');

-- ---------------------------------------------------------------------------
-- Historial: reglas del cambio de condición y del traslado; nada se edita ni se borra
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ insert into equipment.condition_changes (workspace_id, asset_id, from_condition, to_condition, reason, actor_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', (select id from equipment.assets where code = 'CEN-01'), 'faulted', 'operational',
             'Reparada', 'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'volver a operativo exige un resultado');

select lives_ok(
  $$ insert into equipment.condition_changes (workspace_id, asset_id, from_condition, to_condition, reason, actor_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', (select id from equipment.assets where code = 'CEN-01'), 'operational', 'faulted',
             'No enciende', 'a2000000-0000-4000-8000-000000000001') $$,
  'un cambio de condición se registra con motivo');

select throws_ok(
  $$ update equipment.condition_changes set reason = 'Otro motivo' $$,
  '42501', null, 'el historial de condición no se edita');

select throws_ok(
  $$ insert into equipment.location_changes (workspace_id, asset_id, from_location_id, to_location_id, actor_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', (select id from equipment.assets where code = 'CEN-01'),
             'a3000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001',
             'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'un traslado cambia de ubicación');

select throws_ok(
  $$ delete from equipment.assets where id = (select id from equipment.assets where code = 'CEN-01') $$,
  '42501', null, 'nadie borra un equipo: se da de baja');

select throws_ok(
  $$ update equipment.assets set created_by_principal_id = 'a2000000-0000-4000-8000-000000000002'
      where id = (select id from equipment.assets where code = 'CEN-01') $$,
  '42501', null, 'la autoría del alta no se cambia');

-- ---------------------------------------------------------------------------
-- Foto: la ruta es la del espacio y el id; el equipo solo apunta a una foto suya
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ insert into equipment.asset_photos (id, workspace_id, asset_id, object_path, url, content_type, byte_size, sha256, uploaded_by_principal_id)
     values ('a6000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', (select id from equipment.assets where code = 'CEN-01'),
             'b0000000-0000-4000-8000-00000000000b/equipment/a6000000-0000-4000-8000-000000000001.png',
             'https://ejemplo.org/x.png', 'image/png', 1024, repeat('a', 64), 'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'la ruta de la foto es la del espacio, el id y su tipo');

select throws_ok(
  $$ update equipment.assets set photo_id = 'bd000000-0000-4000-8000-000000000001'
      where id = (select id from equipment.assets where code = 'CEN-01') $$,
  '23503', null, 'un equipo no apunta a una foto que no es suya');

-- ---------------------------------------------------------------------------
-- Baja definitiva
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ update equipment.assets set condition = 'retired', version = version + 1
      where id = (select id from equipment.assets where code = 'CEN-01') $$,
  'el equipo se da de baja');

select throws_ok(
  $$ update equipment.assets set name = 'Centrífuga reparada' where id = (select id from equipment.assets where code = 'CEN-01') $$,
  '23514', null, 'un equipo dado de baja no se modifica');

select * from finish();
rollback;
