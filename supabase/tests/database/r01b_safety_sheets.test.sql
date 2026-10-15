-- R-01B (ADR 0017): fichas de seguridad en PDF. Cada archivo es una fila que nunca se edita ni se
-- borra, solo del reactivo y del espacio que la subieron, y el reactivo apunta a una sola vigente.
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

grant usage on schema extensions to platlab_api;
grant platlab_api to postgres with set true, inherit false;

-- ---------------------------------------------------------------------------
-- Fixtures sintéticos: A con dos reactivos y B con uno
-- ---------------------------------------------------------------------------

insert into platform.customer_accounts (id, legal_name)
values ('c0000000-0000-4000-8000-000000000001', 'Titular sintético');
insert into core.workspaces (id, customer_account_id, code, name, time_zone) values
  ('a0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000001', 'sds-a', 'A', 'America/Guayaquil'),
  ('b0000000-0000-4000-8000-00000000000b', 'c0000000-0000-4000-8000-000000000001', 'sds-b', 'B', 'America/Guayaquil');
insert into core.identities (id, provider, provider_subject, display_name) values
  ('10000000-0000-4000-8000-000000000001', 'supabase', 'sds-a', 'Administradora A'),
  ('10000000-0000-4000-8000-000000000002', 'supabase', 'sds-b', 'Administradora B');
insert into core.memberships (id, workspace_id, identity_id) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000001'),
  ('b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-000000000002');
