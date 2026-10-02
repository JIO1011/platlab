-- T-04/T-05: ambiente, contrato mínimo, derechos, estado operativo, auditoría e idempotencia
-- (docs/02_arquitectura.md §6–§7, docs/03_datos.md §3, ADR 0002 y 0009).
begin;
create extension if not exists pgtap with schema extensions;

select plan(44);

grant usage on schema extensions to platlab_api;
grant platlab_api to postgres with set true, inherit false;

-- ---------------------------------------------------------------------------
-- Fixtures sintéticos: A y B activos, cada uno con propietario y un miembro operador
-- ---------------------------------------------------------------------------

insert into platform.customer_accounts (id, legal_name)
values ('c0000000-0000-4000-8000-000000000001', 'Titular sintético');

insert into core.workspaces (id, customer_account_id, code, name, time_zone) values
  ('a0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000001', 'ent-a', 'Espacio A', 'America/Guayaquil'),
  ('b0000000-0000-4000-8000-00000000000b', 'c0000000-0000-4000-8000-000000000001', 'ent-b', 'Espacio B', 'America/Guayaquil');

insert into core.identities (id, provider, provider_subject, display_name) values
  ('10000000-0000-4000-8000-000000000001', 'supabase', 'ent-owner-a', 'Propietaria de A'),
  ('10000000-0000-4000-8000-000000000002', 'supabase', 'ent-member-a', 'Operador de A'),
  ('10000000-0000-4000-8000-000000000003', 'supabase', 'ent-owner-b', 'Propietario de B');

insert into core.memberships (id, workspace_id, identity_id) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000001'),
  ('a1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000002'),
  ('b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-000000000003');

