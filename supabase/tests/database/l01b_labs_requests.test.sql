-- L-01b (ADR 0023, «Diseño de L-01b»): Solicitudes de Laboratorios bajo el rol de runtime. Aislamiento por
-- espacio, autoría propia, número único, formas de las líneas, enviada completa, recursos fijos una vez enviada,
-- estados finales, historial con motivo y sin DELETE salvo las líneas de lo que se edita.
begin;
create extension if not exists pgtap with schema extensions;

select plan(38);

grant usage on schema extensions to platlab_api;
grant platlab_api to postgres with set true, inherit false;

-- ---------------------------------------------------------------------------
-- Fixtures sintéticos: A con su formato, un reactivo, un tipo de equipo, una asignatura y una carrera; B con
-- su formato, su reactivo y una solicitud.
-- ---------------------------------------------------------------------------

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

insert into labs.requests (id, workspace_id, number, form_id, form_revision, requester_principal_id) values
  ('b8000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 1,
   'b7000000-0000-4000-8000-000000000001', 1, 'b2000000-0000-4000-8000-000000000001');

-- ---------------------------------------------------------------------------
-- Fechas sueltas: en orden, sin repetirse y hasta 20
-- ---------------------------------------------------------------------------

select ok(labs.request_dates_valid('{}'), 'un borrador puede no tener fechas');
select ok(labs.request_dates_valid('{2027-03-01,2027-03-08}'), 'fechas en orden');
select ok(not labs.request_dates_valid('{2027-03-08,2027-03-01}'), 'fechas desordenadas: no');
select ok(not labs.request_dates_valid('{2027-03-01,2027-03-01}'), 'una fecha repetida: no');
select ok(not labs.request_dates_valid(
  array(select '2027-01-01'::date + n from generate_series(0, 20) as n)), 'más de 20 fechas: no');

-- Membrete: logo subido (o ninguno) y hasta tres líneas.
select ok(labs.form_header_valid('{"logoUrl": null, "lines": ["Universidad Demo", "Facultad de Ciencias"]}')
          and labs.form_header_valid(null), 'un membrete con líneas, o ninguno');
select ok(not labs.form_header_valid('{"logoUrl": "javascript:alert(1)", "lines": []}')
          and not labs.form_header_valid('{"logoUrl": null, "lines": ["a", "b", "c", "d"]}')
          and not labs.form_header_valid('{"logoUrl": null, "lines": [], "color": "red"}'),
  'el logo es un enlace, a lo sumo tres líneas y nada más');

-- ---------------------------------------------------------------------------
-- Bajo el runtime, como la Docente de A
-- ---------------------------------------------------------------------------

