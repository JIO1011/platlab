-- E-01b (ADR 0019): fallas en la capacidad incidencias bajo el rol de runtime. Aislamiento y FK tipada,
-- autoría propia, cada estado con sus datos, avance sin retroceso, cerrada definitiva y nada se borra.
begin;
create extension if not exists pgtap with schema extensions;

select plan(15);

grant usage on schema extensions to platlab_api;
grant platlab_api to postgres with set true, inherit false;

insert into platform.customer_accounts (id, legal_name)
values ('c0000000-0000-4000-8000-000000000001', 'Titular sintético');
insert into core.workspaces (id, customer_account_id, code, name, time_zone) values
  ('a0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000001', 'fa-a', 'A', 'America/Guayaquil'),
  ('b0000000-0000-4000-8000-00000000000b', 'c0000000-0000-4000-8000-000000000001', 'fa-b', 'B', 'America/Guayaquil');
insert into core.identities (id, provider, provider_subject, display_name) values
  ('10000000-0000-4000-8000-000000000001', 'supabase', 'fa-a1', 'Operador A'),
  ('10000000-0000-4000-8000-000000000002', 'supabase', 'fa-a2', 'Docente A'),
  ('10000000-0000-4000-8000-000000000003', 'supabase', 'fa-b1', 'Operador B');
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
  ('b4000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'Balanza');
insert into equipment.assets (id, workspace_id, type_id, code, name, location_id, created_by_principal_id) values
  ('a5000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a4000000-0000-4000-8000-000000000001',
   'CEN-01', 'Centrífuga', 'a3000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001'),
  ('b5000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'b4000000-0000-4000-8000-000000000001',
   'BAL-01', 'Balanza', 'b3000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000001');
-- Una falla de B, escrita como propietario para probar que A no la alcanza.
insert into incidents.cases (id, workspace_id, module_code, asset_id, fault_type, description, usable, reported_by_principal_id) values
  ('bc000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'equipment', 'b5000000-0000-4000-8000-000000000001',
   'electrical', 'No enciende', false, 'b2000000-0000-4000-8000-000000000001');

set local role platlab_api;
select set_config('platlab.workspace_id', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config('platlab.principal_id', 'a2000000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$ insert into incidents.cases (workspace_id, module_code, asset_id, fault_type, description, usable, reported_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'equipment',
             'a5000000-0000-4000-8000-000000000001', 'mechanical', 'Vibra al girar', false, 'a2000000-0000-4000-8000-000000000002') $$,
  'quien reporta registra una falla abierta del espacio');

select throws_ok(
  $$ insert into incidents.cases (workspace_id, module_code, asset_id, fault_type, description, usable, reported_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'equipment', 'a5000000-0000-4000-8000-000000000001', 'other', 'Otra',
             true, 'a2000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'la autoría del reporte es del principal del contexto');

select throws_ok(
  $$ insert into incidents.cases (workspace_id, module_code, asset_id, fault_type, description, usable, reported_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'equipment', 'b5000000-0000-4000-8000-000000000001', 'other', 'Ajena',
             true, 'a2000000-0000-4000-8000-000000000002') $$,
  '23503', null, 'una falla no apunta al equipo de otro espacio');

select throws_ok(
  $$ insert into incidents.cases (workspace_id, module_code, fault_type, description, usable, reported_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'equipment', 'other', 'Sin equipo', true, 'a2000000-0000-4000-8000-000000000002') $$,
  '23514', null, 'una falla de Equipos exige su equipo (FK tipada)');

select is((select count(*)::int from incidents.cases), 1, 'RLS: el runtime solo ve las fallas de su espacio');

select throws_ok(
  $$ update incidents.cases set status = 'in_progress' where id = (select id from incidents.cases where description = 'Vibra al girar') $$,
  '23514', null, 'en atención exige quién la atiende');

select set_config('platlab.principal_id', 'a2000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ update incidents.cases set status = 'in_progress', attended_by_principal_id = 'a2000000-0000-4000-8000-000000000001',
            attended_at = now() where id = (select id from incidents.cases where description = 'Vibra al girar') $$,
  'la falla pasa a en atención con quien la toma');

select throws_ok(
  $$ update incidents.cases set status = 'resolved', resolved_by_principal_id = 'a2000000-0000-4000-8000-000000000001',
            resolved_at = now() where id = (select id from incidents.cases where description = 'Vibra al girar') $$,
  '23514', null, 'resolver exige un resultado');

select lives_ok(
  $$ update incidents.cases set status = 'resolved', resolution = 'Cambio de rodamiento', resolved_by_principal_id = 'a2000000-0000-4000-8000-000000000001',
            resolved_at = now() where id = (select id from incidents.cases where description = 'Vibra al girar') $$,
  'la falla se resuelve con su resultado');

select throws_ok(
  $$ update incidents.cases set status = 'in_progress', resolution = null, resolved_by_principal_id = null, resolved_at = null
      where id = (select id from incidents.cases where description = 'Vibra al girar') $$,
  '23514', null, 'una falla no vuelve a un estado anterior');

select throws_ok(
  $$ update incidents.cases set description = 'Otra cosa' where id = (select id from incidents.cases where description = 'Vibra al girar') $$,
  '42501', null, 'lo reportado no se edita');

select lives_ok(
  $$ update incidents.cases set status = 'closed', closed_by_principal_id = 'a2000000-0000-4000-8000-000000000001', closed_at = now()
      where id = (select id from incidents.cases where description = 'Vibra al girar') $$,
  'la falla resuelta se cierra');

select throws_ok(
  $$ update incidents.cases set version = version + 1 where id = (select id from incidents.cases where description = 'Vibra al girar') $$,
  '23514', null, 'una falla cerrada no se modifica');

select throws_ok(
  $$ delete from incidents.cases where id = (select id from incidents.cases where description = 'Vibra al girar') $$,
  '42501', null, 'nadie borra una falla');

select throws_ok(
  $$ insert into equipment.condition_changes (workspace_id, asset_id, from_condition, to_condition, reason, actor_principal_id, case_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'operational', 'faulted', 'Falla',
             'a2000000-0000-4000-8000-000000000001', 'bc000000-0000-4000-8000-000000000001') $$,
  '23503', null, 'el historial de condición no apunta a una falla de otro espacio');

select * from finish();
rollback;
