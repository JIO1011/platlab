-- L-01c (ADR 0023, «Reglas y diseño de L-01c»): bloques del Cronograma bajo el rol de runtime. Solo se programa una
-- fecha de una solicitud enviada, un bloque por fecha, sin choques en el área ([inicio, fin)), códigos con su forma,
-- bloque liberado inmutable, historial de códigos que solo crece y nada se borra.
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

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
update labs.requests set status = 'submitted', submitted_at = now() where number = 1;

-- Bajo el runtime, como la Administradora de A.
set local role platlab_api;
select set_config('platlab.workspace_id', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config('platlab.principal_id', 'a2000000-0000-4000-8000-000000000002', true);

create function pg_temp.place(request uuid, day date, starts time, ends time, seq integer) returns void language sql as $$
  insert into labs.activities (workspace_id, request_id, on_date, area_id, starts_at, ends_at, responsible_principal_id,
    period_id, week, sequence, code, created_by_principal_id)
  values ('a0000000-0000-4000-8000-00000000000a', request, day, 'a3000000-0000-4000-8000-000000000001', starts, ends,
    'a2000000-0000-4000-8000-000000000002', 'a9000000-0000-4000-8000-000000000001', 9, seq, 'P1-S9-LUNO' || lpad(seq::text, 2, '0'),
    'a2000000-0000-4000-8000-000000000002')
$$;

select lives_ok($$ select pg_temp.place('a8000000-0000-4000-8000-000000000001', '2027-03-01', '08:00', '10:00', 1) $$,
  'se programa una fecha de una solicitud enviada');
select throws_ok($$ select pg_temp.place('a8000000-0000-4000-8000-000000000001', '2027-03-01', '11:00', '12:00', 2) $$,
  '23505', null, 'cada fecha tiene un solo bloque activo');
select throws_ok($$ select pg_temp.place('a8000000-0000-4000-8000-000000000001', '2027-03-02', '11:00', '12:00', 2) $$,
  '23514', null, 'solo una fecha de la solicitud');
select throws_ok($$ select pg_temp.place('a8000000-0000-4000-8000-000000000002', '2027-03-01', '11:00', '12:00', 2) $$,
  '23514', null, 'un borrador no se programa');

-- Otra solicitud enviada el mismo día y área: [inicio, fin).
reset role;
insert into labs.requests (id, workspace_id, number, form_id, form_revision, requester_principal_id, title, teacher_name,
  dates, starts_at, ends_at, participants, status, submitted_at) values
  ('a8000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-00000000000a', 3, 'a7000000-0000-4000-8000-000000000001', 1,
   'a2000000-0000-4000-8000-000000000001', 'Otra', 'Docente A', '{2027-03-01}', '09:00', '11:00', 10, 'draft', null);
update labs.requests set status = 'submitted', submitted_at = now() where number = 3;
set local role platlab_api;
select throws_ok($$ select pg_temp.place('a8000000-0000-4000-8000-000000000003', '2027-03-01', '09:00', '11:00', 2) $$,
  '23P01', null, 'dos bloques activos no se cruzan en el área');
select lives_ok($$ select pg_temp.place('a8000000-0000-4000-8000-000000000003', '2027-03-01', '10:00', '11:00', 2) $$,
  'uno empieza cuando el otro termina');
select throws_ok(
  $$ update labs.activities set code = 'P1-S9-luno03' where sequence = 2 $$, '23514', null, 'el código tiene su forma');
select throws_ok(
  $$ update labs.activities set on_date = '2027-03-08' where sequence = 1 $$, '42501', null, 'la fecha no cambia: es pedir cambios');

-- Liberado, el lugar queda libre y el bloque no cambia.
select lives_ok($$ update labs.activities set cancelled_at = now() where sequence = 2 $$, 'se libera');
select throws_ok($$ update labs.activities set starts_at = '10:30' where sequence = 2 $$, '23514', null, 'liberado, no cambia');
select lives_ok($$ select pg_temp.place('a8000000-0000-4000-8000-000000000003', '2027-03-01', '10:00', '11:00', 3) $$,
  'el lugar liberado se vuelve a programar');

select is((select count(*) from labs.activities)::int, 3, 'solo ve los bloques de su espacio');
select ok(
  not has_table_privilege('platlab_api', 'labs.activities', 'DELETE')
  and not has_table_privilege('platlab_api', 'labs.activity_codes', 'DELETE')
  and not has_table_privilege('platlab_api', 'labs.activity_codes', 'UPDATE'),
  'nada se borra y el historial de códigos solo crece');

reset role;
select ok(
  exists (select 1 from core.role_permissions where role_code = 'operator' and permission_code = 'labs.schedule.lead')
  and not exists (select 1 from core.role_permissions where role_code in ('operator', 'teacher') and permission_code = 'labs.schedule.manage'),
  'el Operador lleva bloques; solo el Administrador programa');

select * from finish();
rollback;
