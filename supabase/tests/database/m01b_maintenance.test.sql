-- M-01b (ADR 0020): el correctivo ligado al incidente y la corrección por anulación, bajo el rol de runtime.
-- Reglas del correctivo, incidente del mismo espacio, anular una sola vez y solo eso, la corrección del
-- mismo equipo y una por registro, el certificado que pasa a la corrección y la próxima fecha sin anulados.
begin;
create extension if not exists pgtap with schema extensions;

select plan(23);

grant usage on schema extensions to platlab_api;
grant platlab_api to postgres with set true, inherit false;

-- ---------------------------------------------------------------------------
-- Fixtures sintéticos. A: dos balanzas con un incidente abierto cada una, un plan mensual, un registro de
-- BAL-01 con certificado y otro de BAL-02. B: su balanza, su incidente y su registro.
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
  ('b4000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'Balanza');
insert into equipment.assets (id, workspace_id, type_id, code, name, location_id, condition, created_by_principal_id, created_at) values
  ('a5000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a4000000-0000-4000-8000-000000000001', 'BAL-01',
   'Balanza 1', 'a3000000-0000-4000-8000-000000000001', 'operational', 'a2000000-0000-4000-8000-000000000001', '2025-12-01 12:00:00+00'),
  ('a5000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'a4000000-0000-4000-8000-000000000001', 'BAL-02',
   'Balanza 2', 'a3000000-0000-4000-8000-000000000001', 'operational', 'a2000000-0000-4000-8000-000000000001', '2025-12-01 12:00:00+00'),
  ('b5000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'b4000000-0000-4000-8000-000000000001', 'BAL-01',
   'Balanza de B', 'b3000000-0000-4000-8000-000000000001', 'operational', 'b2000000-0000-4000-8000-000000000001', '2025-12-01 12:00:00+00');
insert into incidents.cases (id, workspace_id, module_code, asset_id, fault_type, description, usable, reported_by_principal_id) values
  ('ac000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'equipment', 'a5000000-0000-4000-8000-000000000001',
   'electrical', 'No enciende', false, 'a2000000-0000-4000-8000-000000000002'),
  ('bc000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'equipment', 'b5000000-0000-4000-8000-000000000001',
   'mechanical', 'Plato flojo', true, 'b2000000-0000-4000-8000-000000000001');
-- Plan mensual de calibración por tipo desde el 31-01: con el registro del 01-03 toca el 01-04.
insert into maintenance.plans
  (id, workspace_id, kind, title, asset_type_id, interval_count, interval_unit, starts_on, created_by_principal_id)
values
  ('a7000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'calibration', 'Calibración mensual',
   'a4000000-0000-4000-8000-000000000001', 1, 'month', '2026-01-31', 'a2000000-0000-4000-8000-000000000001');
insert into maintenance.records (id, workspace_id, asset_id, plan_id, plan_version, kind, performed_on, result, recorded_by_principal_id) values
  ('a9000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001',
   'a7000000-0000-4000-8000-000000000001', 1, 'calibration', '2026-03-01', 'pass', 'a2000000-0000-4000-8000-000000000002'),
  ('a9000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000002',
   'a7000000-0000-4000-8000-000000000001', 1, 'calibration', '2026-03-01', 'pass', 'a2000000-0000-4000-8000-000000000002'),
  ('b9000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'b5000000-0000-4000-8000-000000000001',
   null, null, 'cleaning', '2026-03-01', 'pass', 'b2000000-0000-4000-8000-000000000001');
insert into maintenance.record_certificates (id, workspace_id, record_id, object_path, url, byte_size, sha256, uploaded_by_principal_id) values
  ('aa000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a9000000-0000-4000-8000-000000000001',
   'a0000000-0000-4000-8000-00000000000a/maintenance/certificates/aa000000-0000-4000-8000-000000000001.pdf',
   'https://storage.example.org/aa000000-0000-4000-8000-000000000001.pdf', 2048, repeat('a', 64), 'a2000000-0000-4000-8000-000000000002');

select is(
  (select count(*)::int from core.role_permissions where permission_code = 'maintenance.record.void' and role_code = 'admin')
    + (select count(*)::int from core.role_permissions where permission_code = 'maintenance.record.void'),
  2, 'anular y corregir es solo del Administrador');

set local role platlab_api;
select set_config('platlab.workspace_id', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config('platlab.principal_id', 'a2000000-0000-4000-8000-000000000001', true);

-- ---------------------------------------------------------------------------
-- Correctivo: sin plan, con «qué se hizo», y el incidente solo en un correctivo y del mismo espacio
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into maintenance.records (workspace_id, asset_id, kind, performed_on, result, observations, recorded_by_principal_id, fault_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'corrective', '2026-03-05', 'pass',
             'Cambio de fusible', 'a2000000-0000-4000-8000-000000000001', 'ac000000-0000-4000-8000-000000000001') $$,
  'el runtime registra un correctivo que atiende el incidente del equipo');

select throws_ok(
  $$ insert into maintenance.records (workspace_id, asset_id, kind, performed_on, result, recorded_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'corrective', '2026-03-05', 'pass',
             'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'un correctivo dice qué se hizo');

select throws_ok(
  $$ insert into maintenance.records (workspace_id, asset_id, plan_id, plan_version, kind, performed_on, result, observations, recorded_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000001', 1,
             'corrective', '2026-03-05', 'pass', 'Ajuste', 'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'un correctivo no tiene plan');

select throws_ok(
  $$ insert into maintenance.records (workspace_id, asset_id, kind, performed_on, result, recorded_by_principal_id, fault_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'cleaning', '2026-03-05', 'pass',
             'a2000000-0000-4000-8000-000000000001', 'ac000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'solo un correctivo atiende un incidente');

select throws_ok(
  $$ insert into maintenance.records (workspace_id, asset_id, kind, performed_on, result, observations, recorded_by_principal_id, fault_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'corrective', '2026-03-05', 'pass',
             'Ajuste', 'a2000000-0000-4000-8000-000000000001', 'bc000000-0000-4000-8000-000000000001') $$,
  '23503', null, 'un correctivo no atiende un incidente de otro espacio');

-- ---------------------------------------------------------------------------
-- Anular: motivo, quién y cuándo, una sola vez y nada más; la próxima fecha deja de contarlo
-- ---------------------------------------------------------------------------

select is(
  (select due_on from maintenance.plan_assets where plan_id = 'a7000000-0000-4000-8000-000000000001'
     and asset_id = 'a5000000-0000-4000-8000-000000000001'),
  '2026-04-01'::date, 'antes de anular, BAL-01 toca un mes después de su registro');

select lives_ok(
  $$ update maintenance.records
        set voided_at = now(), voided_by_principal_id = 'a2000000-0000-4000-8000-000000000001', void_reason = 'Fecha equivocada'
      where id = 'a9000000-0000-4000-8000-000000000001' $$,
  'el runtime anula un registro con motivo, a nombre de quien lo hace');

select is(
  (select due_on from maintenance.plan_assets where plan_id = 'a7000000-0000-4000-8000-000000000001'
     and asset_id = 'a5000000-0000-4000-8000-000000000001'),
  '2026-01-31'::date, 'anulado, el registro deja de contar: BAL-01 vuelve a tocar en el inicio del plan');

update maintenance.records set void_reason = 'Otro motivo' where id = 'a9000000-0000-4000-8000-000000000001';
select is(
  (select void_reason from maintenance.records where id = 'a9000000-0000-4000-8000-000000000001'),
  'Fecha equivocada', 'un anulado no se vuelve a anular ni cambia su motivo');

select throws_ok(
  $$ update maintenance.records
        set voided_at = now(), voided_by_principal_id = 'a2000000-0000-4000-8000-000000000002', void_reason = 'Ajeno'
      where id = 'a9000000-0000-4000-8000-000000000002' $$,
  '42501', null, 'la anulación queda a nombre de quien la hace');

select throws_ok(
  $$ update maintenance.records
        set voided_at = now(), voided_by_principal_id = 'a2000000-0000-4000-8000-000000000001'
      where id = 'a9000000-0000-4000-8000-000000000002' $$,
  '23514', null, 'anular exige el motivo');

select throws_ok(
  $$ update maintenance.records set result = 'fail' where id = 'a9000000-0000-4000-8000-000000000002' $$,
  '42501', null, 'anular es lo único que cambia de un registro');

update maintenance.records
   set voided_at = now(), voided_by_principal_id = 'a2000000-0000-4000-8000-000000000001', void_reason = 'Ajeno'
 where id = 'b9000000-0000-4000-8000-000000000001';

-- ---------------------------------------------------------------------------
-- Corrección: del mismo equipo, una por registro, con el certificado del anulado
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ insert into maintenance.records (workspace_id, asset_id, plan_id, plan_version, kind, performed_on, result, recorded_by_principal_id,
                                      corrects_record_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000002', 'a7000000-0000-4000-8000-000000000001', 1,
             'calibration', '2026-02-28', 'pass', 'a2000000-0000-4000-8000-000000000001', 'a9000000-0000-4000-8000-000000000001') $$,
  '23503', null, 'la corrección es del mismo equipo que el anulado');

select lives_ok(
  $$ insert into maintenance.records (id, workspace_id, asset_id, plan_id, plan_version, kind, performed_on, result, recorded_by_principal_id,
                                      corrects_record_id)
     values ('a9000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001',
             'a7000000-0000-4000-8000-000000000001', 1, 'calibration', '2026-02-28', 'pass', 'a2000000-0000-4000-8000-000000000001',
             'a9000000-0000-4000-8000-000000000001') $$,
  'el runtime registra la corrección de un anulado');

select is(
  (select due_on from maintenance.plan_assets where plan_id = 'a7000000-0000-4000-8000-000000000001'
     and asset_id = 'a5000000-0000-4000-8000-000000000001'),
  '2026-03-28'::date, 'la próxima fecha sale de la corrección');

select throws_ok(
  $$ insert into maintenance.records (workspace_id, asset_id, plan_id, plan_version, kind, performed_on, result, recorded_by_principal_id,
                                      corrects_record_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000001', 1,
             'calibration', '2026-02-27', 'pass', 'a2000000-0000-4000-8000-000000000001', 'a9000000-0000-4000-8000-000000000001') $$,
  '23505', null, 'un registro se corrige una sola vez');

select lives_ok(
  $$ insert into maintenance.record_certificates (workspace_id, record_id, object_path, url, byte_size, sha256, uploaded_by_principal_id,
                                                  carried_from_id)
     select workspace_id, 'a9000000-0000-4000-8000-000000000003', object_path, url, byte_size, sha256,
            'a2000000-0000-4000-8000-000000000001', id
       from maintenance.record_certificates where id = 'aa000000-0000-4000-8000-000000000001' $$,
  'la corrección lleva el certificado del anulado, con el mismo archivo');

select throws_ok(
  $$ insert into maintenance.record_certificates (workspace_id, record_id, object_path, url, byte_size, sha256, uploaded_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a9000000-0000-4000-8000-000000000002',
             'a0000000-0000-4000-8000-00000000000a/maintenance/certificates/aa000000-0000-4000-8000-000000000001.pdf',
             'https://storage.example.org/otro.pdf', 10, repeat('b', 64), 'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'un certificado propio no toma el archivo de otro');

select throws_ok(
  $$ insert into maintenance.record_certificates (workspace_id, record_id, object_path, url, byte_size, sha256, uploaded_by_principal_id,
                                                  carried_from_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a9000000-0000-4000-8000-000000000002',
             'b0000000-0000-4000-8000-00000000000b/maintenance/certificates/x.pdf', 'https://storage.example.org/x.pdf', 10,
             repeat('c', 64), 'a2000000-0000-4000-8000-000000000001', 'aa000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'un certificado llevado sigue siendo un archivo del espacio');

select is((select count(*)::int from maintenance.records), 4, 'RLS: el runtime solo ve los registros de su espacio');

reset role;

select is(
  (select voided_at from maintenance.records where id = 'b9000000-0000-4000-8000-000000000001'),
  null, 'el runtime no anula registros de otro espacio');

select is(
  (select count(*)::int from maintenance.record_certificates where carried_from_id is null
     and object_path like 'a0000000-0000-4000-8000-00000000000a/%'),
  1, 'el archivo del certificado llevado no se duplica');

select * from finish();
rollback;
