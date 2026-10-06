-- R-00: ledger de inventario y detalle de Reactivos bajo el rol real de runtime
-- (docs/03_datos.md §1 y §4, primer incremento «Datos y reglas mínimas»).
begin;
create extension if not exists pgtap with schema extensions;

select plan(82);

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

-- R-01A (ADR 0012): un frasco por lote en A y en B, y un motivo de B.
insert into inventory.containers (id, workspace_id, item_id, lot_id, seq, initial_quantity) values
  ('ac000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000001', 1, 500),
  ('bc000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'b6000000-0000-4000-8000-000000000001', 'b7000000-0000-4000-8000-000000000001', 1, 500);
insert into inventory.reasons (workspace_id, item_kind, kind, name) values
  ('b0000000-0000-4000-8000-00000000000b', 'reagent', 'issue', 'Motivo de B');

-- R-01A, entrega 2: otra persona en A (quien aprueba) y una solicitud pendiente en B.
insert into core.identities (id, provider, provider_subject, display_name) values
  ('10000000-0000-4000-8000-000000000003', 'supabase', 'inv-a2', 'Administradora A');
insert into core.memberships (id, workspace_id, identity_id) values
  ('a1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000003');
insert into core.principals (id, workspace_id, kind, membership_id) values
  ('a2000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'member', 'a1000000-0000-4000-8000-000000000002');
insert into inventory.allocations (id, workspace_id, position_id, quantity, reason, destination, requested_by_principal_id) values
  ('bd000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'b8000000-0000-4000-8000-000000000001',
   1, 'Práctica', 'Laboratorio', 'b2000000-0000-4000-8000-000000000001');

-- Desde aquí, las restricciones diferidas (saldo = asientos) se comprueban en cada sentencia.
set constraints all immediate;

-- ---------------------------------------------------------------------------
-- Estructura y privilegios
-- ---------------------------------------------------------------------------

select tables_are('inventory',
  array['units', 'items', 'lots', 'positions', 'operations', 'entries', 'containers', 'reasons', 'destinations',
        'allocations', 'lot_condition_changes'],
  'inventory contiene las tablas de R-00 y de R-01A');
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
        'inventory.entries INSERT', 'inventory.containers INSERT', 'reagents.products INSERT'],
  'el runtime solo inserta; sin UPDATE de tabla, DELETE ni TRUNCATE');

select set_eq(
  $$ select table_name::text || '.' || column_name::text || ' ' || privilege_type::text
       from information_schema.column_privileges
      where grantee = 'platlab_api' and table_schema = 'inventory'
        and privilege_type in ('INSERT', 'UPDATE')
        and table_name in ('positions', 'operations')
        and not (table_name = 'positions' and privilege_type = 'INSERT') $$,
  array['positions.balance UPDATE', 'positions.reserved UPDATE', 'positions.version UPDATE',
        'operations.workspace_id INSERT', 'operations.type INSERT', 'operations.actor_principal_id INSERT',
        'operations.reason INSERT', 'operations.destination INSERT', 'operations.reference INSERT',
        'operations.correlation_id INSERT', 'operations.requested_by_principal_id INSERT'],
  'el runtime solo cambia saldo, reservado y versión, y no fija la fecha de una operación');

select results_eq(
  'select code from core.permissions where module_code = ''reagents'' order by code',
  array['reagents.adjustment.create', 'reagents.catalog.manage', 'reagents.catalog.read',
        'reagents.issue.approve', 'reagents.issue.create', 'reagents.lot.manage', 'reagents.receipt.create'],
  'los permisos de Reactivos están en el catálogo');

select ok(
  exists (select 1 from core.role_permissions where role_code = 'admin' and permission_code = 'reagents.issue.approve')
  and exists (select 1 from core.role_permissions where role_code = 'admin' and permission_code = 'reagents.lot.manage'),
  'aprobar salidas y cambiar el estado del lote es del Administrador (ADR 0012)');

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
-- Frascos (R-01A, ADR 0012)
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ insert into inventory.containers (workspace_id, item_id, lot_id, seq, initial_quantity)
     values ('a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000001',
             'a7000000-0000-4000-8000-000000000002', 1, 10) $$,
  '23503', null, 'un frasco pertenece a un lote de su mismo ítem');

