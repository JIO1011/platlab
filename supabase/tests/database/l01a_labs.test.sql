-- L-01a (ADR 0023): Laboratorios bajo el rol de runtime. Aislamiento por espacio, horario semanal y
-- campos del Formato validados en SQL, autoría propia, cierres anulados que no cambian, versiones del
-- Formato inmutables y sin DELETE en ninguna tabla.
begin;
create extension if not exists pgtap with schema extensions;

select plan(31);

grant usage on schema extensions to platlab_api;
grant platlab_api to postgres with set true, inherit false;

-- ---------------------------------------------------------------------------
-- Fixtures sintéticos: A con dos áreas y un espacio habilitado; B con su espacio y su cierre.
-- ---------------------------------------------------------------------------

insert into platform.customer_accounts (id, legal_name)
values ('c0000000-0000-4000-8000-000000000001', 'Titular sintético');
insert into core.workspaces (id, customer_account_id, code, name, time_zone) values
  ('a0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000001', 'labs-a', 'A', 'America/Guayaquil'),
  ('b0000000-0000-4000-8000-00000000000b', 'c0000000-0000-4000-8000-000000000001', 'labs-b', 'B', 'America/Guayaquil');
insert into core.identities (id, provider, provider_subject, display_name) values
  ('10000000-0000-4000-8000-000000000001', 'supabase', 'labs-a1', 'Administradora A'),
  ('10000000-0000-4000-8000-000000000002', 'supabase', 'labs-a2', 'Operador A'),
  ('10000000-0000-4000-8000-000000000003', 'supabase', 'labs-b1', 'Administradora B');
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
insert into labs.spaces (workspace_id, area_id, capacity, weekly_hours, created_by_principal_id) values
  ('a0000000-0000-4000-8000-00000000000a', 'a3000000-0000-4000-8000-000000000001', 20,
   '{"1": [{"opens": "08:00", "closes": "12:00"}], "2": [], "3": [], "4": [], "5": [], "6": [], "7": []}',
   'a2000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-00000000000b', 'b3000000-0000-4000-8000-000000000001', 10,
   '{"1": [], "2": [], "3": [], "4": [], "5": [], "6": [], "7": []}', 'b2000000-0000-4000-8000-000000000001');
insert into labs.closures (id, workspace_id, area_id, starts_on, ends_on, reason, created_by_principal_id) values
  ('b6000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', null, '2027-01-01', '2027-01-01',
   'Feriado de B', 'b2000000-0000-4000-8000-000000000001');

-- ---------------------------------------------------------------------------
-- Validadores: funciones puras, sin contexto
-- ---------------------------------------------------------------------------

select ok(labs.weekly_hours_valid(
  '{"1": [{"opens": "07:00", "closes": "12:00"}, {"opens": "12:00", "closes": "23:59"}], "2": [], "3": [], "4": [], "5": [], "6": [], "7": []}'),
  'horario: franjas contiguas y días cerrados son válidos');
select ok(not labs.weekly_hours_valid(
  '{"1": [{"opens": "08:00", "closes": "12:00"}, {"opens": "11:00", "closes": "13:00"}], "2": [], "3": [], "4": [], "5": [], "6": [], "7": []}'),
  'horario: franjas que se solapan');
select ok(not labs.weekly_hours_valid(
  '{"1": [{"opens": "14:00", "closes": "16:00"}, {"opens": "08:00", "closes": "10:00"}], "2": [], "3": [], "4": [], "5": [], "6": [], "7": []}'),
  'horario: franjas en desorden');
select ok(not labs.weekly_hours_valid(
  '{"1": [{"opens": "08:00", "closes": "24:00"}], "2": [], "3": [], "4": [], "5": [], "6": [], "7": []}'),
  'horario: 24:00 no es una hora');
select ok(not labs.weekly_hours_valid(
  '{"1": [{"opens": "8:00", "closes": "10:00"}], "2": [], "3": [], "4": [], "5": [], "6": [], "7": []}'),
  'horario: la hora va en HH:MM');
select ok(not labs.weekly_hours_valid(
  '{"1": [{"opens": "10:00", "closes": "10:00"}], "2": [], "3": [], "4": [], "5": [], "6": [], "7": []}'),
  'horario: abre antes de cerrar');
select ok(not labs.weekly_hours_valid('{"1": [], "2": [], "3": [], "4": [], "5": [], "6": []}'),
  'horario: faltan días');
select ok(not labs.weekly_hours_valid(
  '{"1": [{"opens": "08:00", "closes": "10:00", "note": "x"}], "2": [], "3": [], "4": [], "5": [], "6": [], "7": []}'),
  'horario: una franja no lleva otras claves');
select ok(not labs.weekly_hours_valid('{"1": "08:00", "2": [], "3": [], "4": [], "5": [], "6": [], "7": []}'),
  'horario: cada día es una lista');

select ok(labs.form_fields_valid(
  '[{"key": "asignatura", "label": "Asignatura", "type": "text", "required": true},
    {"key": "tipo", "label": "Tipo", "type": "list", "required": false, "options": ["A", "B"]}]'),
  'formato: texto y lista con opciones son válidos');
select ok(not labs.form_fields_valid('[{"key": "tipo", "label": "Tipo", "type": "list", "required": true}]'),
  'formato: una lista exige opciones');