set local role platlab_api;
select set_config('platlab.workspace_id', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config('platlab.principal_id', 'a2000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ insert into labs.request_counters (workspace_id, last_number) values ('a0000000-0000-4000-8000-00000000000a', 1)
     on conflict (workspace_id) do update set last_number = labs.request_counters.last_number + 1 $$,
  'el contador del espacio arranca en 1');

select lives_ok(
  $$ insert into labs.requests (workspace_id, number, form_id, form_revision, requester_principal_id, subject_id, career_id)
     values ('a0000000-0000-4000-8000-00000000000a', 1, 'a7000000-0000-4000-8000-000000000001', 1,
             'a2000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001',
             'a4000000-0000-4000-8000-000000000002') $$,
  'la Docente guarda un borrador a su nombre');

select throws_ok(
  $$ insert into labs.requests (workspace_id, number, form_id, form_revision, requester_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 2, 'a7000000-0000-4000-8000-000000000001', 1,
             'a2000000-0000-4000-8000-000000000002') $$,
  '42501', null, 'no pide a nombre de otra persona');

select throws_ok(
  $$ insert into labs.requests (workspace_id, number, form_id, form_revision, requester_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 1, 'a7000000-0000-4000-8000-000000000001', 1,
             'a2000000-0000-4000-8000-000000000001') $$,
  '23505', null, 'el número no se repite en el espacio');

select throws_ok(
  $$ insert into labs.requests (workspace_id, number, form_id, form_revision, requester_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 3, 'b7000000-0000-4000-8000-000000000001', 1,
             'a2000000-0000-4000-8000-000000000001') $$,
  '23503', null, 'no llena un formato de otro espacio');

select throws_ok(
  $$ insert into labs.requests (workspace_id, number, form_id, form_revision, requester_principal_id, subject_id)
     values ('a0000000-0000-4000-8000-00000000000a', 4, 'a7000000-0000-4000-8000-000000000001', 1,
             'a2000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000002') $$,
  '23503', null, 'una carrera no va como asignatura');

select throws_ok(
  $$ insert into labs.requests (workspace_id, number, form_id, form_revision, requester_principal_id, starts_at, ends_at)
     values ('a0000000-0000-4000-8000-00000000000a', 5, 'a7000000-0000-4000-8000-000000000001', 1,
             'a2000000-0000-4000-8000-000000000001', '10:00', '09:00') $$,
  '23514', null, 'el horario termina después de empezar');

select throws_ok(
  $$ update labs.requests set status = 'submitted', submitted_at = now() where number = 1 $$,
  '23514', null, 'una solicitud incompleta no se envía');

-- Líneas del borrador.
select lives_ok(
  $$ insert into labs.request_lines (workspace_id, request_id, line, kind, item_id, quantity, unit)
     select 'a0000000-0000-4000-8000-00000000000a', id, 1, 'reagent', 'a6000000-0000-4000-8000-000000000001', 12.5, 'g'
     from labs.requests where number = 1 $$,
  'un reactivo del catálogo, en total y con su unidad');
select lives_ok(
  $$ insert into labs.request_lines (workspace_id, request_id, line, kind, asset_type_id, quantity, per_group)
     select 'a0000000-0000-4000-8000-00000000000a', id, 2, 'equipment', 'a5000000-0000-4000-8000-000000000001', 8, 2
     from labs.requests where number = 1 $$,
  'equipos por tipo, por grupo y total');
select lives_ok(
  $$ insert into labs.request_lines (workspace_id, request_id, line, kind, description, quantity)
     select 'a0000000-0000-4000-8000-00000000000a', id, 3, 'material', 'Pipetas de 10 mL', 4
     from labs.requests where number = 1 $$,
  'un material en texto con cantidad');
select throws_ok(
  $$ insert into labs.request_lines (workspace_id, request_id, line, kind, item_id, description, quantity, unit)
     select 'a0000000-0000-4000-8000-00000000000a', id, 4, 'reagent', 'a6000000-0000-4000-8000-000000000001', 'Sal', 1, 'g'
     from labs.requests where number = 1 $$,
  '23514', null, 'un reactivo es del catálogo o no catalogado, no ambos');
select throws_ok(
  $$ insert into labs.request_lines (workspace_id, request_id, line, kind, item_id, quantity)
     select 'a0000000-0000-4000-8000-00000000000a', id, 4, 'reagent', 'a6000000-0000-4000-8000-000000000001', 1
     from labs.requests where number = 1 $$,
  '23514', null, 'un reactivo lleva su unidad');
select throws_ok(
  $$ insert into labs.request_lines (workspace_id, request_id, line, kind, description, quantity)
     select 'a0000000-0000-4000-8000-00000000000a', id, 4, 'equipment', 'Centrífuga', 1.5
     from labs.requests where number = 1 $$,
  '23514', null, 'los equipos van en unidades enteras');
select throws_ok(
  $$ insert into labs.request_lines (workspace_id, request_id, line, kind, quantity)
     select 'a0000000-0000-4000-8000-00000000000a', id, 4, 'material', 1
     from labs.requests where number = 1 $$,
  '23514', null, 'un material lleva su descripción');
select throws_ok(
  $$ insert into labs.request_lines (workspace_id, request_id, line, kind, item_id, quantity, unit)
     select 'a0000000-0000-4000-8000-00000000000a', id, 4, 'reagent', 'b6000000-0000-4000-8000-000000000001', 1, 'mL'
     from labs.requests where number = 1 $$,
  '23503', null, 'no pide un reactivo de otro espacio');
select lives_ok(
  $$ delete from labs.request_lines where line = 3 $$,
  'mientras edita, reemplaza sus líneas');

-- Enviada: completa, con los recursos fijos.
select lives_ok(
  $$ update labs.requests
     set title = 'Titulación', teacher_name = 'Docente A', dates = '{2027-03-01}', starts_at = '08:00', ends_at = '10:00',
         participants = 20, status = 'submitted', submitted_at = now(), version = version + 1
     where number = 1 $$,
  'completa, se envía');
select throws_ok(
  $$ insert into labs.request_lines (workspace_id, request_id, line, kind, description, quantity)
     select 'a0000000-0000-4000-8000-00000000000a', id, 5, 'material', 'Gradilla', 1
     from labs.requests where number = 1 $$,
  '23514', null, 'enviada, no se agregan recursos');
select throws_ok(
  $$ delete from labs.request_lines where line = 1 $$,
  '23514', null, 'enviada, no se quitan recursos');
select throws_ok(
  $$ update labs.requests set status = 'draft' where number = 1 $$,
  '23514', null, 'enviada no vuelve a borrador');

-- Historial.
select throws_ok(
  $$ insert into labs.request_events (workspace_id, request_id, action, principal_id)
     select 'a0000000-0000-4000-8000-00000000000a', id, 'rejected', 'a2000000-0000-4000-8000-000000000001'
     from labs.requests where number = 1 $$,
  '23514', null, 'rechazar lleva motivo');
select throws_ok(
  $$ insert into labs.request_events (workspace_id, request_id, action, principal_id)
     select 'a0000000-0000-4000-8000-00000000000a', id, 'submitted', 'a2000000-0000-4000-8000-000000000002'
     from labs.requests where number = 1 $$,
  '42501', null, 'el historial lo firma quien actúa');

-- Cancelada es final.
select lives_ok(
  $$ update labs.requests set status = 'cancelled' where number = 1 $$, 'se cancela');
select throws_ok(
  $$ update labs.requests set title = 'Otra' where number = 1 $$,
  '23514', null, 'cancelada, no cambia');

-- Listas.
select throws_ok(
  $$ insert into labs.list_values (workspace_id, kind, name, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'subject', 'quimica general', 'a2000000-0000-4000-8000-000000000001') $$,
  '23505', null, 'una asignatura no se repite sin tildes ni mayúsculas');

-- Aislamiento y privilegios.
select is((select count(*) from labs.requests)::int, 1, 'solo ve las solicitudes de su espacio');
select ok(
  not has_table_privilege('platlab_api', 'labs.requests', 'DELETE')
  and not has_table_privilege('platlab_api', 'labs.request_events', 'DELETE')
  and not has_table_privilege('platlab_api', 'labs.list_values', 'DELETE')
  and not has_table_privilege('platlab_api', 'labs.request_events', 'UPDATE'),
  'nadie borra solicitudes ni su historial');
select ok(
  not has_column_privilege('platlab_api', 'labs.requests', 'number', 'UPDATE')
  and not has_column_privilege('platlab_api', 'labs.requests', 'form_revision', 'UPDATE')
  and not has_column_privilege('platlab_api', 'labs.requests', 'requester_principal_id', 'UPDATE'),
  'el número, el formato y quien pide no cambian');

reset role;

select ok(
  exists (select 1 from core.role_permissions where role_code = 'student' and permission_code = 'labs.request.create')
  and not exists (select 1 from core.role_permissions where role_code = 'operator' and permission_code = 'labs.request.review'),
  'el tesista pide; el Operador no resuelve');
select ok(
  not exists (select 1 from core.role_permissions
              where role_code in ('admin', 'operator') and permission_code = 'labs.request.create'),
  'el Administrador y el Operador no piden: revisan');

select * from finish();
rollback;