select throws_ok(
  $$ insert into inventory.containers (workspace_id, item_id, lot_id, seq, initial_quantity)
     values ('a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000001',
             'a7000000-0000-4000-8000-000000000001', 1, 10) $$,
  '23505', null, 'el número de frasco no se repite dentro del lote');

select throws_ok(
  $$ insert into inventory.containers (workspace_id, item_id, lot_id, seq, initial_quantity)
     values ('a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000001',
             'a7000000-0000-4000-8000-000000000001', 2, 0) $$,
  '23514', null, 'un frasco entra con una cantidad mayor que cero');

select throws_ok(
  $$ insert into inventory.positions (workspace_id, item_id, lot_id, container_id, location_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000002',
             'a7000000-0000-4000-8000-000000000002', 'ac000000-0000-4000-8000-000000000001',
             'a3000000-0000-4000-8000-000000000001') $$,
  '23503', null, 'la posición de un frasco es de su mismo lote e ítem');

select throws_ok(
  $$ insert into inventory.positions (workspace_id, item_id, lot_id, container_id, location_id, disposition, balance) values
       ('a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000001',
        'ac000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001', 'usable', 10),
       ('a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000001', 'a7000000-0000-4000-8000-000000000001',
        'ac000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001', 'quarantine', 10) $$,
  '23505', null, 'un frasco tiene saldo en un solo lugar');

