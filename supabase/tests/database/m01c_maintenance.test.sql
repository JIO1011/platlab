-- M-01c (ADR 0020): requisito del plan, la fecha que tocaba del registro y el descarte de «Evaluar reemplazo»,
-- bajo el rol de runtime. El directorio de Equipos deja leer los datos de compra; el descarte es del
-- Administrador, de su espacio, a su nombre, uno por día y sin edición.
begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

grant usage on schema extensions to platlab_api;
grant platlab_api to postgres with set true, inherit false;

-- ---------------------------------------------------------------------------
-- Fixtures sintéticos. A: una centrífuga con datos de compra y un plan; B: su centrífuga.
-- ---------------------------------------------------------------------------

insert into platform.customer_accounts (id, legal_name)
values ('c0000000-0000-4000-8000-000000000001', 'Titular sintético');
insert into core.workspaces (id, customer_account_id, code, name, time_zone) values
  ('a0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000001', 'mnt-a', 'A', 'America/Guayaquil'),
  ('b0000000-0000-4000-8000-00000000000b', 'c0000000-0000-4000-8000-000000000001', 'mnt-b', 'B', 'America/Guayaquil');
insert into core.identities (id, provider, provider_subject, display_name) values
  ('10000000-0000-4000-8000-000000000001', 'supabase', 'mnt-a1', 'Administradora A'),
  ('10000000-0000-4000-8000-000000000002', 'supabase', 'mnt-a2', 'Operador A'),
  ('10000000-0000-4000-8000-000000000003', 'supabase', 'mnt-b1', 'Administradora B');
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
  ('b3000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', null, 'room', 'LAB-B', 'Laboratorio B');
