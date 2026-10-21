-- R-01D (ADR 0015): ficha del reactivo, código y tara del frasco, departamentos (C-01a, ADR 0024) y
-- ubicaciones creadas desde la API, con sus restricciones y bajo el rol real de runtime.
begin;
create extension if not exists pgtap with schema extensions;

select plan(53);

grant usage on schema extensions to platlab_api;
grant platlab_api to postgres with set true, inherit false;

-- ---------------------------------------------------------------------------
-- Fixtures sintéticos: A y B; en A, un reactivo con movimientos y otro sin ellos
-- ---------------------------------------------------------------------------

insert into platform.customer_accounts (id, legal_name)
values ('c0000000-0000-4000-8000-000000000001', 'Titular sintético');
insert into core.workspaces (id, customer_account_id, code, name, time_zone) values
  ('a0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000001', 'ing-a', 'A', 'America/Guayaquil'),
  ('b0000000-0000-4000-8000-00000000000b', 'c0000000-0000-4000-8000-000000000001', 'ing-b', 'B', 'America/Guayaquil');
insert into core.identities (id, provider, provider_subject, display_name) values
  ('10000000-0000-4000-8000-000000000001', 'supabase', 'ing-a', 'Administradora A');
insert into core.memberships (id, workspace_id, identity_id) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000001');
insert into core.principals (id, workspace_id, kind, membership_id) values
  ('a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'member', 'a1000000-0000-4000-8000-000000000001');
insert into core.locations (id, workspace_id, kind, code, name) values
  ('a3000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'room', 'LAB', 'Laboratorio'),
  ('b3000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'room', 'LAB', 'Laboratorio');

insert into inventory.items (id, workspace_id, kind, code, name, base_unit) values
  ('a6000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'reagent', 'NACL', 'Cloruro de sodio', 'g'),
  ('a6000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'reagent', 'ETOH', 'Etanol', 'mL'),
  ('b6000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'reagent', 'NACL', 'Cloruro de sodio', 'g');
insert into reagents.products (workspace_id, item_id, cas_number, physical_state) values
  ('a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000001', '7647-14-5', 'solid'),
  ('a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000002', '64-17-5', 'liquid');
insert into inventory.lots (id, workspace_id, item_id, code) values
  ('a7000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000001', 'L-001'),
  ('b7000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'b6000000-0000-4000-8000-000000000001', 'L-001');
insert into inventory.containers (id, workspace_id, item_id, lot_id, seq, code, initial_quantity) values
  ('ac000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000001',
   'a7000000-0000-4000-8000-000000000001', 1, 'NAC-001', 500),
  ('bc000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'b6000000-0000-4000-8000-000000000001',
   'b7000000-0000-4000-8000-000000000001', 1, 'NAC-001', 500);
insert into inventory.positions (id, workspace_id, item_id, lot_id, container_id, location_id) values
  ('a8000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000001',
   'a7000000-0000-4000-8000-000000000001', 'ac000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001');
insert into inventory.operations (id, workspace_id, type, actor_principal_id, correlation_id) values
  ('a9000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'receipt',
   'a2000000-0000-4000-8000-000000000001', gen_random_uuid());
with moved as (
  update inventory.positions set balance = balance + 500
   where id = 'a8000000-0000-4000-8000-000000000001' returning id, balance)
insert into inventory.entries (workspace_id, operation_id, position_id, quantity, captured_quantity, captured_unit, balance_after)
select 'a0000000-0000-4000-8000-00000000000a', 'a9000000-0000-4000-8000-000000000001', id, 500, 500, 'g', balance from moved;
insert into core.departments (id, workspace_id, name) values
  ('bd000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'Departamento de B');

-- ---------------------------------------------------------------------------
-- Ficha del reactivo
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ update reagents.products set physical_state = 'aqueous', hazards = '{GHS05,GHS07}', controlled = true,
            sds_kind = 'digital', sds_url = 'https://ejemplo.org/sds.pdf', density = 1.19
      where item_id = 'a6000000-0000-4000-8000-000000000002' $$,
  'la ficha admite estado acuoso, pictogramas, controlado, ficha digital con enlace y densidad');

select throws_ok(
  $$ update reagents.products set physical_state = 'plasma' where item_id = 'a6000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'el estado físico es uno de los cinco');

select throws_ok(
  $$ update reagents.products set hazards = '{GHS10}' where item_id = 'a6000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'solo los nueve pictogramas SGA');

select throws_ok(
  $$ update reagents.products set hazards = '{NULL}' where item_id = 'a6000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'un pictograma nulo no se acepta');

select throws_ok(
  $$ update reagents.products set sds_kind = 'physical', sds_url = 'https://ejemplo.org/sds.pdf'
      where item_id = 'a6000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'el enlace solo acompaña a una ficha digital');

select throws_ok(
  $$ update reagents.products set sds_kind = 'digital', sds_url = 'ftp://ejemplo.org/sds.pdf'
      where item_id = 'a6000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'el enlace es http o https');

select throws_ok(
  $$ update reagents.products set sds_kind = 'otra' where item_id = 'a6000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'la ficha de seguridad es digital, física o ninguna');

select throws_ok(
  $$ update reagents.products set density = 0 where item_id = 'a6000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'la densidad del reactivo es mayor que cero');

-- ---------------------------------------------------------------------------
-- Unidad fija tras el primer movimiento
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ update inventory.items set base_unit = 'kg' where id = 'a6000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'un ítem con asientos no cambia de unidad');

select lives_ok(
  $$ update inventory.items set base_unit = 'L' where id = 'a6000000-0000-4000-8000-000000000002' $$,
  'un ítem sin movimientos cambia de unidad');

select lives_ok(
  $$ update inventory.items set name = 'Cloruro de sodio p.a.' where id = 'a6000000-0000-4000-8000-000000000001' $$,
  'cambiar el nombre de un ítem con movimientos sí se acepta');

-- ---------------------------------------------------------------------------
-- Frascos: código único y tara
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ insert into inventory.containers (workspace_id, item_id, lot_id, seq, code, initial_quantity)
     values ('a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000001',
             'a7000000-0000-4000-8000-000000000001', 2, 'nac-001', 10) $$,
  '23505', null, 'el código de frasco es único en el espacio sin distinguir mayúsculas');

select throws_ok(
  $$ insert into inventory.containers (workspace_id, item_id, lot_id, seq, code, initial_quantity)
     values ('a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000001',
             'a7000000-0000-4000-8000-000000000001', 2, '-NAC', 10) $$,
  '23514', null, 'el código de frasco cumple el formato común');

select throws_ok(
  $$ insert into inventory.containers (workspace_id, item_id, lot_id, seq, initial_quantity)
     values ('a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000001',
             'a7000000-0000-4000-8000-000000000001', 2, 10) $$,
  '23502', null, 'todo frasco tiene código');

select lives_ok(
  $$ update inventory.containers set tare = 140 where id = 'ac000000-0000-4000-8000-000000000001' $$,
  'un frasco en masa guarda su tara sin densidad');

select throws_ok(
  $$ update inventory.containers set tare = 0 where id = 'ac000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'la tara es mayor que cero');

select throws_ok(
  $$ update inventory.containers set density = 0 where id = 'ac000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'la densidad del frasco es mayor que cero');

select throws_ok(
  $$ update inventory.containers set tare = null, density = 1 where id = 'ac000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'una densidad sin tara se rechaza');

select results_eq(
  $$ select inventory.grams_per_unit(u, 1.19) from unnest(array['g', 'kg', 'mL', 'L', 'u']) with ordinality as t (u, n) order by n $$,
  $$ values (1::numeric), (1000::numeric), (1.19::numeric), (1190::numeric), (null::numeric) $$,
  'gramos por unidad: masa fija, volumen por la densidad y nada para lo que no se pesa');

select is(inventory.grams_per_unit('mL', null), null, 'en volumen sin densidad no hay factor');

-- ---------------------------------------------------------------------------
-- Departamentos y ubicaciones
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ insert into core.departments (workspace_id, name) values
       ('b0000000-0000-4000-8000-00000000000b', 'departamento de b') $$,
  '23505', null, 'un departamento activo no se repite sin distinguir mayúsculas');

select throws_ok(
  $$ update inventory.lots set department_id = 'bd000000-0000-4000-8000-000000000001'
      where id = 'a7000000-0000-4000-8000-000000000001' $$,
  '23503', null, 'un lote no se enlaza a un departamento de otro espacio');

select throws_ok(
  $$ insert into core.locations (workspace_id, parent_id, kind, code, name) values
       ('a0000000-0000-4000-8000-00000000000a', null, 'room', 'LAB-2', 'LABORATORIO') $$,
  '23505', null, 'una ubicación activa no repite nombre en la raíz');

select lives_ok(
  $$ insert into core.locations (workspace_id, parent_id, kind, code, name) values
       ('a0000000-0000-4000-8000-00000000000a', 'a3000000-0000-4000-8000-000000000001', 'storage', 'LAB-3', 'Laboratorio') $$,
  'el mismo nombre bajo otro padre sí se acepta');

-- ---------------------------------------------------------------------------
-- Bajo el rol real de runtime
-- ---------------------------------------------------------------------------

set local role platlab_api;
select set_config('platlab.workspace_id', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config('platlab.principal_id', 'a2000000-0000-4000-8000-000000000001', true);

select lives_ok(
  $$ update reagents.products set controlled = false, hazards = '{GHS02}', cas_number = '64-17-5', physical_state = 'liquid',
            sds_kind = 'none', sds_url = null, density = 0.789
      where item_id = 'a6000000-0000-4000-8000-000000000002' $$,
  'el runtime edita la ficha química');

select throws_ok(
  $$ update reagents.products set created_at = now() where item_id = 'a6000000-0000-4000-8000-000000000002' $$,
  '42501', null, 'de la ficha, el runtime solo cambia sus campos editables');

select is_empty(
  $$ update reagents.products set controlled = true where workspace_id = 'b0000000-0000-4000-8000-00000000000b' returning item_id $$,
  'el runtime no edita fichas de otro espacio');

select lives_ok(
  $$ update inventory.items set name = 'Etanol absoluto', base_unit = 'mL', lot_seq = lot_seq + 1
      where id = 'a6000000-0000-4000-8000-000000000002' $$,
  'el runtime cambia nombre, unidad y contador de lotes de un ítem');

select lives_ok(
  $$ update inventory.containers set tare = 150, density = null where id = 'ac000000-0000-4000-8000-000000000001' $$,
  'el runtime fija la tara de un frasco');

select throws_ok(
  $$ update inventory.containers set code = 'OTRO' where id = 'ac000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'el código de un frasco no cambia');

select is_empty(
  $$ update inventory.containers set tare = 1 where id = 'bc000000-0000-4000-8000-000000000001' returning id $$,
  'el runtime no fija la tara de un frasco de otro espacio');

select is(
  (select count(*)::int from inventory.containers where lower(code) = 'nac-001'),
  1, 'el mismo código en otro espacio no se ve ni choca');

select ok(has_function_privilege('platlab_api', 'inventory.grams_per_unit(text, numeric)', 'execute'),
  'el runtime calcula con el factor de peso');

select ok(has_function_privilege('platlab_api', 'inventory.fold_text(text)', 'execute'),
  'el runtime pliega nombres para buscar y no repetirlos');

select is(inventory.fold_text(E'  Ácido \t CLORHÍDRICO   Ñu '), 'acido clorhidrico nu',
  'el plegado quita tildes, mayúsculas y espacios de más');

select lives_ok(
  $$ insert into core.departments (workspace_id, name) values ('a0000000-0000-4000-8000-00000000000a', 'Docencia') $$,
  'el runtime añade un departamento en su espacio');

select throws_ok(
  $$ insert into core.departments (workspace_id, name) values ('b0000000-0000-4000-8000-00000000000b', 'Ajeno') $$,
  '42501', null, 'el runtime no añade departamentos en otro espacio');

select throws_ok(
  $$ insert into core.departments (workspace_id, name, archived_at)
     values ('a0000000-0000-4000-8000-00000000000a', 'Archivado', now()) $$,
  '42501', null, 'un departamento nace activo');

select is_empty($$ select id from core.departments where name = 'Departamento de B' $$, 'los departamentos de B no se ven desde A');

select is_empty(
  $$ update core.departments set name = 'Tomado' where id = 'bd000000-0000-4000-8000-000000000001' returning id $$,
  'el runtime no renombra departamentos de otro espacio');

select lives_ok(
  $$ update core.departments set name = 'Docencia general' where name = 'Docencia' $$,
  'el runtime renombra un departamento');

select throws_ok($$ delete from core.departments $$, '42501', null, 'los departamentos no se borran');

select lives_ok($$ update core.departments set archived_at = now() where name = 'Docencia general' $$, 'un departamento se archiva');

select throws_ok(
  $$ update core.departments set name = 'Otra vez' where name = 'Docencia general' $$,
  '23514', null, 'un departamento archivado no vuelve a cambiar');

select lives_ok(
  $$ insert into core.locations (workspace_id, parent_id, kind, code, name) values
       ('a0000000-0000-4000-8000-00000000000a', 'a3000000-0000-4000-8000-000000000001', 'storage', 'EST-1', 'Estante 1') $$,
  'el runtime crea una ubicación en su espacio');

select throws_ok(
  $$ insert into core.locations (workspace_id, parent_id, kind, code, name) values
       ('b0000000-0000-4000-8000-00000000000b', null, 'room', 'AJENA', 'Ajena') $$,
  '42501', null, 'el runtime no crea ubicaciones en otro espacio');

select throws_ok(
  $$ insert into core.locations (workspace_id, parent_id, kind, code, name) values
       ('a0000000-0000-4000-8000-00000000000a', 'b3000000-0000-4000-8000-000000000001', 'storage', 'EST-B', 'Bajo B') $$,
  '23503', null, 'una ubicación no cuelga de un padre de otro espacio');

select throws_ok(
  $$ insert into core.locations (workspace_id, kind, code, name, archived_at) values
       ('a0000000-0000-4000-8000-00000000000a', 'room', 'ARCH', 'Archivada', now()) $$,
  '42501', null, 'una ubicación nace activa');

select lives_ok(
  $$ update core.locations set name = 'Estante norte' where code = 'EST-1' $$,
  'el runtime renombra una ubicación (ADR 0024)');

select throws_ok(
  $$ update core.locations set code = 'OTRO' where code = 'EST-1' $$,
  '42501', null, 'el código, el tipo y el padre de una ubicación no cambian');

select lives_ok(
  $$ update core.locations set archived_at = now() where code = 'EST-1' $$,
  'el runtime archiva una ubicación');

select throws_ok(
  $$ update core.locations set name = 'Revive' where code = 'EST-1' $$,
  '23514', null, 'una ubicación archivada no vuelve a cambiar');

select throws_ok($$ delete from core.locations $$, '42501', null, 'el runtime no borra ubicaciones');

reset role;

select * from finish();
rollback;