insert into core.principals (id, workspace_id, kind, membership_id) values
  ('a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'member', 'a1000000-0000-4000-8000-000000000001'),
  ('a2000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'member', 'a1000000-0000-4000-8000-000000000002'),
  ('b2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'member', 'b1000000-0000-4000-8000-000000000001');

update core.workspaces set owner_membership_id = 'a1000000-0000-4000-8000-000000000001', status = 'active'
 where id = 'a0000000-0000-4000-8000-00000000000a';
update core.workspaces set owner_membership_id = 'b1000000-0000-4000-8000-000000000001', status = 'active'
 where id = 'b0000000-0000-4000-8000-00000000000b';

insert into platform.contracts (id, workspace_id) values
  ('a4000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a'),
  ('b4000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b');

insert into platform.contract_revisions (id, workspace_id, contract_id, revision_number, kind) values
  ('a5000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a4000000-0000-4000-8000-000000000001', 1, 'demo'),
  ('a5000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'a4000000-0000-4000-8000-000000000001', 2, 'demo'),
  ('a5000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-00000000000a', 'a4000000-0000-4000-8000-000000000001', 3, 'demo'),
  ('a5000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-00000000000a', 'a4000000-0000-4000-8000-000000000001', 4, 'demo');

insert into platform.contract_revision_modules (workspace_id, revision_id, module_code, valid_from, valid_until) values
  ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'reagents', now() - interval '1 day', null),
  ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000003', 'reagents', now() - interval '1 day', now() + interval '30 days'),
  ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000004', 'reagents', now() - interval '1 day', null);
-- La revisión 2 de A no incluye Reactivos: lo retiraría.

-- ---------------------------------------------------------------------------
-- Ambiente y privilegios
-- ---------------------------------------------------------------------------

select is(
  (select column_default from information_schema.columns
    where table_schema = 'platform' and table_name = 'environment' and column_name = 'data_class'),
  '''real''::text', 'una base nueva nace como ambiente de datos reales');

select is((select data_class from platform.environment), 'synthetic',
  'el seed local y de CI marca el ambiente como sintético');

select ok(
  not has_table_privilege('platlab_api', 'platform.contracts', 'SELECT')
    and not has_table_privilege('platlab_api', 'platform.contract_revisions', 'SELECT')
    and not has_table_privilege('platlab_api', 'platform.contract_revision_modules', 'SELECT'),
  'el runtime no lee contratos ni revisiones');

select ok(
  not has_function_privilege('platlab_api', 'platform.apply_contract_revision(uuid, text)', 'EXECUTE')
    and not has_function_privilege('platlab_api', 'platform.set_module_status(uuid, text, text)', 'EXECUTE'),
  'el runtime no aplica contratos ni cambia el estado de un módulo');

select ok(
  has_function_privilege('platlab_api', 'core.admission(text, text[], text[])', 'EXECUTE')
    and has_function_privilege('platlab_api', 'core.workspace_axis(text, text)', 'EXECUTE'),
  'el runtime evalúa la admisión');

select results_eq(
  'select code, stage from core.module_definitions',
  $$ values ('reagents'::text, 'pilot'::text) $$,
  'Reactivos está registrado en etapa pilot (V-00)');

-- ---------------------------------------------------------------------------
-- apply_contract_revision
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ select platform.apply_contract_revision('a5000000-0000-4000-8000-000000000001', 'pgtap') $$,
  'aplica la primera revisión demo con Reactivos en un ambiente sintético');

select results_eq(
  $$ select status, contract_kind, revision_id, version from core.workspace_entitlements
      where workspace_id = 'a0000000-0000-4000-8000-00000000000a' $$,
  $$ values ('enabled'::text, 'demo'::text, 'a5000000-0000-4000-8000-000000000001'::uuid, 1) $$,
  'proyecta un derecho habilitado ligado a la revisión');

select lives_ok(
  $$ select platform.apply_contract_revision('a5000000-0000-4000-8000-000000000001', 'pgtap') $$,
  'repetir una revisión aplicada no falla');

select is(
  (select version from core.workspace_entitlements where workspace_id = 'a0000000-0000-4000-8000-00000000000a'),
  1, 'repetir una revisión aplicada no cambia el derecho');

select throws_ok(
  $$ update platform.contract_revisions set kind = 'standard' where id = 'a5000000-0000-4000-8000-000000000001' $$,
  '55000', null, 'una revisión aplicada no cambia');

select throws_ok(
  $$ update platform.contract_revision_modules set valid_until = now() + interval '1 day'
      where revision_id = 'a5000000-0000-4000-8000-000000000001' $$,
  '55000', null, 'los módulos de una revisión aplicada no cambian');

select throws_ok(
  $$ select platform.apply_contract_revision('a5000000-0000-4000-8000-000000000003', 'pgtap') $$,
  '55000', null, 'las revisiones se aplican en orden');

select throws_ok(
  $$ select platform.apply_contract_revision('a5000000-0000-4000-8000-000000000002', 'pgtap') $$,
  '0A000', null, 'retirar un módulo por revisión todavía no se admite');

-- La revisión 2 quedó en borrador: se completa y entonces sí se aplica, seguida de la 3.
insert into platform.contract_revision_modules (workspace_id, revision_id, module_code, valid_from)
values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000002', 'reagents', now() - interval '1 day');

select lives_ok(
  $$ select platform.apply_contract_revision('a5000000-0000-4000-8000-000000000002', 'pgtap');
     select platform.apply_contract_revision('a5000000-0000-4000-8000-000000000003', 'pgtap') $$,
  'aplica las revisiones siguientes en orden');

select results_eq(
  $$ select revision_id, version, valid_until is not null from core.workspace_entitlements
      where workspace_id = 'a0000000-0000-4000-8000-00000000000a' $$,
  $$ values ('a5000000-0000-4000-8000-000000000003'::uuid, 3, true) $$,
  'cada revisión actualiza la vigencia y la versión del derecho');

select throws_ok(
  $$ insert into platform.contract_revision_modules (workspace_id, revision_id, module_code, valid_from)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000004', 'reagents', now()) $$,
  '23505', null, 'un módulo aparece una sola vez por revisión');

select throws_ok(
  $$ insert into platform.contract_revision_modules (workspace_id, revision_id, module_code, valid_from, closing_until)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000004', 'reagents', now(), now()) $$,
  '23514', null, 'un periodo de cierre exige una fecha de vencimiento');

-- Ambiente real: los contratos demo, la etapa development y la etapa pilot en un contrato estándar
-- se rechazan.
update platform.environment set data_class = 'real';

insert into platform.contract_revisions (id, workspace_id, contract_id, revision_number, kind) values
  ('b5000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'b4000000-0000-4000-8000-000000000001', 1, 'demo');
insert into platform.contract_revision_modules (workspace_id, revision_id, module_code, valid_from)
values ('b0000000-0000-4000-8000-00000000000b', 'b5000000-0000-4000-8000-000000000001', 'reagents', now());

select throws_ok(
  $$ select platform.apply_contract_revision('b5000000-0000-4000-8000-000000000001', 'pgtap') $$,
  '23514', 'Un contrato demo solo se aplica en un ambiente sintético',
  'en un ambiente real no se aplica un contrato demo');

-- La regla de development se prueba con un módulo de prueba, solo dentro de esta transacción.
insert into core.module_definitions (code, name, stage) values ('test_development', 'En desarrollo de prueba', 'development');
delete from platform.contract_revision_modules where revision_id = 'b5000000-0000-4000-8000-000000000001';
update platform.contract_revisions set kind = 'pilot' where id = 'b5000000-0000-4000-8000-000000000001';
insert into platform.contract_revision_modules (workspace_id, revision_id, module_code, valid_from)
values ('b0000000-0000-4000-8000-00000000000b', 'b5000000-0000-4000-8000-000000000001', 'test_development', now());

select throws_like(
  $$ select platform.apply_contract_revision('b5000000-0000-4000-8000-000000000001', 'pgtap') $$,
  'Etapa no admitida%test_development (development)%',
  'en un ambiente real ni un contrato de piloto habilita un módulo en development');

delete from platform.contract_revision_modules where revision_id = 'b5000000-0000-4000-8000-000000000001';
update platform.contract_revisions set kind = 'standard' where id = 'b5000000-0000-4000-8000-000000000001';
insert into platform.contract_revision_modules (workspace_id, revision_id, module_code, valid_from)
values ('b0000000-0000-4000-8000-00000000000b', 'b5000000-0000-4000-8000-000000000001', 'reagents', now());

select throws_like(
  $$ select platform.apply_contract_revision('b5000000-0000-4000-8000-000000000001', 'pgtap') $$,
  'Etapa no admitida para un contrato standard%reagents (pilot)%',
  'en un ambiente real, Reactivos en pilot no entra en un contrato estándar hasta su G2');

update platform.contract_revisions set kind = 'pilot' where id = 'b5000000-0000-4000-8000-000000000001';
update platform.environment set data_class = 'synthetic';

-- Dependencias: módulos de prueba solo dentro de esta transacción.
insert into core.module_definitions (code, name, stage) values
  ('test_base', 'Base de prueba', 'general'), ('test_dependent', 'Dependiente de prueba', 'general');
insert into core.module_dependencies (module_code, requires_code) values ('test_dependent', 'test_base');
insert into platform.contract_revision_modules (workspace_id, revision_id, module_code, valid_from)
values ('b0000000-0000-4000-8000-00000000000b', 'b5000000-0000-4000-8000-000000000001', 'test_dependent', now());

select throws_like(
  $$ select platform.apply_contract_revision('b5000000-0000-4000-8000-000000000001', 'pgtap') $$,
  'Faltan dependencias%test_dependent → test_base%',
  'una revisión no habilita un módulo sin sus dependencias');

insert into platform.contract_revision_modules (workspace_id, revision_id, module_code, valid_from)
values ('b0000000-0000-4000-8000-00000000000b', 'b5000000-0000-4000-8000-000000000001', 'test_base', now());

select lives_ok(
  $$ select platform.apply_contract_revision('b5000000-0000-4000-8000-000000000001', 'pgtap') $$,
  'con sus dependencias, la revisión de piloto se aplica en un ambiente sintético');

-- ---------------------------------------------------------------------------
-- set_module_status
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ select platform.set_module_status('b0000000-0000-4000-8000-00000000000b', 'test_base', 'disabled') $$,
  '55000', null, 'no se apaga una dependencia mientras su dependiente admite operaciones nuevas');

select lives_ok(
  $$ select platform.set_module_status('b0000000-0000-4000-8000-00000000000b', 'test_dependent', 'read_only');
     select platform.set_module_status('b0000000-0000-4000-8000-00000000000b', 'test_base', 'disabled') $$,
  'con el dependiente en consulta, la dependencia se puede apagar');

select throws_ok(
  $$ select platform.set_module_status('a0000000-0000-4000-8000-00000000000a', 'test_base', 'disabled') $$,
  'P0002', null, 'no se cambia el estado de un módulo sin derecho');

select throws_ok(
  $$ select platform.set_module_status('a0000000-0000-4000-8000-00000000000a', 'reagents', 'paused') $$,
  '23514', null, 'el estado operativo desconocido se rechaza');

select throws_ok(
  $$ insert into core.workspace_entitlements (workspace_id, module_code, status, contract_kind, valid_from, revision_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'test_base', 'enabled', 'pilot', now(), 'b5000000-0000-4000-8000-000000000001') $$,
  '23503', null, 'un derecho de A no apunta a una revisión de B');

select throws_ok(
  $$ insert into platform.contract_revision_modules (workspace_id, revision_id, module_code, valid_from, closing_until)
     values ('b0000000-0000-4000-8000-00000000000b', 'b5000000-0000-4000-8000-000000000001', 'reagents', now(), now()) $$,
  '55000', null, 'una revisión aplicada no admite módulos nuevos');

-- ---------------------------------------------------------------------------
-- RLS, auditoría e idempotencia bajo el rol real
-- ---------------------------------------------------------------------------

set local role platlab_api;
select set_config('platlab.workspace_id', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config('platlab.principal_id', 'a2000000-0000-4000-8000-000000000002', true);

select set_eq('select workspace_id from core.workspace_entitlements',
  array['a0000000-0000-4000-8000-00000000000a']::uuid[], 'con contexto A solo se ven los derechos de A');

select lives_ok(
  $$ select 1 from core.workspace_entitlements where module_code = 'reagents' for share $$,
  'la admisión puede bloquear el derecho de su contexto con FOR SHARE');

select throws_ok(
  $$ update core.workspace_entitlements set status = 'enabled' $$,
  '42501', null, 'el runtime no cambia el estado de un derecho');

select lives_ok(
  $$ insert into core.audit_events (workspace_id, actor_principal_id, action, entity_type, correlation_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000002',
             'reagents.test.create', 'reagents.test', gen_random_uuid()) $$,
  'el runtime audita como el principal de su contexto');

select throws_ok(
  $$ insert into core.audit_events (workspace_id, actor_principal_id, action, entity_type, correlation_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000001',
             'reagents.test.create', 'reagents.test', gen_random_uuid()) $$,
  '42501', null, 'el runtime no audita en nombre de otro principal');

select throws_ok(
  $$ insert into core.audit_events (workspace_id, actor_principal_id, action, entity_type, correlation_id)
     values ('b0000000-0000-4000-8000-00000000000b', 'b2000000-0000-4000-8000-000000000001',
             'reagents.test.create', 'reagents.test', gen_random_uuid()) $$,
  '42501', null, 'el runtime no audita en otro espacio');

select throws_ok(
  $$ update core.audit_events set reason = 'cambio' $$,
  '42501', null, 'la auditoría no se modifica');

select throws_ok(
  $$ delete from core.audit_events $$,
  '42501', null, 'la auditoría no se borra');

select throws_ok(
  $$ insert into core.audit_events (workspace_id, actor_principal_id, action, entity_type, correlation_id, changes)
     values ('a0000000-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000002',
             'reagents.test.create', 'reagents.test', gen_random_uuid(), '[1]') $$,
  '23514', null, 'los cambios auditados son un objeto');

select lives_ok(
  $$ insert into platform.idempotency_records (workspace_id, principal_id, operation, key, request_hash)
     values ('a0000000-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000002',
             'reagents.test.create', 'clave-0001', repeat('a', 64));
     update platform.idempotency_records set response = '{"ok": true}' where key = 'clave-0001' $$,
  'el runtime reclama y completa su propia clave idempotente');

select throws_ok(
  $$ insert into platform.idempotency_records (workspace_id, principal_id, operation, key, request_hash)
     values ('a0000000-0000-4000-8000-00000000000a', 'a2000000-0000-4000-8000-000000000001',
             'reagents.test.create', 'clave-0002', repeat('a', 64)) $$,
  '42501', null, 'el runtime no reclama una clave en nombre de otro principal');

select throws_ok(
  $$ update platform.idempotency_records set request_hash = repeat('b', 64) where key = 'clave-0001' $$,
  '42501', null, 'el hash de una clave reclamada no cambia');

update platform.idempotency_records set response = '{"ok": false}' where key = 'clave-0001';

select is(
  (select response from platform.idempotency_records where key = 'clave-0001'),
  '{"ok": true}'::jsonb, 'una respuesta idempotente confirmada no cambia');

select set_config('platlab.principal_id', 'a2000000-0000-4000-8000-000000000001', true);

select is_empty('select key from platform.idempotency_records',
  'un principal no ve las claves idempotentes de otro');

select is_empty(
  $$ select id from core.workspace_entitlements where workspace_id = 'b0000000-0000-4000-8000-00000000000b' $$,
  'un derecho de B no es visible desde A');

reset role;

select * from finish();
rollback;
