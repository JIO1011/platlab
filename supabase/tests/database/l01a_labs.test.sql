-- L-01a (ADR 0023): Laboratorios bajo el rol de runtime. Aislamiento por espacio, horario semanal y
-- hoja de los Formatos validados en SQL, autoría propia, cierres anulados que no cambian, nombres de
-- formatos activos únicos, revisiones inmutables y sin DELETE en ninguna tabla.
begin;
create extension if not exists pgtap with schema extensions;

select plan(49);

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
   'Feriado de B', 'b2000000-0000-4000-8000-000000000001'),
  -- El cierre de A que la prueba anula: el runtime no elige el id.
  ('a6000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a3000000-0000-4000-8000-000000000001',
   '2027-01-04', '2027-01-05', 'Fumigación', 'a2000000-0000-4000-8000-000000000001');

-- El formato de B, para la FK compuesta de las revisiones.
insert into labs.forms (id, workspace_id, name, created_by_principal_id) values
  ('b7000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'Formato de B',
   'b2000000-0000-4000-8000-000000000001');

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

-- La hoja mínima válida: los cinco esenciales en dos filas, una columna de recursos y una firma.
create temp table sheet (layout jsonb) on commit drop;
insert into sheet values ('{
  "rows": [
    {"kind": "section", "title": "I. Datos de la actividad"},
    {"kind": "row", "fields": [{"key": "docente", "label": "Docente"}, {"key": "titulo", "label": "Título"}]},
    {"kind": "row", "fields": [{"key": "fecha", "label": "Fecha"}, {"key": "horario", "label": "Horario"},
                               {"key": "participantes", "label": "Nº alumnos"}]}
  ],
  "resources": [{"kind": "reagents", "label": "Reactivos"}],
  "equipmentCode": false,
  "notes": true,
  "signatures": [{"label": "Docente", "requester": true}]
}');
grant select on sheet to platlab_api;

-- Agrega una fila al final de la Sección I.
create function pg_temp.with_row(fields jsonb) returns jsonb language sql as $$
  select jsonb_set(layout, '{rows}', layout -> 'rows' || jsonb_build_object('kind', 'row', 'fields', fields)) from sheet
$$;

