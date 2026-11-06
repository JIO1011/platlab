-- L-01d (ADR 0023, «Reglas de L-01d, reserva real»): lo apartado por los bloques bajo el rol de runtime. Un equipo
-- no está en dos bloques activos a la vez, liberado no cambia, las reservas de bloque son de su propósito y nada se
-- borra.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

grant usage on schema extensions to platlab_api;
grant platlab_api to postgres with set true, inherit false;

insert into platform.customer_accounts (id, legal_name)
values ('c0000000-0000-4000-8000-000000000001', 'Titular sintético');
insert into core.workspaces (id, customer_account_id, code, name, time_zone) values
  ('a0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000001', 'req-a', 'A', 'America/Guayaquil'),
  ('b0000000-0000-4000-8000-00000000000b', 'c0000000-0000-4000-8000-000000000001', 'req-b', 'B', 'America/Guayaquil');
insert into core.identities (id, provider, provider_subject, display_name) values
  ('10000000-0000-4000-8000-000000000001', 'supabase', 'req-a1', 'Docente A'),
  ('10000000-0000-4000-8000-000000000002', 'supabase', 'req-a2', 'Administradora A'),
  ('10000000-0000-4000-8000-000000000003', 'supabase', 'req-b1', 'Docente B');
insert into core.memberships (id, workspace_id, identity_id) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000001'),
  ('a1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000002'),
  ('b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-000000000003');
