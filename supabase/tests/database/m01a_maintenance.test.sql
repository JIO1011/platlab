-- M-01a (ADR 0020): Mantenimiento bajo el rol de runtime. Aislamiento por espacio, grants por columna,
-- reglas de planes, exclusiones y registros, lo archivado no cambia, registro y certificado inmutables,
-- RLS de las vistas y la próxima fecha de cada equipo.
begin;
create extension if not exists pgtap with schema extensions;

select plan(48);

grant usage on schema extensions to platlab_api;
grant platlab_api to postgres with set true, inherit false;

-- ---------------------------------------------------------------------------
-- Fixtures sintéticos. A: balanzas (al inicio, alta posterior, dada de baja, excluida y otra para
-- el fin de mes) y un microscopio con plan propio. B: su equipo, proveedor, plan y registro.
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
  ('a4000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'Balanza'),
  ('a4000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'Microscopio'),
  ('b4000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'Balanza');
-- BAL-02 se registró el 15-06 a las 03:00 UTC: en Guayaquil (UTC−5) su alta es el 14-06.
insert into equipment.assets (id, workspace_id, type_id, code, name, location_id, condition, created_by_principal_id, created_at)
select a.id::uuid, a.ws::uuid, a.type::uuid, a.code, a.name, a.loc::uuid, a.condition, a.author::uuid, a.created::timestamptz
  from (values
    ('a5000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a4000000-0000-4000-8000-000000000001', 'BAL-01', 'Balanza al inicio',
     'a3000000-0000-4000-8000-000000000001', 'operational', 'a2000000-0000-4000-8000-000000000001', '2025-12-01 12:00:00+00'),
    ('a5000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'a4000000-0000-4000-8000-000000000001', 'BAL-02', 'Balanza nueva',
     'a3000000-0000-4000-8000-000000000001', 'operational', 'a2000000-0000-4000-8000-000000000001', '2026-06-15 03:00:00+00'),
    ('a5000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-00000000000a', 'a4000000-0000-4000-8000-000000000001', 'BAL-03', 'Balanza dada de baja',
     'a3000000-0000-4000-8000-000000000001', 'retired', 'a2000000-0000-4000-8000-000000000001', '2025-12-01 12:00:00+00'),
    ('a5000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-00000000000a', 'a4000000-0000-4000-8000-000000000001', 'BAL-04', 'Balanza excluida',
     'a3000000-0000-4000-8000-000000000001', 'operational', 'a2000000-0000-4000-8000-000000000001', '2025-12-01 12:00:00+00'),
    ('a5000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-00000000000a', 'a4000000-0000-4000-8000-000000000001', 'BAL-05', 'Balanza de fin de mes',
     'a3000000-0000-4000-8000-000000000001', 'operational', 'a2000000-0000-4000-8000-000000000001', '2025-12-01 12:00:00+00'),
    ('a5000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-00000000000a', 'a4000000-0000-4000-8000-000000000002', 'MIC-01', 'Microscopio con plan propio',
     'a3000000-0000-4000-8000-000000000001', 'operational', 'a2000000-0000-4000-8000-000000000001', '2025-12-01 12:00:00+00'),
    ('b5000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'b4000000-0000-4000-8000-000000000001', 'BAL-01', 'Balanza de B',
     'b3000000-0000-4000-8000-000000000001', 'operational', 'b2000000-0000-4000-8000-000000000001', '2025-12-01 12:00:00+00')
  ) as a (id, ws, type, code, name, loc, condition, author, created);

-- Planes de A: mensual de calibración por tipo desde el 31-01, anual propio del microscopio y uno
-- que se archiva en la prueba. BAL-04 está excluida del plan del tipo.
insert into maintenance.plans
  (id, workspace_id, kind, title, asset_type_id, asset_id, interval_count, interval_unit, starts_on, created_by_principal_id)
values
  ('a7000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'calibration', 'Calibración mensual',
   'a4000000-0000-4000-8000-000000000001', null, 1, 'month', '2026-01-31', 'a2000000-0000-4000-8000-000000000001'),
  ('a7000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'preventive', 'Preventivo del MIC-01',
   null, 'a5000000-0000-4000-8000-000000000006', 1, 'year', '2026-02-01', 'a2000000-0000-4000-8000-000000000001'),
  ('a7000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-00000000000a', 'cleaning', 'Limpieza semanal',
   'a4000000-0000-4000-8000-000000000001', null, 1, 'week', '2026-01-01', 'a2000000-0000-4000-8000-000000000001'),
  ('b7000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'calibration', 'Calibración de B',
   'b4000000-0000-4000-8000-000000000001', null, 1, 'year', '2026-01-01', 'b2000000-0000-4000-8000-000000000001');
insert into maintenance.plan_exclusions (id, workspace_id, plan_id, asset_type_id, asset_id, reason, created_by_principal_id) values
  ('a8000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a7000000-0000-4000-8000-000000000001',
   'a4000000-0000-4000-8000-000000000001', 'a5000000-0000-4000-8000-000000000004', 'Se calibra con su propio plan', 'a2000000-0000-4000-8000-000000000001');
insert into maintenance.providers (id, workspace_id, name) values
  ('b6000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'Proveedor de B');
insert into maintenance.records (id, workspace_id, asset_id, plan_id, kind, performed_on, result, recorded_by_principal_id) values
  ('b9000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'b5000000-0000-4000-8000-000000000001',
   'b7000000-0000-4000-8000-000000000001', 'calibration', '2026-02-01', 'pass', 'b2000000-0000-4000-8000-000000000001');

set local role platlab_api;
select set_config('platlab.workspace_id', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config('platlab.principal_id', 'a2000000-0000-4000-8000-000000000001', true);

-- ---------------------------------------------------------------------------
-- Proveedores: espacio y nombre único entre activos
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into maintenance.providers (workspace_id, name, contact)
     values ('a0000000-0000-4000-8000-00000000000a', 'Metrología Andina', 'servicio@ejemplo.org') $$,
  'el runtime registra un proveedor del espacio');

select throws_ok(
  $$ insert into maintenance.providers (workspace_id, name) values ('a0000000-0000-4000-8000-00000000000a', 'METROLOGIA ANDINA') $$,
  '23505', null, 'el nombre de un proveedor activo no se repite, sin tildes ni mayúsculas');

select throws_ok(
  $$ insert into maintenance.providers (workspace_id, name) values ('b0000000-0000-4000-8000-00000000000b', 'Otro') $$,
  '42501', null, 'el runtime no registra proveedores en otro espacio');

select is((select count(*)::int from maintenance.providers), 1, 'RLS: el runtime solo ve los proveedores de su espacio');

-- ---------------------------------------------------------------------------
-- Planes: alcance exclusivo, frecuencia, lista de verificación, FK por espacio y autoría
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into maintenance.plans (workspace_id, kind, title, asset_type_id, interval_count, interval_unit, starts_on, checklist,
                                    acceptance_criteria, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'verification', 'Verificación con pesa patrón', 'a4000000-0000-4000-8000-000000000001',
             2, 'week', '2026-03-01', '{"Nivelar","Pesar la pesa de 200 g"}', 'Error de ±1 mg', 'a2000000-0000-4000-8000-000000000001') $$,
  'el runtime crea un plan por tipo de equipo');

select throws_ok(
  $$ insert into maintenance.plans (workspace_id, kind, title, asset_type_id, asset_id, interval_count, interval_unit, starts_on, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'preventive', 'Doble', 'a4000000-0000-4000-8000-000000000001',
             'a5000000-0000-4000-8000-000000000001', 1, 'year', '2026-03-01', 'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'un plan no es a la vez de un tipo y de un equipo');

select throws_ok(
  $$ insert into maintenance.plans (workspace_id, kind, title, interval_count, interval_unit, starts_on, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'preventive', 'Sin alcance', 1, 'year', '2026-03-01', 'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'un plan sin tipo ni equipo no existe');

select throws_ok(
  $$ insert into maintenance.plans (workspace_id, kind, title, asset_type_id, interval_count, interval_unit, starts_on, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'preventive', 'Cero', 'a4000000-0000-4000-8000-000000000001', 0, 'month', '2026-03-01',
             'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'la frecuencia es de 1 a 999');

select throws_ok(
  $$ insert into maintenance.plans (workspace_id, kind, title, asset_type_id, interval_count, interval_unit, starts_on, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'preventive', 'Por horas', 'a4000000-0000-4000-8000-000000000001', 8, 'hour', '2026-03-01',
             'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'la frecuencia es en días, semanas, meses o años');

select throws_ok(
  $$ insert into maintenance.plans (workspace_id, kind, title, asset_type_id, interval_count, interval_unit, starts_on, checklist, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'preventive', 'Lista larga', 'a4000000-0000-4000-8000-000000000001', 1, 'month', '2026-03-01',
             array_fill('Paso'::text, array[31]), 'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'la lista de verificación tiene hasta 30 ítems');

select throws_ok(
  $$ insert into maintenance.plans (workspace_id, kind, title, asset_type_id, interval_count, interval_unit, starts_on, checklist, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'preventive', 'Ítem vacío', 'a4000000-0000-4000-8000-000000000001', 1, 'month', '2026-03-01',
             '{"Limpiar","   "}', 'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'cada ítem de la lista tiene texto');

select throws_ok(
  $$ insert into maintenance.plans (workspace_id, kind, title, asset_type_id, interval_count, interval_unit, starts_on, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'preventive', 'Tipo ajeno', 'b4000000-0000-4000-8000-000000000001', 1, 'month', '2026-03-01',
             'a2000000-0000-4000-8000-000000000001') $$,
  '23503', null, 'un plan no apunta a un tipo de equipo de otro espacio');

select throws_ok(
  $$ insert into maintenance.plans (workspace_id, kind, title, asset_type_id, interval_count, interval_unit, starts_on, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'preventive', 'Autoría ajena', 'a4000000-0000-4000-8000-000000000001', 1, 'month', '2026-03-01',
             'a2000000-0000-4000-8000-000000000002') $$,
  '42501', null, 'la autoría del plan es del principal del contexto');

-- ---------------------------------------------------------------------------
-- Exclusiones: solo de un plan por tipo, una activa por equipo, y archivar es definitivo
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ insert into maintenance.plan_exclusions (workspace_id, plan_id, asset_type_id, asset_id, reason, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a7000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001',
             'a5000000-0000-4000-8000-000000000004', 'Otra vez', 'a2000000-0000-4000-8000-000000000001') $$,
  '23505', null, 'un equipo tiene una sola exclusión activa por plan');

select throws_ok(
  $$ insert into maintenance.plan_exclusions (workspace_id, plan_id, asset_type_id, asset_id, reason, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a7000000-0000-4000-8000-000000000002', 'a4000000-0000-4000-8000-000000000002',
             'a5000000-0000-4000-8000-000000000006', 'Plan propio', 'a2000000-0000-4000-8000-000000000001') $$,
  '23503', null, 'solo se excluye de un plan por tipo');

select lives_ok(
  $$ update maintenance.plan_exclusions set archived_at = now() where id = 'a8000000-0000-4000-8000-000000000001' $$,
  'el runtime archiva una exclusión');

select throws_ok(
  $$ update maintenance.plan_exclusions set archived_at = null where id = 'a8000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'una exclusión archivada no vuelve');

select lives_ok(
  $$ insert into maintenance.plan_exclusions (workspace_id, plan_id, asset_type_id, asset_id, reason, created_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a7000000-0000-4000-8000-000000000001', 'a4000000-0000-4000-8000-000000000001',
             'a5000000-0000-4000-8000-000000000004', 'Se calibra fuera del laboratorio', 'a2000000-0000-4000-8000-000000000001') $$,
  'archivada la anterior, el equipo se excluye de nuevo');

-- ---------------------------------------------------------------------------
-- Un plan archivado no se modifica; tipo de trabajo y alcance no se cambian
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ update maintenance.plans set kind = 'preventive' where id = 'a7000000-0000-4000-8000-000000000003' $$,
  '42501', null, 'el tipo de trabajo de un plan no se cambia');

select throws_ok(
  $$ update maintenance.plans set asset_type_id = null, asset_id = 'a5000000-0000-4000-8000-000000000001'
      where id = 'a7000000-0000-4000-8000-000000000003' $$,
  '42501', null, 'el alcance de un plan no se cambia');

select lives_ok(
  $$ update maintenance.plans set archived_at = now(), version = version + 1 where id = 'a7000000-0000-4000-8000-000000000003' $$,
  'el runtime archiva un plan');

select throws_ok(
  $$ update maintenance.plans set title = 'Limpieza quincenal' where id = 'a7000000-0000-4000-8000-000000000003' $$,
  '23514', null, 'un plan archivado no se modifica');

select is(
  (select count(*)::int from maintenance.plan_assets where plan_id = 'a7000000-0000-4000-8000-000000000003'),
  0,
  'un plan archivado no cubre equipos');

-- ---------------------------------------------------------------------------
-- Vistas: RLS y próxima fecha sin registros
-- ---------------------------------------------------------------------------

select is((select count(*)::int from equipment.asset_directory), 6, 'RLS: el directorio de equipos solo muestra los del espacio');
select is((select count(*)::int from equipment.asset_type_directory), 2, 'RLS: el directorio de tipos solo muestra los del espacio');

select is(
  (select count(*)::int from maintenance.plan_assets where workspace_id <> 'a0000000-0000-4000-8000-00000000000a'),
  0,
  'RLS: la vista de planes no muestra equipos de otro espacio');

select is(
  (select due_on from maintenance.plan_assets
    where plan_id = 'a7000000-0000-4000-8000-000000000001' and asset_id = 'a5000000-0000-4000-8000-000000000001'),
  '2026-01-31'::date,
  'sin registros, un equipo anterior al plan toca en su inicio');

select is(
  (select due_on from maintenance.plan_assets
    where plan_id = 'a7000000-0000-4000-8000-000000000001' and asset_id = 'a5000000-0000-4000-8000-000000000002'),
  '2026-06-14'::date,
  'sin registros, un equipo registrado después toca en su alta, en la zona horaria del espacio');

select is(
  (select count(*)::int from maintenance.plan_assets
    where asset_id in ('a5000000-0000-4000-8000-000000000003', 'a5000000-0000-4000-8000-000000000004')),
  0,
  'un equipo dado de baja o excluido queda fuera del plan');

select results_eq(
  $$ select plan_id, due_on from maintenance.plan_assets where asset_id = 'a5000000-0000-4000-8000-000000000006' $$,
  $$ values ('a7000000-0000-4000-8000-000000000002'::uuid, '2026-02-01'::date) $$,
  'el plan propio cubre su equipo y el plan de otro tipo no lo alcanza');

-- ---------------------------------------------------------------------------
-- Registros: reglas, FK compuesta con el plan, autoría e inmutabilidad
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into maintenance.records (id, workspace_id, asset_id, plan_id, kind, performed_on, result, checklist, cost, recorded_by_principal_id)
     values ('a9000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000005',
             'a7000000-0000-4000-8000-000000000001', 'calibration', '2026-01-31', 'pass',
             '[{"item": "Nivelar", "done": true}, {"item": "Pesar", "done": false}]', 120.50, 'a2000000-0000-4000-8000-000000000001') $$,
  'el runtime registra un mantenimiento con plan');

select lives_ok(
  $$ insert into maintenance.records (workspace_id, asset_id, plan_id, kind, performed_on, result, recorded_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000005',
             'a7000000-0000-4000-8000-000000000001', 'calibration', '2026-01-15', 'pass', 'a2000000-0000-4000-8000-000000000001') $$,
  'un registro con fecha anterior se carga después');

select is(
  (select due_on from maintenance.plan_assets
    where plan_id = 'a7000000-0000-4000-8000-000000000001' and asset_id = 'a5000000-0000-4000-8000-000000000005'),
  '2026-02-28'::date,
  'el último registro por fecha manda, y un mes desde el 31-01 cae el 28-02');

select lives_ok(
  $$ insert into maintenance.records (workspace_id, asset_id, plan_id, kind, performed_on, result, valid_until, recorded_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001',
             'a7000000-0000-4000-8000-000000000001', 'calibration', '2026-02-10', 'pass', '2026-12-31', 'a2000000-0000-4000-8000-000000000001') $$,
  'el runtime registra una calibración con «válida hasta»');

select is(
  (select due_on from maintenance.plan_assets
    where plan_id = 'a7000000-0000-4000-8000-000000000001' and asset_id = 'a5000000-0000-4000-8000-000000000001'),
  '2026-12-31'::date,
  'la «válida hasta» del último registro manda sobre la frecuencia');

select throws_ok(
  $$ insert into maintenance.records (workspace_id, asset_id, kind, performed_on, result, recorded_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'preventive', '2026-02-10', 'fail',
             'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'un no conforme exige observaciones');

select throws_ok(
  $$ insert into maintenance.records (workspace_id, asset_id, kind, performed_on, result, valid_until, recorded_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'calibration', '2026-02-10', 'pass',
             '2026-02-09', 'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'la «válida hasta» no es anterior a la fecha del trabajo');

select throws_ok(
  $$ insert into maintenance.records (workspace_id, asset_id, kind, performed_on, result, cost, recorded_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'preventive', '2026-02-10', 'pass',
             -1, 'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'el costo no es negativo');

select throws_ok(
  $$ insert into maintenance.records (workspace_id, asset_id, kind, performed_on, result, checklist, recorded_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'preventive', '2026-02-10', 'pass',
             '[{"item": "Limpiar"}]', 'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'cada ítem de la lista marcada dice si se hizo');

select throws_ok(
  $$ insert into maintenance.records (workspace_id, asset_id, plan_id, kind, performed_on, result, recorded_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000001',
             'preventive', '2026-02-10', 'pass', 'a2000000-0000-4000-8000-000000000001') $$,
  '23503', null, 'con plan, el tipo de trabajo es el del plan');

select throws_ok(
  $$ insert into maintenance.records (workspace_id, asset_id, kind, performed_on, result, provider_id, recorded_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'preventive', '2026-02-10', 'pass',
             'b6000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001') $$,
  '23503', null, 'un registro no apunta a un proveedor de otro espacio');

select throws_ok(
  $$ insert into maintenance.records (workspace_id, asset_id, kind, performed_on, result, recorded_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'preventive', '2026-02-10', 'pass',
             'a2000000-0000-4000-8000-000000000002') $$,
  '42501', null, 'quien registra es el principal del contexto');

select throws_ok(
  $$ update maintenance.records set cost = 0 where id = 'a9000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'un registro no se edita');

select throws_ok(
  $$ delete from maintenance.records where id = 'a9000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'un registro no se borra');

-- ---------------------------------------------------------------------------
-- Certificado: uno por registro, ruta fija, sin edición ni borrado
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into maintenance.record_certificates (id, workspace_id, record_id, object_path, url, byte_size, sha256, uploaded_by_principal_id)
     values ('aa000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a9000000-0000-4000-8000-000000000001',
             'a0000000-0000-4000-8000-00000000000a/maintenance/certificates/aa000000-0000-4000-8000-000000000001.pdf',
             'https://ejemplo.org/c.pdf', 2048, repeat('c', 64), 'a2000000-0000-4000-8000-000000000001') $$,
  'el runtime adjunta el certificado de un registro');

select throws_ok(
  $$ insert into maintenance.record_certificates (id, workspace_id, record_id, object_path, url, byte_size, sha256, uploaded_by_principal_id)
     values ('aa000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'a9000000-0000-4000-8000-000000000001',
             'a0000000-0000-4000-8000-00000000000a/maintenance/certificates/aa000000-0000-4000-8000-000000000002.pdf',
             'https://ejemplo.org/d.pdf', 2048, repeat('d', 64), 'a2000000-0000-4000-8000-000000000001') $$,
  '23505', null, 'un registro tiene un solo certificado');

select throws_ok(
  $$ insert into maintenance.record_certificates (id, workspace_id, record_id, object_path, url, byte_size, sha256, uploaded_by_principal_id)
     values ('aa000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-00000000000a', 'b9000000-0000-4000-8000-000000000001',
             'b0000000-0000-4000-8000-00000000000b/maintenance/certificates/aa000000-0000-4000-8000-000000000003.pdf',
             'https://ejemplo.org/e.pdf', 2048, repeat('e', 64), 'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'la ruta del certificado es la del espacio y su id');

select throws_ok(
  $$ update maintenance.record_certificates set url = 'https://ejemplo.org/otro.pdf' where id = 'aa000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'el certificado no se reemplaza');

select throws_ok(
  $$ delete from maintenance.record_certificates where id = 'aa000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'el certificado no se borra');

select * from finish();
rollback;