select ok(labs.form_layout_valid(layout), 'hoja: los esenciales, una columna de recursos y una firma bastan') from sheet;
select ok(labs.form_layout_valid(pg_temp.with_row(
  '[{"key": "grupos", "label": "Nº grupos"},
    {"key": "tipo_practica", "label": "Tipo", "type": "list", "required": true, "options": ["A", "B"]}]')),
  'hoja: un dato del sistema opcional y uno libre con opciones');
select ok(not labs.form_layout_valid(layout #- '{rows,2,fields,2}'), 'hoja: los esenciales no se quitan') from sheet;
select ok(not labs.form_layout_valid(pg_temp.with_row(
  '[{"key": "a", "label": "A", "type": "text", "required": false}, {"key": "b", "label": "B", "type": "text", "required": false},
    {"key": "c", "label": "C", "type": "text", "required": false}, {"key": "d", "label": "D", "type": "text", "required": false}]')),
  'hoja: una fila lleva de 1 a 3 datos');
select ok(not labs.form_layout_valid(pg_temp.with_row('[]')), 'hoja: una fila no queda vacía');
select ok(not labs.form_layout_valid(pg_temp.with_row('[{"key": "docente", "label": "Otra vez"}]')), 'hoja: un dato del sistema va una vez');
select ok(not labs.form_layout_valid(pg_temp.with_row('[{"key": "grupos", "label": "Grupos", "type": "number", "required": false}]')),
  'hoja: un dato libre no usa una clave del sistema');
select ok(not labs.form_layout_valid(pg_temp.with_row('[{"key": "colaborador", "label": "Colaborador"}]')),
  'hoja: sin tipo solo van las claves del sistema');
select ok(not labs.form_layout_valid(pg_temp.with_row(
  '[{"key": "x", "label": "X", "type": "text", "required": false}, {"key": "x", "label": "Y", "type": "date", "required": false}]')),
  'hoja: las claves libres no se repiten');
select ok(not labs.form_layout_valid(pg_temp.with_row('[{"key": "tipo_practica", "label": "Tipo", "type": "list", "required": true}]')),
  'hoja: una lista exige opciones');
select ok(not labs.form_layout_valid(pg_temp.with_row('[{"key": "x", "label": "X", "type": "text", "required": true, "options": ["A"]}]')),
  'hoja: solo la lista lleva opciones');
select ok(not labs.form_layout_valid(jsonb_set(layout, '{rows,0,title}', '" "')), 'hoja: un título de sección no queda en blanco') from sheet;
select ok(not labs.form_layout_valid(jsonb_set(layout, '{resources}', '[]')), 'hoja: al menos una columna de recursos') from sheet;
select ok(not labs.form_layout_valid(jsonb_set(layout, '{resources}',
  '[{"kind": "reagents", "label": "Reactivos"}, {"kind": "reagents", "label": "Insumos"}]')), 'hoja: las columnas de recursos no se repiten') from sheet;
select ok(not labs.form_layout_valid(jsonb_set(layout, '{signatures}',
  '[{"label": "Docente", "requester": true}, {"label": "Cliente", "requester": true}]')), 'hoja: una sola firma del solicitante') from sheet;
select ok(not labs.form_layout_valid(jsonb_set(layout, '{signatures}', (
  select jsonb_agg(jsonb_build_object('label', 'Firma ' || i, 'requester', false)) from generate_series(1, 4) as i))),
  'hoja: de 1 a 3 firmas') from sheet;
select ok(not labs.form_layout_valid(layout || '{"logo": true}'), 'hoja: sin claves desconocidas') from sheet;
select ok(not labs.form_layout_valid('[]'), 'hoja: es un objeto');

-- ---------------------------------------------------------------------------
-- Bajo el rol de runtime, en el contexto de A
-- ---------------------------------------------------------------------------

set local role platlab_api;
select set_config('platlab.workspace_id', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config('platlab.principal_id', 'a2000000-0000-4000-8000-000000000001', true);

select is((select count(*)::int from labs.spaces), 1, 'RLS: el runtime solo ve los espacios de su espacio de trabajo');
select is((select count(*)::int from labs.closures), 1, 'RLS: no ve los cierres de otro espacio de trabajo');

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
  $$ insert into labs.closures (workspace_id, area_id, starts_on, ends_on, reason, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a3000000-0000-4000-8000-000000000001', '2027-02-01', '2027-02-01',
             'Pintura', 'a2000000-0000-4000-8000-000000000001') $$,
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
  $$ insert into labs.forms (workspace_id, name, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'Práctica académica', 'a2000000-0000-4000-8000-000000000001') $$,
  'el runtime crea un formato de su espacio');

select is((select count(*)::int from labs.forms), 1, 'RLS: no ve los formatos de otro espacio de trabajo');

select throws_ok(
  $$ insert into labs.form_revisions (workspace_id, form_id, revision, title, layout, published_by_principal_id)
     select 'a0000000-0000-4000-8000-00000000000a', 'b7000000-0000-4000-8000-000000000001', 1, 'Solicitud', layout,
            'a2000000-0000-4000-8000-000000000001' from sheet $$,
  '23503', null, 'FK compuesta: no publica una revisión en un formato de otro espacio');

select throws_ok(
  $$ insert into labs.forms (workspace_id, name, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', ' práctica  ACADÉMICA', 'a2000000-0000-4000-8000-000000000001') $$,
  '23505', null, 'dos formatos activos no se llaman igual');

select lives_ok(
  $$ insert into labs.form_revisions (workspace_id, form_id, revision, title, document_code, layout, published_by_principal_id)
     select 'a0000000-0000-4000-8000-00000000000a', (select id from labs.forms), 1, 'Solicitud', 'LAB-01', layout,
            'a2000000-0000-4000-8000-000000000001' from sheet $$,
  'el runtime publica una revisión con su membrete y su hoja');

select throws_ok(
  $$ insert into labs.form_revisions (workspace_id, form_id, revision, title, layout, published_by_principal_id)
     select 'a0000000-0000-4000-8000-00000000000a', (select id from labs.forms), 2, 'Solicitud', layout #- '{rows,1}',
            'a2000000-0000-4000-8000-000000000001' from sheet $$,
  '23514', null, 'una hoja sin sus esenciales no se publica');

select throws_ok(
  $$ update labs.form_revisions set title = 'Otro' $$,
  '42501', null, 'una revisión publicada no se edita');

select lives_ok(
  $$ update labs.forms set archived_at = now(), version = version + 1 $$,
  'el runtime archiva un formato');

select lives_ok(
  $$ insert into labs.forms (workspace_id, name, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'Práctica académica', 'a2000000-0000-4000-8000-000000000001') $$,
  'un formato archivado libera su nombre');

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
  and not has_table_privilege('platlab_api', 'labs.forms', 'DELETE')
  and not has_table_privilege('platlab_api', 'labs.form_revisions', 'DELETE')
  and not has_table_privilege('platlab_api', 'labs.settings', 'DELETE'),
  'nada se borra: el runtime no tiene DELETE en Laboratorios');

select * from finish();
rollback;