insert into core.principals (id, workspace_id, kind, membership_id) values
  ('a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'member', 'a1000000-0000-4000-8000-000000000001'),
  ('a2000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'member', 'a1000000-0000-4000-8000-000000000002'),
  ('b2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'member', 'b1000000-0000-4000-8000-000000000001');

create temp table sheet (layout jsonb) on commit drop;
insert into sheet values ('{
  "rows": [
    {"kind": "row", "fields": [{"key": "docente", "label": "Docente"}, {"key": "titulo", "label": "Título"}]},
    {"kind": "row", "fields": [{"key": "fecha", "label": "Fecha"}, {"key": "horario", "label": "Horario"},
                               {"key": "participantes", "label": "Nº alumnos"}]}
  ],
  "resources": [{"kind": "reagents", "label": "Reactivos"}],
  "equipmentCode": false,
  "notes": true,
  "signatures": [{"label": "Docente", "requester": true}]
}');

insert into labs.forms (id, workspace_id, name, created_by_principal_id) values
  ('a7000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'Práctica', 'a2000000-0000-4000-8000-000000000002'),
  ('b7000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'Práctica B', 'b2000000-0000-4000-8000-000000000001');
insert into labs.form_revisions (workspace_id, form_id, revision, title, layout, published_by_principal_id)
select 'a0000000-0000-4000-8000-00000000000a'::uuid, 'a7000000-0000-4000-8000-000000000001'::uuid, 1, 'Solicitud', layout,
       'a2000000-0000-4000-8000-000000000002'::uuid from sheet
union all
select 'b0000000-0000-4000-8000-00000000000b', 'b7000000-0000-4000-8000-000000000001', 1, 'Solicitud B', layout,
       'b2000000-0000-4000-8000-000000000001' from sheet;

insert into inventory.items (id, workspace_id, kind, code, name, base_unit) values
  ('a6000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'reagent', 'NACL', 'Cloruro de sodio', 'g'),
  ('b6000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'reagent', 'ETOH', 'Etanol', 'mL');
insert into reagents.products (workspace_id, item_id) values
  ('a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-00000000000b', 'b6000000-0000-4000-8000-000000000001');
insert into equipment.asset_types (id, workspace_id, name) values
  ('a5000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'Balanza');
insert into labs.list_values (id, workspace_id, kind, name, created_by_principal_id) values
  ('a4000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'subject', 'Química General',
   'a2000000-0000-4000-8000-000000000001'),
  ('a4000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'career', 'Bioquímica',
   'a2000000-0000-4000-8000-000000000001');


insert into core.locations (id, workspace_id, parent_id, kind, code, name) values
  ('a3000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', null, 'room', 'LAB-1', 'Laboratorio 1'),
  ('b3000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', null, 'room', 'LAB-B', 'Laboratorio B');
insert into labs.spaces (workspace_id, area_id, abbreviation, capacity, weekly_hours, created_by_principal_id) values
  ('a0000000-0000-4000-8000-00000000000a', 'a3000000-0000-4000-8000-000000000001', 'LUNO', 20,
   '{"1": [], "2": [], "3": [], "4": [], "5": [], "6": [], "7": []}', 'a2000000-0000-4000-8000-000000000002'),
  ('b0000000-0000-4000-8000-00000000000b', 'b3000000-0000-4000-8000-000000000001', 'LB', 10,
   '{"1": [], "2": [], "3": [], "4": [], "5": [], "6": [], "7": []}', 'b2000000-0000-4000-8000-000000000001');
insert into labs.periods (id, workspace_id, code, starts_on, ends_on, created_by_principal_id) values
  ('a9000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'P1', '2027-01-04', '2027-06-30',
   'a2000000-0000-4000-8000-000000000002');

-- Una solicitud enviada con dos fechas y un borrador.
insert into labs.requests (id, workspace_id, number, form_id, form_revision, requester_principal_id, title, teacher_name,
  dates, starts_at, ends_at, participants) values
  ('a8000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 1, 'a7000000-0000-4000-8000-000000000001', 1,
   'a2000000-0000-4000-8000-000000000001', 'Titulación', 'Docente A', '{2027-03-01,2027-03-08}', '08:00', '10:00', 20),
  ('a8000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 2, 'a7000000-0000-4000-8000-000000000001', 1,
   'a2000000-0000-4000-8000-000000000001', 'Borrador', 'Docente A', '{2027-03-01}', '08:00', '10:00', 20);
update labs.requests set status = 'submitted', submitted_at = now() where number = 1 and workspace_id = 'a0000000-0000-4000-8000-00000000000a';


insert into equipment.assets (id, workspace_id, type_id, code, name, location_id, created_by_principal_id) values
  ('a5100000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001',
   'BAL-01', 'Balanza', 'a3000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002');
insert into labs.activities (id, workspace_id, request_id, on_date, area_id, starts_at, ends_at, responsible_principal_id,
  period_id, week, sequence, code, created_by_principal_id) values
  ('a6100000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a8000000-0000-4000-8000-000000000001',
   '2027-03-01', 'a3000000-0000-4000-8000-000000000001', '08:00', '10:00', 'a2000000-0000-4000-8000-000000000002',
   'a9000000-0000-4000-8000-000000000001', 9, 1, 'P1-S9-LUNO01', 'a2000000-0000-4000-8000-000000000002'),
  ('a6100000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'a8000000-0000-4000-8000-000000000001',
   '2027-03-08', 'a3000000-0000-4000-8000-000000000001', '08:00', '10:00', 'a2000000-0000-4000-8000-000000000002',
   'a9000000-0000-4000-8000-000000000001', 10, 1, 'P1-S10-LUNO01', 'a2000000-0000-4000-8000-000000000002');

set local role platlab_api;
select set_config('platlab.workspace_id', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config('platlab.principal_id', 'a2000000-0000-4000-8000-000000000002', true);

select lives_ok(
  $$ insert into labs.activity_assets (workspace_id, activity_id, line, asset_id, during)
     values ('a0000000-0000-4000-8000-00000000000a', 'a6100000-0000-4000-8000-000000000001', 1,
             'a5100000-0000-4000-8000-000000000001', tsrange('2027-03-01 08:00', '2027-03-01 10:00')) $$,
  'un bloque aparta un equipo en su franja');
select throws_ok(
  $$ insert into labs.activity_assets (workspace_id, activity_id, line, asset_id, during)
     values ('a0000000-0000-4000-8000-00000000000a', 'a6100000-0000-4000-8000-000000000002', 1,
             'a5100000-0000-4000-8000-000000000001', tsrange('2027-03-01 09:00', '2027-03-01 11:00')) $$,
  '23P01', null, 'el mismo equipo no está en dos bloques a la vez');
select lives_ok(
  $$ insert into labs.activity_assets (workspace_id, activity_id, line, asset_id, during)
     values ('a0000000-0000-4000-8000-00000000000a', 'a6100000-0000-4000-8000-000000000002', 1,
             'a5100000-0000-4000-8000-000000000001', tsrange('2027-03-01 09:00', '2027-03-01 11:00'))
     on conflict do nothing $$,
  'ocupado, ON CONFLICT DO NOTHING no falla: el comando prueba el siguiente equipo');
select is((select count(*) from labs.activity_assets where released_at is null)::int, 1, 'y no lo aparta');
select lives_ok(
  $$ update labs.activity_assets set released_at = now() where activity_id = 'a6100000-0000-4000-8000-000000000001' $$,
  'se libera');
select throws_ok(
  $$ update labs.activity_assets set released_at = null where activity_id = 'a6100000-0000-4000-8000-000000000001' $$,
  '23514', null, 'liberado, no vuelve');
select ok(
  not has_column_privilege('platlab_api', 'labs.activity_assets', 'during', 'UPDATE')
  and not has_table_privilege('platlab_api', 'labs.activity_assets', 'DELETE')
  and not has_table_privilege('platlab_api', 'labs.activity_allocations', 'DELETE')
  and not has_table_privilege('platlab_api', 'labs.activity_allocations', 'UPDATE'),
  'la franja no se edita y nada se borra');
select throws_ok(
  $$ insert into inventory.allocations (workspace_id, position_id, quantity, reason, destination, requested_by_principal_id, purpose)
     values ('a0000000-0000-4000-8000-00000000000a', gen_random_uuid(), 1, 'x', 'y', 'a2000000-0000-4000-8000-000000000002', 'otro') $$,
  '23514', null, 'una reserva es una salida o lo apartado para un bloque');

reset role;
select is((select count(*) from labs.activity_assets where released_at is null and workspace_id = 'a0000000-0000-4000-8000-00000000000a')::int, 0, 'sin equipos apartados al final');

select * from finish();
rollback;