insert into equipment.asset_types (id, workspace_id, name) values
  ('a4000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'Centrífuga'),
  ('b4000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'Centrífuga');
insert into equipment.assets
  (id, workspace_id, type_id, code, name, location_id, condition, acquired_on, useful_life_years, replacement_value, created_by_principal_id)
values
  ('a5000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a4000000-0000-4000-8000-000000000001', 'CEN-01',
   'Centrífuga 1', 'a3000000-0000-4000-8000-000000000001', 'operational', '2015-03-01', 10, 2000, 'a2000000-0000-4000-8000-000000000001'),
  ('b5000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'b4000000-0000-4000-8000-000000000001', 'CEN-01',
   'Centrífuga de B', 'b3000000-0000-4000-8000-000000000001', 'operational', null, null, null, 'b2000000-0000-4000-8000-000000000001');
insert into maintenance.plans
  (id, workspace_id, kind, title, asset_type_id, interval_count, interval_unit, starts_on, created_by_principal_id)
values
  ('a7000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'preventive', 'Preventivo anual',
   'a4000000-0000-4000-8000-000000000001', 1, 'year', '2026-01-15', 'a2000000-0000-4000-8000-000000000001');

select is(
  (select array_agg(role_code::text order by role_code) from core.role_permissions
    where permission_code = 'maintenance.replacement.review'),
  array['admin'], 'descartar «Evaluar reemplazo» es solo del Administrador');

set local role platlab_api;
select set_config('platlab.workspace_id', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config('platlab.principal_id', 'a2000000-0000-4000-8000-000000000001', true);

select is(
  (select (acquired_on, useful_life_years, replacement_value)::text from equipment.asset_directory
    where id = 'a5000000-0000-4000-8000-000000000001'),
  '(2015-03-01,10,2000.00)', 'el directorio de Equipos deja leer la compra, la vida útil y el valor de reposición');

-- ---------------------------------------------------------------------------
-- Requisito del plan: opcional, con texto
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into maintenance.plans
       (workspace_id, kind, title, asset_type_id, interval_count, interval_unit, starts_on, requirement, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'calibration', 'Calibración', 'a4000000-0000-4000-8000-000000000001', 1, 'year',
             '2026-01-15', 'ISO/IEC 17025 6.4.10', 'a2000000-0000-4000-8000-000000000001') $$,
  'el runtime crea un plan con su requisito');

select throws_ok(
  $$ update maintenance.plans set requirement = '  ' where id = 'a7000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'el requisito no queda en blanco');

update maintenance.plans set requirement = 'ISO 9001 7.1.5' where id = 'a7000000-0000-4000-8000-000000000001';
select is(
  (select requirement from maintenance.plans where id = 'a7000000-0000-4000-8000-000000000001'),
  'ISO 9001 7.1.5', 'el runtime cambia el requisito de un plan');

-- ---------------------------------------------------------------------------
-- La fecha que tocaba: solo con plan
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into maintenance.records
       (workspace_id, asset_id, plan_id, plan_version, kind, performed_on, result, due_on, recorded_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000001', 1,
             'preventive', '2026-01-10', 'pass', '2026-01-15', 'a2000000-0000-4000-8000-000000000001') $$,
  'un registro con plan guarda la fecha que tocaba');

select throws_ok(
  $$ insert into maintenance.records (workspace_id, asset_id, kind, performed_on, result, due_on, recorded_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'cleaning', '2026-01-10', 'pass',
             '2026-01-15', 'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'un registro sin plan no tiene fecha que tocaba');

select throws_ok(
  $$ update maintenance.records set due_on = '2026-02-15' where plan_id = 'a7000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'la fecha que tocaba no se edita');

-- ---------------------------------------------------------------------------
-- Descarte de «Evaluar reemplazo»: con motivo, a nombre de quien descarta, uno por día y sin edición
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into maintenance.replacement_reviews (workspace_id, asset_id, reason, dismissed_until, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'Se cambia el próximo año',
             '2027-04-18', 'a2000000-0000-4000-8000-000000000001') $$,
  'el runtime descarta el aviso de un equipo con motivo');

select throws_ok(
  $$ insert into maintenance.replacement_reviews (workspace_id, asset_id, reason, dismissed_until, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'Otra vez',
             '2027-04-18', 'a2000000-0000-4000-8000-000000000001') $$,
  '23505', null, 'descartar dos veces el mismo día no suma otro descarte');

select throws_ok(
  $$ insert into maintenance.replacement_reviews (workspace_id, asset_id, reason, dismissed_until, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', '', '2027-05-18',
             'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'el descarte lleva motivo');

select throws_ok(
  $$ insert into maintenance.replacement_reviews (workspace_id, asset_id, reason, dismissed_until, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'Ajeno', '2027-05-18',
             'a2000000-0000-4000-8000-000000000002') $$,
  '42501', null, 'el descarte va a nombre de quien lo hace');

select throws_ok(
  $$ insert into maintenance.replacement_reviews (workspace_id, asset_id, reason, dismissed_until, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'b5000000-0000-4000-8000-000000000001', 'Equipo de B', '2027-05-18',
             'a2000000-0000-4000-8000-000000000001') $$,
  '23503', null, 'no se descarta un equipo de otro espacio');

select throws_ok(
  $$ update maintenance.replacement_reviews set reason = 'Cambiado' $$,
  '42501', null, 'el descarte no se edita');

select throws_ok(
  $$ delete from maintenance.replacement_reviews $$,
  '42501', null, 'el descarte no se borra');

-- ---------------------------------------------------------------------------
-- Aislamiento: B no ve ni escribe los descartes de A
-- ---------------------------------------------------------------------------

select set_config('platlab.workspace_id', 'b0000000-0000-4000-8000-00000000000b', true);
select set_config('platlab.principal_id', 'b2000000-0000-4000-8000-000000000001', true);

select is((select count(*)::int from maintenance.replacement_reviews), 0, 'B no ve los descartes de A');

select throws_ok(
  $$ insert into maintenance.replacement_reviews (workspace_id, asset_id, reason, dismissed_until, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'Desde B', '2027-06-18',
             'b2000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'B no descarta en A');

select * from finish();
rollback;
