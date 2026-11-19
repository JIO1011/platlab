-- MA-01a (ADR 0025): clase de material 1:1 del ítem bajo el rol de runtime. Aislamiento por espacio, tipo
-- fijado por FK compuesta (un ítem no es reactivo y material), clase inmutable y permisos del manifiesto.
begin;
create extension if not exists pgtap with schema extensions;

select plan(9);

grant usage on schema extensions to platlab_api;
grant platlab_api to postgres with set true, inherit false;

-- ---------------------------------------------------------------------------
-- Fixtures sintéticos: A con un material y un reactivo; B con su propio material
-- ---------------------------------------------------------------------------

insert into platform.customer_accounts (id, legal_name)
values ('c0000000-0000-4000-8000-000000000001', 'Titular sintético');
insert into core.workspaces (id, customer_account_id, code, name, time_zone) values
  ('a0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000001', 'ma-a', 'A', 'America/Guayaquil'),
  ('b0000000-0000-4000-8000-00000000000b', 'c0000000-0000-4000-8000-000000000001', 'ma-b', 'B', 'America/Guayaquil');
insert into inventory.items (id, workspace_id, kind, code, name, base_unit) values
  ('a5000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'material', 'GUA-01', 'Guantes', 'u'),
  ('a5000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'reagent', 'ETA-01', 'Etanol', 'mL'),
  ('b5000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'material', 'GUA-01', 'Guantes', 'u');
-- Un material de B escrito como propietario para probar que A no lo alcanza.
insert into materials.products (workspace_id, item_id, class)
values ('b0000000-0000-4000-8000-00000000000b', 'b5000000-0000-4000-8000-000000000001', 'consumable');

set local role platlab_api;
select set_config('platlab.workspace_id', 'a0000000-0000-4000-8000-00000000000a', true);

select lives_ok(
  $$ insert into materials.products (workspace_id, item_id, class)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'consumable') $$,
  'el runtime registra la clase de un material del espacio');

select throws_ok(
  $$ insert into materials.products (workspace_id, item_id, class)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'reusable_counted') $$,
  '23505', null, 'un material tiene una sola clase');

select throws_ok(
  $$ insert into materials.products (workspace_id, item_id, class)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000002', 'consumable') $$,
  '23503', null, 'un ítem reactivo no puede ser un material');

select throws_ok(
  $$ insert into materials.products (workspace_id, item_id, class)
     values ('b0000000-0000-4000-8000-00000000000b', 'b5000000-0000-4000-8000-000000000001', 'consumable') $$,
  '42501', null, 'el runtime no escribe en otro espacio');

select throws_ok(
  $$ insert into materials.products (workspace_id, item_id, class)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'otra') $$,
  '23514', null, 'la clase es una de las tres del ADR 0025');

select is(
  (select count(*)::int from materials.products), 1,
  'solo se ve el material del espacio de contexto');

select throws_ok(
  $$ update materials.products set class = 'reusable_counted' $$,
  '42501', null, 'la clase no se edita: el runtime no tiene UPDATE');

select throws_ok(
  $$ delete from materials.products $$,
  '42501', null, 'nadie borra un material del catálogo');

reset role;
select is(
  (select count(*)::int from core.role_permissions
    where permission_code in ('materials.catalog.read', 'materials.catalog.manage', 'materials.receipt.create',
                              'materials.issue.create', 'materials.adjustment.create')), 8,
  'la matriz del manifiesto está sembrada: 5 del Administrador y 3 del Operador');

select * from finish();
rollback;
