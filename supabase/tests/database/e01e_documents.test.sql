-- E-01e (ADR 0019): documentos del equipo bajo el rol de runtime. Aislamiento por espacio, ruta fija,
-- autoría propia, nada se borra ni se reescribe y archivar ocurre una sola vez.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

grant usage on schema extensions to platlab_api;
grant platlab_api to postgres with set true, inherit false;

-- ---------------------------------------------------------------------------
-- Fixtures sintéticos: A con dos miembros y un equipo; B con su equipo y un documento
-- ---------------------------------------------------------------------------

insert into platform.customer_accounts (id, legal_name)
values ('c0000000-0000-4000-8000-000000000001', 'Titular sintético');
insert into core.workspaces (id, customer_account_id, code, name, time_zone) values
  ('a0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000001', 'doc-a', 'A', 'America/Guayaquil'),
  ('b0000000-0000-4000-8000-00000000000b', 'c0000000-0000-4000-8000-000000000001', 'doc-b', 'B', 'America/Guayaquil');
insert into core.identities (id, provider, provider_subject, display_name) values
  ('10000000-0000-4000-8000-000000000001', 'supabase', 'doc-a1', 'Administradora A'),
  ('10000000-0000-4000-8000-000000000002', 'supabase', 'doc-a2', 'Operador A'),
  ('10000000-0000-4000-8000-000000000003', 'supabase', 'doc-b1', 'Administradora B');
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
  ('a4000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'Centrífuga'),
  ('b4000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'Balanza');
insert into equipment.assets (id, workspace_id, type_id, code, name, location_id, created_by_principal_id) values
  ('a5000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a4000000-0000-4000-8000-000000000001',
   'CEN-01', 'Centrífuga refrigerada', 'a3000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001'),
  ('b5000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'b4000000-0000-4000-8000-000000000001',
   'BAL-01', 'Balanza analítica', 'b3000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000001');
-- Un documento de B, escrito como propietario para probar que A no lo alcanza.
insert into equipment.asset_documents (id, workspace_id, asset_id, kind, title, object_path, url, byte_size, sha256, uploaded_by_principal_id)
values ('b6000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'b5000000-0000-4000-8000-000000000001',
        'manual', 'Manual de B', 'b0000000-0000-4000-8000-00000000000b/equipment/documents/b6000000-0000-4000-8000-000000000001.pdf',
        'https://ejemplo.org/b.pdf', 1024, repeat('b', 64), 'b2000000-0000-4000-8000-000000000001');

set local role platlab_api;
select set_config('platlab.workspace_id', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config('platlab.principal_id', 'a2000000-0000-4000-8000-000000000001', true);

-- ---------------------------------------------------------------------------
-- Alta: espacio, ruta fija y autoría
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into equipment.asset_documents (id, workspace_id, asset_id, kind, title, object_path, url, byte_size, sha256, uploaded_by_principal_id)
     values ('a6000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001',
             'warranty', 'Garantía del fabricante',
             'a0000000-0000-4000-8000-00000000000a/equipment/documents/a6000000-0000-4000-8000-000000000001.pdf',
             'https://ejemplo.org/a.pdf', 1024, repeat('a', 64), 'a2000000-0000-4000-8000-000000000001') $$,
  'el runtime registra un documento de un equipo del espacio');

select throws_ok(
  $$ insert into equipment.asset_documents (id, workspace_id, asset_id, kind, title, object_path, url, byte_size, sha256, uploaded_by_principal_id)
     values ('a6000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001',
             'manual', 'Manual',
             'b0000000-0000-4000-8000-00000000000b/equipment/documents/a6000000-0000-4000-8000-000000000002.pdf',
             'https://ejemplo.org/a.pdf', 1024, repeat('a', 64), 'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'la ruta del documento es la del espacio y su id');

select throws_ok(
  $$ insert into equipment.asset_documents (id, workspace_id, asset_id, kind, title, object_path, url, byte_size, sha256, uploaded_by_principal_id)
     values ('b6000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-00000000000b', 'b5000000-0000-4000-8000-000000000001',
             'manual', 'Manual',
             'b0000000-0000-4000-8000-00000000000b/equipment/documents/b6000000-0000-4000-8000-000000000002.pdf',
             'https://ejemplo.org/b.pdf', 1024, repeat('b', 64), 'a2000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'el runtime no registra documentos en otro espacio');

select throws_ok(
  $$ insert into equipment.asset_documents (id, workspace_id, asset_id, kind, title, object_path, url, byte_size, sha256, uploaded_by_principal_id)
     values ('a6000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-00000000000a', 'b5000000-0000-4000-8000-000000000001',
             'manual', 'Manual',
             'a0000000-0000-4000-8000-00000000000a/equipment/documents/a6000000-0000-4000-8000-000000000003.pdf',
             'https://ejemplo.org/a.pdf', 1024, repeat('a', 64), 'a2000000-0000-4000-8000-000000000001') $$,
  '23503', null, 'un documento no se cuelga de un equipo de otro espacio');

select throws_ok(
  $$ insert into equipment.asset_documents (id, workspace_id, asset_id, kind, title, object_path, url, byte_size, sha256, uploaded_by_principal_id)
     values ('a6000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001',
             'manual', 'Manual',
             'a0000000-0000-4000-8000-00000000000a/equipment/documents/a6000000-0000-4000-8000-000000000004.pdf',
             'https://ejemplo.org/a.pdf', 1024, repeat('a', 64), 'a2000000-0000-4000-8000-000000000002') $$,
  '42501', null, 'la autoría del documento es del principal del contexto');

select is(
  (select count(*)::int from equipment.asset_documents),
  1,
  'RLS: el runtime solo ve los documentos de su espacio');

-- ---------------------------------------------------------------------------
-- Nada se borra ni se reescribe; archivar ocurre una sola vez
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ delete from equipment.asset_documents where id = 'a6000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'nadie borra un documento: se archiva');

select throws_ok(
  $$ update equipment.asset_documents set title = 'Otro nombre' where id = 'a6000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'el nombre de un documento no se cambia');

select throws_ok(
  $$ update equipment.asset_documents set url = 'https://ejemplo.org/otro.pdf', object_path = object_path
      where id = 'a6000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'el archivo de un documento no se reemplaza');

select throws_ok(
  $$ update equipment.asset_documents set archived_at = now(), archived_by_principal_id = 'a2000000-0000-4000-8000-000000000002'
      where id = 'a6000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'quien archiva es el principal del contexto');

select lives_ok(
  $$ update equipment.asset_documents set archived_at = now(), archived_by_principal_id = 'a2000000-0000-4000-8000-000000000001'
      where id = 'a6000000-0000-4000-8000-000000000001' $$,
  'el runtime archiva un documento');

select throws_ok(
  $$ update equipment.asset_documents set archived_at = now(), archived_by_principal_id = 'a2000000-0000-4000-8000-000000000001'
      where id = 'a6000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'un documento archivado no se archiva de nuevo');

select * from finish();
rollback;