-- R-01A, entrega 2: reservas de salida (03 §4, ADR 0012).
select throws_ok(
  $$ update inventory.positions set reserved = balance + 1 where id = 'a8000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'lo reservado no supera el saldo');

select throws_ok(
  $$ insert into inventory.allocations (workspace_id, position_id, quantity, reason, destination, requested_by_principal_id,
                                        status, decided_by_principal_id, decided_at, operation_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a8000000-0000-4000-8000-000000000001', 1, 'Práctica', 'Lab',
             'a2000000-0000-4000-8000-000000000001', 'fulfilled', 'a2000000-0000-4000-8000-000000000001', now(),
             'a9000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'nadie aprueba su propia solicitud');

select throws_ok(
  $$ insert into inventory.allocations (workspace_id, position_id, quantity, reason, destination, requested_by_principal_id,
                                        status, decided_by_principal_id, decided_at)
     values ('a0000000-0000-4000-8000-00000000000a', 'a8000000-0000-4000-8000-000000000001', 1, 'Práctica', 'Lab',
             'a2000000-0000-4000-8000-000000000001', 'released', 'a2000000-0000-4000-8000-000000000002', now()) $$,
  '23514', null, 'rechazar la solicitud de otro exige motivo');

select throws_ok(
  $$ insert into inventory.allocations (workspace_id, position_id, quantity, reason, destination, requested_by_principal_id,
                                        decided_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a8000000-0000-4000-8000-000000000001', 1, 'Práctica', 'Lab',
             'a2000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000002') $$,
  '23514', null, 'una solicitud pendiente no tiene decisión');

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

-- R-01A: frascos, motivos y destinos bajo el rol real.
select set_eq('select id from inventory.containers', array['ac000000-0000-4000-8000-000000000001']::uuid[],
  'con contexto A solo se ven los frascos de A');

select throws_ok(
  $$ insert into inventory.containers (workspace_id, item_id, lot_id, seq, initial_quantity)
     values ('b0000000-0000-4000-8000-00000000000b', 'b6000000-0000-4000-8000-000000000001',
             'b7000000-0000-4000-8000-000000000001', 2, 10) $$,
  '42501', null, 'el runtime no crea frascos en otro espacio');

select throws_ok(
  $$ update inventory.containers set initial_quantity = 1 $$,
  '42501', null, 'un frasco no cambia su cantidad inicial');

select lives_ok(
  $$ insert into inventory.reasons (workspace_id, item_kind, kind, name) values ('a0000000-0000-4000-8000-00000000000a', 'reagent', 'issue', 'Práctica') $$,
  'el runtime añade un motivo en su espacio');

select throws_ok(
  $$ delete from inventory.reasons $$,
  '42501', null, 'los motivos no se borran');

select throws_ok(
  $$ update inventory.reasons set name = 'Otro' $$,
  '42501', null, 'el nombre de un motivo no se edita');

select lives_ok(
  $$ update inventory.reasons set archived_at = now() where name = 'Práctica' $$,
  'un motivo se archiva');

select throws_ok(
  $$ update inventory.reasons set archived_at = now() where name = 'Práctica' $$,
  '23514', null, 'un motivo archivado no vuelve a cambiar');

select is_empty($$ select id from inventory.reasons where name = 'Motivo de B' $$,
  'los motivos de B no se ven desde A');

-- R-01A, entrega 2: solicitudes de salida bajo el rol real.
select lives_ok(
  $$ insert into inventory.allocations (workspace_id, position_id, quantity, reason, destination, requested_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a8000000-0000-4000-8000-000000000001', 5, 'Solicitud A', 'Lab',
             'a2000000-0000-4000-8000-000000000001') $$,
  'el runtime pide una salida en nombre propio');

select throws_ok(
  $$ insert into inventory.allocations (workspace_id, position_id, quantity, reason, destination, requested_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a8000000-0000-4000-8000-000000000001', 5, 'Ajena', 'Lab',
             'a2000000-0000-4000-8000-000000000002') $$,
  '42501', null, 'nadie pide una salida en nombre de otro');

select throws_ok(
  $$ insert into inventory.allocations (workspace_id, position_id, quantity, reason, destination, requested_by_principal_id, status)
     values ('a0000000-0000-4000-8000-00000000000a', 'a8000000-0000-4000-8000-000000000001', 5, 'Aprobada', 'Lab',
             'a2000000-0000-4000-8000-000000000001', 'fulfilled') $$,
  '42501', null, 'una solicitud nace pendiente');

select throws_ok(
  $$ update inventory.allocations set quantity = 1 where reason = 'Solicitud A' $$,
  '42501', null, 'la cantidad pedida no cambia');

select throws_ok(
  $$ delete from inventory.allocations $$,
  '42501', null, 'las solicitudes no se borran');

select throws_ok(
  $$ update inventory.allocations
        set status = 'released', decided_by_principal_id = 'a2000000-0000-4000-8000-000000000002', decided_at = now(),
            decision_reason = 'En nombre de otro'
      where reason = 'Solicitud A' $$,
  '42501', null, 'nadie decide en nombre de otro');

select lives_ok(
  $$ update inventory.allocations
        set status = 'released', decided_by_principal_id = 'a2000000-0000-4000-8000-000000000001', decided_at = now()
      where reason = 'Solicitud A' $$,
  'quien pidió cancela su solicitud');

select throws_ok(
  $$ update inventory.allocations set decision_reason = 'Otro motivo' where reason = 'Solicitud A' $$,
  '23514', null, 'una solicitud decidida no cambia');

select is_empty($$ select id from inventory.allocations where id = 'bd000000-0000-4000-8000-000000000001' $$,
  'las solicitudes de B no se ven desde A');

select throws_ok(
  $$ update inventory.positions set reserved = balance + 1 where id = 'a8000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'el runtime no aparta más que el saldo');

-- R-01A, entrega 3 (ADR 0012, 05-10-2026): mínimo y estado del lote bajo el rol real.
select lives_ok(
  $$ update inventory.items set minimum_quantity = 50 where id = 'a6000000-0000-4000-8000-000000000001' $$,
  'el runtime fija el mínimo de un reactivo');

select throws_ok(
  $$ update inventory.items set minimum_quantity = 0 where id = 'a6000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'un mínimo es mayor que cero');

select throws_ok(
  $$ update inventory.items set name = 'Otro nombre' where id = 'a6000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'del ítem, el runtime solo cambia el mínimo');

select throws_ok(
  $$ update inventory.lots set condition = 'quarantine' where id = 'a7000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'el estado del lote no cambia sin su registro con motivo');

select throws_ok(
  $$ insert into inventory.lot_condition_changes (workspace_id, lot_id, from_condition, to_condition, reason, actor_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a7000000-0000-4000-8000-000000000001', 'enabled', 'quarantine',
             'En nombre de otra persona', 'a2000000-0000-4000-8000-000000000002') $$,
  '42501', null, 'nadie registra un cambio de estado en nombre de otro');

select lives_ok(
  $$ insert into inventory.lot_condition_changes (workspace_id, lot_id, from_condition, to_condition, reason, actor_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a7000000-0000-4000-8000-000000000001', 'enabled', 'quarantine',
             'Sospecha de contaminación', 'a2000000-0000-4000-8000-000000000001') $$,
  'el runtime registra el cambio de estado con motivo');

select lives_ok(
  $$ update inventory.lots set condition = 'quarantine' where id = 'a7000000-0000-4000-8000-000000000001' $$,
  'con su registro, el lote pasa a cuarentena');

select throws_ok(
  $$ update inventory.lot_condition_changes set reason = 'Otro motivo' $$,
  '42501', null, 'el historial del estado del lote no se edita');

select throws_ok(
  $$ delete from inventory.lot_condition_changes $$,
  '42501', null, 'el historial del estado del lote no se borra');

select throws_ok(
  $$ insert into inventory.operations (workspace_id, type, actor_principal_id, correlation_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'disposal', 'a2000000-0000-4000-8000-000000000001',
             'ae000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'una baja exige motivo');

select throws_ok(
  $$ insert into inventory.lot_condition_changes (workspace_id, lot_id, from_condition, to_condition, reason, actor_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a7000000-0000-4000-8000-000000000001', 'quarantine', 'discarded',
             'Contaminado', 'a2000000-0000-4000-8000-000000000001');
     update inventory.lots set condition = 'discarded' where id = 'a7000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'un lote no queda descartado con saldo');

select lives_ok(
  $$ insert into inventory.operations (workspace_id, type, actor_principal_id, reason, correlation_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'disposal',
             'a2000000-0000-4000-8000-000000000001', 'Contaminado', 'ae000000-0000-4000-8000-000000000002') $$,
  'el runtime registra una baja con motivo');

select throws_ok(
  $$ insert into inventory.entries (workspace_id, operation_id, position_id, quantity, captured_quantity, captured_unit, balance_after)
     values ('a0000000-0000-4000-8000-00000000000a', (select id from inventory.operations where correlation_id = 'ae000000-0000-4000-8000-000000000002'),
             'a8000000-0000-4000-8000-000000000001', 1, 1, 'g', 101) $$,
  '23514', null, 'una baja no suma existencias');

select lives_ok(
  $$ with moved as (
       update inventory.positions set balance = 0
        where id = 'a8000000-0000-4000-8000-000000000001' returning id, balance)
     insert into inventory.entries (workspace_id, operation_id, position_id, quantity, captured_quantity, captured_unit, balance_after)
     select 'a0000000-0000-4000-8000-00000000000a', (select id from inventory.operations where correlation_id = 'ae000000-0000-4000-8000-000000000002'), id, -100, -100, 'g', balance
       from moved;
     insert into inventory.lot_condition_changes
       (workspace_id, lot_id, from_condition, to_condition, reason, actor_principal_id, operation_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a7000000-0000-4000-8000-000000000001', 'quarantine', 'discarded',
             'Contaminado', 'a2000000-0000-4000-8000-000000000001', (select id from inventory.operations where correlation_id = 'ae000000-0000-4000-8000-000000000002'));
     update inventory.lots set condition = 'discarded' where id = 'a7000000-0000-4000-8000-000000000001' $$,
  'la baja lleva el lote a cero y el lote queda descartado');

select throws_ok(
  $$ update inventory.lots set condition = 'enabled' where id = 'a7000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'un lote descartado no cambia de estado');

select throws_ok(
  $$ insert into inventory.lot_condition_changes (workspace_id, lot_id, from_condition, to_condition, reason, actor_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a7000000-0000-4000-8000-000000000001', 'discarded', 'enabled',
             'Volver', 'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'del estado descartado no se sale');

select throws_ok(
  $$ insert into inventory.operations (workspace_id, type, actor_principal_id, correlation_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'receipt', 'a2000000-0000-4000-8000-000000000001',
             'ae000000-0000-4000-8000-000000000003');
     with moved as (
       update inventory.positions set balance = 1
        where id = 'a8000000-0000-4000-8000-000000000001' returning id, balance)
     insert into inventory.entries (workspace_id, operation_id, position_id, quantity, captured_quantity, captured_unit, balance_after)
     select 'a0000000-0000-4000-8000-00000000000a',
            (select id from inventory.operations where correlation_id = 'ae000000-0000-4000-8000-000000000003'),
            moved.id, 1, 1, 'g', moved.balance from moved $$,
  '23514', null, 'un lote descartado no recibe existencias');

reset role;

select * from finish();
rollback;