select ok(not labs.form_fields_valid('[{"key": "x", "label": "X", "type": "text", "required": true, "options": ["A"]}]'),
  'formato: solo la lista lleva opciones');
select ok(not labs.form_fields_valid(
  '[{"key": "x", "label": "X", "type": "text", "required": true}, {"key": "x", "label": "Y", "type": "date", "required": false}]'),
  'formato: las claves no se repiten');
select ok(not labs.form_fields_valid('[{"key": "tipo", "label": "Tipo", "type": "list", "required": true, "options": ["A", "A"]}]'),
  'formato: las opciones no se repiten');
select ok(not labs.form_fields_valid('[{"key": "x", "label": "X", "type": "file", "required": true}]'),
  'formato: tipo desconocido');
select ok(not labs.form_fields_valid(
  (select jsonb_agg(jsonb_build_object('key', 'c' || i, 'label', 'C', 'type', 'text', 'required', false)) from generate_series(1, 31) as i)),
  'formato: más de 30 campos');

-- ---------------------------------------------------------------------------
-- Bajo el rol de runtime, en el contexto de A
-- ---------------------------------------------------------------------------

set local role platlab_api;
select set_config('platlab.workspace_id', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config('platlab.principal_id', 'a2000000-0000-4000-8000-000000000001', true);

select is((select count(*)::int from labs.spaces), 1, 'RLS: el runtime solo ve los espacios de su espacio de trabajo');
select is((select count(*)::int from labs.closures), 0, 'RLS: no ve los cierres de otro espacio de trabajo');

select lives_ok(
  $$ insert into labs.spaces (workspace_id, area_id, capacity, weekly_hours, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a3000000-0000-4000-8000-000000000002', 12,
             '{"1": [], "2": [], "3": [], "4": [], "5": [], "6": [], "7": []}', 'a2000000-0000-4000-8000-000000000001') $$,
  'el runtime habilita un área de su espacio');

select throws_ok(
  $$ insert into labs.spaces (workspace_id, area_id, capacity, weekly_hours, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'b3000000-0000-4000-8000-000000000001', 12,
             '{"1": [], "2": [], "3": [], "4": [], "5": [], "6": [], "7": []}', 'a2000000-0000-4000-8000-000000000001') $$,
  '23503', null, 'FK compuesta: no habilita un área de otro espacio');

select throws_ok(
  $$ insert into labs.spaces (workspace_id, area_id, capacity, weekly_hours, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a3000000-0000-4000-8000-000000000002', 12,
             '{"1": [], "2": [], "3": [], "4": [], "5": [], "6": [], "7": []}', 'a2000000-0000-4000-8000-000000000002') $$,
  '42501', null, 'la autoría es de quien escribe');

select throws_ok(
  $$ insert into labs.closures (workspace_id, area_id, starts_on, ends_on, reason, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', null, '2027-01-02', '2027-01-01', 'Al revés', 'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'un cierre empieza antes de terminar');

select lives_ok(
  $$ insert into labs.closures (id, workspace_id, area_id, starts_on, ends_on, reason, created_by_principal_id)
     values ('a6000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a',
             'a3000000-0000-4000-8000-000000000001', '2027-01-04', '2027-01-05', 'Fumigación', 'a2000000-0000-4000-8000-000000000001') $$,
  'el runtime registra un cierre de su espacio');

select lives_ok(
  $$ update labs.closures set voided_at = now(), voided_by_principal_id = 'a2000000-0000-4000-8000-000000000001'
     where id = 'a6000000-0000-4000-8000-000000000001' $$,
  'el runtime anula un cierre');

select throws_ok(
  $$ update labs.closures set voided_at = now(), voided_by_principal_id = 'a2000000-0000-4000-8000-000000000001'
     where id = 'a6000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'lo anulado no se modifica');

select throws_ok(
  $$ update labs.closures set reason = 'Otro' where id = 'a6000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'del cierre solo se cambia la anulación');

select lives_ok(
  $$ insert into labs.form_versions (workspace_id, version, title, fields, published_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 1, 'Solicitud', '[]', 'a2000000-0000-4000-8000-000000000001') $$,
  'el runtime publica una versión del Formato');

select throws_ok(
  $$ update labs.form_versions set title = 'Otro' where workspace_id = 'a0000000-0000-4000-8000-00000000000a' $$,
  '42501', null, 'una versión publicada no se edita');

select throws_ok(
  $$ insert into labs.settings (workspace_id, lead_days) values ('a0000000-0000-4000-8000-00000000000a', 91) $$,
  '23514', null, 'la anticipación va de 0 a 90 días');

select throws_ok(
  $$ insert into labs.settings (workspace_id, lead_days) values ('b0000000-0000-4000-8000-00000000000b', 3) $$,
  '42501', null, 'el runtime no escribe ajustes de otro espacio');

reset role;

select ok(
  not has_table_privilege('platlab_api', 'labs.spaces', 'DELETE')
  and not has_table_privilege('platlab_api', 'labs.closures', 'DELETE')
  and not has_table_privilege('platlab_api', 'labs.form_versions', 'DELETE')
  and not has_table_privilege('platlab_api', 'labs.settings', 'DELETE'),
  'nada se borra: el runtime no tiene DELETE en Laboratorios');

select * from finish();
rollback;
