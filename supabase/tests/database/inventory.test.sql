-- R-00: ledger de inventario y detalle de Reactivos bajo el rol real de runtime
-- (docs/03_datos.md §1 y §4, primer incremento «Datos y reglas mínimas»).
begin;
create extension if not exists pgtap with schema extensions;

select plan(36);

grant usage on schema extensions to platlab_api;
grant platlab_api to postgres with set true, inherit false;

-- ---------------------------------------------------------------------------
-- Fixtures sintéticos: A y B con un reactivo, un lote y una ubicación cada uno
-- ---------------------------------------------------------------------------

insert into platform.customer_accounts (id, legal_name)
values ('c0000000-0000-4000-8000-000000000001', 'Titular sintético');
insert into core.workspaces (id, customer_account_id, code, name, time_zone) values
  ('a0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000001', 'inv-a', 'A', 'America/Guayaquil'),
  ('b0000000-0000-4000-8000-00000000000b', 'c0000000-0000-4000-8000-000000000001', 'inv-b', 'B', 'America/Guayaquil');
insert into core.identities (id, provider, provider_subject, display_name) values
  ('10000000-0000-4000-8000-000000000001', 'supabase', 'inv-a', 'Operador A'),
  ('10000000-0000-4000-8000-000000000002', 'supabase', 'inv-b', 'Operador B');
insert into core.memberships (id, workspace_id, identity_id) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000001'),
  ('b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-000000000002');