insert into core.principals (id, workspace_id, kind, membership_id) values
  ('a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'member', 'a1000000-0000-4000-8000-000000000001'),
  ('b2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'member', 'b1000000-0000-4000-8000-000000000001');
insert into inventory.items (id, workspace_id, kind, code, name, base_unit) values
  ('a6000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'reagent', 'NACL', 'Cloruro de sodio', 'g'),
  ('a6000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'reagent', 'ETOH', 'Etanol', 'mL'),
  ('b6000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'reagent', 'NACL', 'Cloruro de sodio', 'g');
insert into reagents.products (workspace_id, item_id, cas_number, physical_state) values
  ('a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000001', '7647-14-5', 'solid'),
  ('a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000002', '64-17-5', 'liquid'),
  ('b0000000-0000-4000-8000-00000000000b', 'b6000000-0000-4000-8000-000000000001', '7647-14-5', 'solid');
-- Una ficha de B, escrita como propietario para probar que A no la alcanza.
insert into reagents.safety_sheets (id, workspace_id, product_id, object_path, url, byte_size, sha256, uploaded_by_principal_id) values
  ('bd000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'b6000000-0000-4000-8000-000000000001',
   'b0000000-0000-4000-8000-00000000000b/sds/bd000000-0000-4000-8000-000000000001.pdf',
   'http://127.0.0.1:54321/storage/v1/object/public/public-files/b0000000-0000-4000-8000-00000000000b/sds/bd000000-0000-4000-8000-000000000001.pdf',
   1024, repeat('b', 64), 'b2000000-0000-4000-8000-000000000001');

set local role platlab_api;
select set_config('platlab.workspace_id', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config('platlab.principal_id', 'a2000000-0000-4000-8000-000000000001', true);

-- ---------------------------------------------------------------------------
-- Alta de una ficha y puntero del reactivo
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into reagents.safety_sheets (id, workspace_id, product_id, object_path, url, byte_size, sha256, uploaded_by_principal_id)
     values ('ad000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000001',
             'a0000000-0000-4000-8000-00000000000a/sds/ad000000-0000-4000-8000-000000000001.pdf',
             'http://127.0.0.1:54321/storage/v1/object/public/public-files/a0000000-0000-4000-8000-00000000000a/sds/ad000000-0000-4000-8000-000000000001.pdf',
             2048, repeat('a', 64), 'a2000000-0000-4000-8000-000000000001') $$,
  'el runtime registra una ficha del espacio con su ruta');

select throws_ok(
  $$ insert into reagents.safety_sheets (id, workspace_id, product_id, object_path, url, byte_size, sha256, uploaded_by_principal_id)
     values ('ad000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000001',
             'b0000000-0000-4000-8000-00000000000b/sds/ad000000-0000-4000-8000-000000000002.pdf',
             'https://ejemplo.org/x.pdf', 2048, repeat('a', 64), 'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'la ruta es la del espacio y el id de la ficha');

select throws_ok(
  $$ insert into reagents.safety_sheets (id, workspace_id, product_id, object_path, url, byte_size, sha256, uploaded_by_principal_id)
     values ('ad000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-00000000000a', 'a6000000-0000-4000-8000-000000000001',
             'a0000000-0000-4000-8000-00000000000a/sds/ad000000-0000-4000-8000-000000000003.pdf',
             'https://ejemplo.org/x.pdf', 6291457, repeat('a', 64), 'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'un PDF de más de 6 MiB no se registra');

select throws_ok(
  $$ insert into reagents.safety_sheets (id, workspace_id, product_id, object_path, url, byte_size, sha256, uploaded_by_principal_id)
     values ('ad000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-00000000000a', 'b6000000-0000-4000-8000-000000000001',
             'a0000000-0000-4000-8000-00000000000a/sds/ad000000-0000-4000-8000-000000000004.pdf',
             'https://ejemplo.org/x.pdf', 2048, repeat('a', 64), 'a2000000-0000-4000-8000-000000000001') $$,
  '23503', null, 'una ficha no apunta al reactivo de otro espacio');

select throws_ok(
  $$ insert into reagents.safety_sheets (id, workspace_id, product_id, object_path, url, byte_size, sha256, uploaded_by_principal_id)
     values ('bd000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-00000000000b', 'b6000000-0000-4000-8000-000000000001',
             'b0000000-0000-4000-8000-00000000000b/sds/bd000000-0000-4000-8000-000000000002.pdf',
             'https://ejemplo.org/x.pdf', 2048, repeat('b', 64), 'b2000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'RLS impide registrar una ficha en otro espacio');

select lives_ok(
  $$ update reagents.products set sds_kind = 'digital', sds_url = null, sds_sheet_id = 'ad000000-0000-4000-8000-000000000001'
      where item_id = 'a6000000-0000-4000-8000-000000000001' $$,
  'el reactivo apunta a su ficha vigente');

select throws_ok(
  $$ update reagents.products set sds_url = 'https://ejemplo.org/sds.pdf'
      where item_id = 'a6000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'una sola ficha vigente: el PDF no convive con un enlace');

select throws_ok(
  $$ update reagents.products set sds_kind = 'physical'
      where item_id = 'a6000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'el PDF solo acompaña a una ficha digital');

select throws_ok(
  $$ update reagents.products set sds_kind = 'digital', sds_sheet_id = 'ad000000-0000-4000-8000-000000000001'
      where item_id = 'a6000000-0000-4000-8000-000000000002' $$,
  '23503', null, 'un reactivo no apunta a la ficha de otro reactivo');

select is(
  (select count(*)::int from reagents.safety_sheets),
  1, 'el runtime solo ve las fichas de su espacio');

-- ---------------------------------------------------------------------------
-- Historial: nadie edita ni borra una ficha
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ update reagents.safety_sheets set url = 'https://ejemplo.org/otra.pdf' $$,
  '42501', null, 'el runtime no edita una ficha subida');

select throws_ok(
  $$ delete from reagents.safety_sheets $$,
  '42501', null, 'el runtime no borra una ficha subida');

select lives_ok(
  $$ update reagents.products set sds_sheet_id = null, sds_url = 'https://ejemplo.org/sds.pdf'
      where item_id = 'a6000000-0000-4000-8000-000000000001' $$,
  'un enlace reemplaza al PDF vigente');

select is(
  (select count(*)::int from reagents.safety_sheets where product_id = 'a6000000-0000-4000-8000-000000000001'),
  1, 'el PDF reemplazado sigue en el historial');

reset role;

select * from finish();
rollback;
