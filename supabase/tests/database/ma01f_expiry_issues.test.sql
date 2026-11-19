-- MA-01f (ADR 0025): «vence» solo en consumibles y editable solo en esa columna, lote del proveedor único por ítem
-- y detalle de salida inmutable y aislado por espacio, bajo el rol de runtime.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

grant usage on schema extensions to platlab_api;
grant platlab_api to postgres with set true, inherit false;

-- ---------------------------------------------------------------------------
-- Fixtures sintéticos: A con un insumo, un reutilizable y una salida; B con su propia salida
-- ---------------------------------------------------------------------------

insert into platform.customer_accounts (id, legal_name)
values ('c0000000-0000-4000-8000-000000000001', 'Titular sintético');
insert into core.workspaces (id, customer_account_id, code, name, time_zone) values
  ('a0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000001', 'mf-a', 'A', 'America/Guayaquil'),
  ('b0000000-0000-4000-8000-00000000000b', 'c0000000-0000-4000-8000-000000000001', 'mf-b', 'B', 'America/Guayaquil');
-- Actores de servicio: el detalle solo exige un principal del mismo espacio.
insert into core.principals (id, workspace_id, kind, service_code) values
  ('f0000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-00000000000a', 'service', 'mf_test'),
  ('f0000000-0000-4000-8000-00000000000b', 'b0000000-0000-4000-8000-00000000000b', 'service', 'mf_test');
insert into inventory.items (id, workspace_id, kind, code, name, base_unit) values
  ('a5000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'material', 'AGU-01', 'Agujas', 'u'),
  ('a5000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'material', 'PIN-01', 'Pinzas', 'u');
insert into materials.products (workspace_id, item_id, class) values
  ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'consumable'),
  ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000002', 'reusable_counted');
insert into inventory.lots (workspace_id, item_id, code, supplier_lot, expires_on)
values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'L-001', 'D321', '2027-11-16');
insert into inventory.operations (id, workspace_id, type, actor_principal_id, reason, destination, correlation_id) values
  ('0a000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'issue',
   'f0000000-0000-4000-8000-00000000000a', 'Práctica 3', 'Práctica', gen_random_uuid()),
  ('0a000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'issue',
   'f0000000-0000-4000-8000-00000000000a', 'Práctica 4', 'Práctica', gen_random_uuid()),
  ('0b000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'issue',
   'f0000000-0000-4000-8000-00000000000b', 'Botiquín', 'General', gen_random_uuid()),
  ('0b000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-00000000000b', 'issue',
   'f0000000-0000-4000-8000-00000000000b', 'Clínica 2', 'Clínica', gen_random_uuid());
insert into materials.issue_details (workspace_id, operation_id, purpose)
values ('b0000000-0000-4000-8000-00000000000b', '0b000000-0000-4000-8000-000000000001', 'general');

set local role platlab_api;
select set_config('platlab.workspace_id', 'a0000000-0000-4000-8000-00000000000a', true);

select lives_ok(
  $$ update materials.products set tracks_expiry = true where item_id = 'a5000000-0000-4000-8000-000000000001' $$,
  'el runtime marca que un insumo vence');

select throws_ok(
  $$ update materials.products set tracks_expiry = true where item_id = 'a5000000-0000-4000-8000-000000000002' $$,
  '23514', null, 'un reutilizable no vence');

select throws_ok(
  $$ update materials.products set class = 'reusable_counted' where item_id = 'a5000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'la clase sigue sin editarse');

select throws_ok(
  $$ insert into inventory.lots (workspace_id, item_id, code, supplier_lot, expires_on)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'L-002', 'd321', '2028-01-01') $$,
  '23505', null, 'el lote del proveedor no se repite en un ítem, sin distinguir mayúsculas');

select lives_ok(
  $$ insert into materials.issue_details (workspace_id, operation_id, purpose, requester_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', '0a000000-0000-4000-8000-000000000001', 'clinic',
             'f0000000-0000-4000-8000-00000000000a') $$,
  'el runtime guarda el tipo y el solicitante de una salida del espacio');

select throws_ok(
  $$ insert into materials.issue_details (workspace_id, operation_id, purpose)
     values ('a0000000-0000-4000-8000-00000000000a', '0a000000-0000-4000-8000-000000000001', 'general') $$,
  '23505', null, 'una salida tiene un solo detalle');

select throws_ok(
  $$ insert into materials.issue_details (workspace_id, operation_id, purpose)
     values ('b0000000-0000-4000-8000-00000000000b', '0b000000-0000-4000-8000-000000000001', 'general') $$,
  '42501', null, 'el runtime no escribe detalles en otro espacio');

select throws_ok(
  $$ insert into materials.issue_details (workspace_id, operation_id, purpose)
     values ('a0000000-0000-4000-8000-00000000000a', '0b000000-0000-4000-8000-000000000002', 'general') $$,
  '23503', null, 'un detalle no cuelga de una salida de otro espacio');

select throws_ok(
  $$ insert into materials.issue_details (workspace_id, operation_id, purpose, requester_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', '0a000000-0000-4000-8000-000000000002', 'practice',
             'f0000000-0000-4000-8000-00000000000b') $$,
  '23503', null, 'el solicitante es un principal del mismo espacio');

select is(
  (select count(*)::int from materials.issue_details), 1,
  'solo se ve el detalle de las salidas del espacio de contexto');

select throws_ok(
  $$ update materials.issue_details set purpose = 'general' $$,
  '42501', null, 'el detalle de una salida confirmada no se edita');

select throws_ok(
  $$ delete from materials.issue_details $$,
  '42501', null, 'nadie borra el detalle de una salida');

select * from finish();
rollback;