insert into core.principals (id, workspace_id, kind, membership_id) values
  ('a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'member', 'a1000000-0000-4000-8000-000000000001'),
  ('b2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'member', 'b1000000-0000-4000-8000-000000000001');
update core.workspaces set owner_membership_id = 'a1000000-0000-4000-8000-000000000001', status = 'active'
 where id = 'a0000000-0000-4000-8000-00000000000a';
update core.workspaces set owner_membership_id = 'b1000000-0000-4000-8000-000000000001', status = 'active'
 where id = 'b0000000-0000-4000-8000-00000000000b';
insert into core.locations (id, workspace_id, kind, code, name) values
  ('a3000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'storage', 'ALM', 'Almacén A'),
  ('b3000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'storage', 'ALM', 'Almacén B');

insert into inventory.items (id, workspace_id, kind, code, name, base_unit) values
  ('a6000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'reagent', 'NACL', 'Cloruro de sodio', 'g'),
  ('a6000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'reagent', 'ETOH', 'Etanol', 'mL'),
  ('a6000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-00000000000a', 'material', 'PIPETA', 'Pipeta', 'u'),
  ('b6000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'reagent', 'NACL', 'Cloruro de sodio', 'g');
insert into reagents.products (workspace_id, item_id, cas_number) values
  ('a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000001', '7647-14-5');
insert into inventory.lots (id, workspace_id, item_id, code) values
  ('a7000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000001', 'L-001'),
  ('a7000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000002', 'L-001'),
  ('b7000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'b6000000-0000-4000-8000-000000000001', 'L-001');
insert into inventory.positions (id, workspace_id, item_id, lot_id, location_id) values
  ('a8000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001'),
  ('b8000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'b6000000-0000-4000-8000-000000000001', 'b7000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000001');

-- Desde aquí, las restricciones diferidas (saldo = asientos) se comprueban en cada sentencia.
set constraints all immediate;

-- ---------------------------------------------------------------------------
-- Estructura y privilegios
-- ---------------------------------------------------------------------------

select tables_are('inventory', array['units', 'items', 'lots', 'positions', 'operations', 'entries'],
  'inventory contiene solo las tablas de R-00');
select tables_are('reagents', array['products'], 'reagents contiene solo el detalle químico');

select is(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('inventory', 'reagents') and c.relkind = 'r' and not c.relrowsecurity),
  0, 'todas las tablas de inventory y reagents tienen RLS');

select is(
  (select count(*)::int from information_schema.role_table_grants
    where table_schema in ('inventory', 'reagents')
      and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')),
  0, 'PUBLIC, anon, authenticated y service_role no tienen privilegios en inventory ni reagents');

select set_eq(
  $$ select table_schema::text || '.' || table_name::text || ' ' || privilege_type::text
       from information_schema.role_table_grants
      where grantee = 'platlab_api' and table_schema in ('inventory', 'reagents')
        and privilege_type <> 'SELECT' $$,
  array['inventory.items INSERT', 'inventory.lots INSERT', 'inventory.positions INSERT',
        'inventory.entries INSERT', 'reagents.products INSERT'],
  'el runtime solo inserta; sin UPDATE de tabla, DELETE ni TRUNCATE');

select set_eq(
  $$ select table_name::text || '.' || column_name::text || ' ' || privilege_type::text
       from information_schema.column_privileges
      where grantee = 'platlab_api' and table_schema = 'inventory'
        and privilege_type in ('INSERT', 'UPDATE')
        and table_name in ('positions', 'operations')
        and not (table_name = 'positions' and privilege_type = 'INSERT') $$,
  array['positions.balance UPDATE', 'positions.version UPDATE',
        'operations.workspace_id INSERT', 'operations.type INSERT', 'operations.actor_principal_id INSERT',
        'operations.reason INSERT', 'operations.destination INSERT', 'operations.reference INSERT',
        'operations.correlation_id INSERT'],
  'el runtime solo cambia saldo y versión, y no fija la fecha de una operación');

select results_eq(
  'select code from core.permissions where module_code = ''reagents'' order by code',
  array['reagents.adjustment.create', 'reagents.catalog.manage', 'reagents.catalog.read',
        'reagents.issue.create', 'reagents.receipt.create'],
  'los permisos de Reactivos están en el catálogo');

select set_eq(
  'select permission_code from core.role_permissions where role_code = ''operator''',
  array['reagents.catalog.read', 'reagents.receipt.create', 'reagents.issue.create'],
  'el Operador no ajusta ni administra el catálogo (01 §5)');

-- ---------------------------------------------------------------------------
-- Aislamiento y tipos
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ insert into inventory.lots (workspace_id, item_id, code)
     values ('a0000000-0000-4000-8000-00000000000a', 'b6000000-0000-4000-8000-000000000001', 'L-X') $$,
  '23503', null, 'un lote de A no pertenece a un ítem de B');

select throws_ok(
  $$ insert into inventory.positions (workspace_id, item_id, lot_id, location_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000001',
             'a7000000-0000-4000-8000-000000000002', 'a3000000-0000-4000-8000-000000000001') $$,
  '23503', null, 'una posición no usa el lote de otro ítem');

select throws_ok(
  $$ insert into inventory.positions (workspace_id, item_id, lot_id, location_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000001',
             'a7000000-0000-4000-8000-000000000001', 'b3000000-0000-4000-8000-000000000001') $$,
  '23503', null, 'una posición de A no usa una ubicación de B');

select throws_ok(
  $$ insert into reagents.products (workspace_id, item_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000003') $$,
  '23503', null, 'un material no puede tener detalle de reactivo');

select throws_ok(
  $$ insert into inventory.positions (workspace_id, item_id, lot_id, location_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000001',
             'a7000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001') $$,
  '23505', null, 'la clave de la posición no se duplica');

select throws_ok(
  $$ insert into inventory.items (workspace_id, kind, code, name, base_unit)
     values ('a0000000-0000-4000-8000-00000000000a', 'reagent', 'nacl', 'Duplicado', 'g') $$,
  '23505', null, 'el código del ítem es único en el espacio sin distinguir mayúsculas');

select lives_ok(
  $$ insert into inventory.items (workspace_id, kind, code, name, base_unit)
     values ('b0000000-0000-4000-8000-00000000000b', 'reagent', 'ETOH', 'Etanol', 'mL') $$,
  'el mismo código puede existir en otro espacio');

select throws_ok(
  $$ insert into inventory.items (workspace_id, kind, code, name, base_unit)
     values ('a0000000-0000-4000-8000-00000000000a', 'reagent', 'X1', 'X', 'onzas') $$,
  '23503', null, 'la unidad base debe existir en el catálogo de unidades');

select throws_ok(
  $$ insert into reagents.products (workspace_id, item_id, cas_number)
     values ('a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000002', '64175') $$,
  '23514', null, 'el CAS, si se informa, tiene formato válido');

-- ---------------------------------------------------------------------------
-- Ledger: signo, saldo y asientos juntos
-- ---------------------------------------------------------------------------

insert into inventory.operations (id, workspace_id, type, actor_principal_id, correlation_id) values
  ('a9000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'receipt',
   'a2000000-0000-4000-8000-000000000001', gen_random_uuid());

select throws_ok(
  $$ insert into inventory.entries (workspace_id, operation_id, position_id, quantity, captured_quantity, captured_unit, balance_after)
     values ('a0000000-0000-4000-8000-00000000000a', 'a9000000-0000-4000-8000-000000000001',
             'a8000000-0000-4000-8000-000000000001', -5, -5, 'g', 0) $$,
  '23514', null, 'un ingreso no resta');

select throws_ok(
  $$ insert into inventory.entries (workspace_id, operation_id, position_id, quantity, captured_quantity, captured_unit, balance_after)
     values ('a0000000-0000-4000-8000-00000000000a', 'a9000000-0000-4000-8000-000000000001',
             'a8000000-0000-4000-8000-000000000001', 100, 100, 'g', 100) $$,
  '23514', null, 'un asiento sin su saldo no se acepta');

select throws_ok(
  $$ update inventory.positions set balance = 100 where id = 'a8000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'un saldo sin su asiento no se acepta');

select lives_ok(
  $$ with moved as (
       update inventory.positions set balance = balance + 100
        where id = 'a8000000-0000-4000-8000-000000000001' returning id, balance)
     insert into inventory.entries (workspace_id, operation_id, position_id, quantity, captured_quantity, captured_unit, balance_after)
     select 'a0000000-0000-4000-8000-00000000000a', 'a9000000-0000-4000-8000-000000000001', id, 100, 100, 'g', balance
       from moved $$,
  'asiento y saldo juntos se aceptan');

select throws_ok(
  $$ update inventory.positions set balance = -1 where id = 'a8000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'el saldo nunca es negativo');

select throws_ok(
  $$ insert into inventory.operations (workspace_id, type, actor_principal_id, correlation_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'issue', 'a2000000-0000-4000-8000-000000000001', gen_random_uuid()) $$,
  '23514', null, 'una salida exige motivo y destino');

select throws_ok(
  $$ insert into inventory.operations (workspace_id, type, actor_principal_id, correlation_id, reason)
     values ('a0000000-0000-4000-8000-00000000000a', 'adjustment', 'a2000000-0000-4000-8000-000000000001', gen_random_uuid(), null) $$,
  '23514', null, 'un ajuste exige motivo');

-- ---------------------------------------------------------------------------
-- Bajo el rol real de runtime
-- ---------------------------------------------------------------------------

set local role platlab_api;
select set_config('platlab.workspace_id', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config('platlab.principal_id', 'a2000000-0000-4000-8000-000000000001', true);

select set_eq(
  $$ select workspace_id from inventory.items union select workspace_id from inventory.positions
     union select workspace_id from inventory.entries union select workspace_id from reagents.products $$,
  array['a0000000-0000-4000-8000-00000000000a']::uuid[],
  'con contexto A solo se ven ítems, posiciones, asientos y detalles de A');

select is_empty(
  $$ select id from inventory.positions where id = 'b8000000-0000-4000-8000-000000000001' $$,
  'una posición de B no es visible desde A');

select lives_ok(
  $$ select id from inventory.positions where id = 'a8000000-0000-4000-8000-000000000001' for update $$,
  'el runtime bloquea una posición de su contexto');

select throws_ok(
  $$ insert into inventory.operations (workspace_id, type, actor_principal_id, correlation_id, effective_at)
     values ('a0000000-0000-4000-8000-00000000000a', 'receipt', 'a2000000-0000-4000-8000-000000000001',
             gen_random_uuid(), now() - interval '1 day') $$,
  '42501', null, 'el runtime no fija la fecha efectiva: no hay retrofechas');

select throws_ok(
  $$ insert into inventory.operations (workspace_id, type, actor_principal_id, correlation_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'receipt', 'b2000000-0000-4000-8000-000000000001', gen_random_uuid()) $$,
  '42501', null, 'el runtime no registra operaciones en nombre de otro principal');

select throws_ok(
  $$ insert into inventory.positions (workspace_id, item_id, lot_id, location_id, balance)
     values ('a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000002',
             'a7000000-0000-4000-8000-000000000002', 'a3000000-0000-4000-8000-000000000001', 50) $$,
  '42501', null, 'una posición nueva empieza en cero');

select set_config('platlab.principal_id', 'a2000000-0000-4000-8000-00000000000f', true);

select throws_ok(
  $$ insert into inventory.entries (workspace_id, operation_id, position_id, quantity, captured_quantity, captured_unit, balance_after)
     values ('a0000000-0000-4000-8000-00000000000a', 'a9000000-0000-4000-8000-000000000001',
             'a8000000-0000-4000-8000-000000000001', 1, 1, 'g', 101) $$,
  '42501', null, 'un asiento no se cuelga de la operación de otro actor');

select set_config('platlab.principal_id', 'a2000000-0000-4000-8000-000000000001', true);

select throws_ok(
  $$ update inventory.entries set quantity = 1 $$,
  '42501', null, 'los asientos son inmutables');

select throws_ok(
  $$ delete from inventory.operations $$,
  '42501', null, 'las operaciones no se borran');

select throws_ok(
  $$ update inventory.items set name = 'Otro' $$,
  '42501', null, 'el runtime no edita el catálogo en R-00');

select throws_ok(
  $$ update inventory.positions set location_id = 'a3000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'el runtime no cambia una posición de lugar');

select throws_ok(
  $$ insert into inventory.items (workspace_id, kind, code, name, base_unit)
     values ('b0000000-0000-4000-8000-00000000000b', 'reagent', 'NUEVO', 'Nuevo', 'g') $$,
  '42501', null, 'el runtime no crea ítems en otro espacio');

reset role;

select * from finish();
rollback;
