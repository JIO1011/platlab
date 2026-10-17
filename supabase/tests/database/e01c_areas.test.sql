-- E-01c (ADR 0019): áreas y encargado bajo el rol de runtime. Cada ubicación tiene una sola área, el
-- encargado es un principal del espacio, solo el encargado cambia desde la API y los nombres no se
-- repiten en el mismo nivel sin distinguir tildes ni mayúsculas.
begin;
create extension if not exists pgtap with schema extensions;

select plan(17);

grant usage on schema extensions to platlab_api;
grant platlab_api to postgres with set true, inherit false;

-- ---------------------------------------------------------------------------
-- Fixtures sintéticos: A con sede > cuarto frío > mesón, un laboratorio en la raíz y un miembro; B aparte
-- ---------------------------------------------------------------------------

insert into platform.customer_accounts (id, legal_name)
values ('c0000000-0000-4000-8000-000000000001', 'Titular sintético');
insert into core.workspaces (id, customer_account_id, code, name, time_zone) values
  ('a0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000001', 'ar-a', 'A', 'America/Guayaquil'),
  ('b0000000-0000-4000-8000-00000000000b', 'c0000000-0000-4000-8000-000000000001', 'ar-b', 'B', 'America/Guayaquil');
insert into core.identities (id, provider, provider_subject, display_name) values
  ('10000000-0000-4000-8000-000000000001', 'supabase', 'ar-a1', 'Encargada A'),
  ('10000000-0000-4000-8000-000000000002', 'supabase', 'ar-b1', 'Miembro B');
insert into core.memberships (id, workspace_id, identity_id) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000001'),
  ('b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-000000000002');
insert into core.principals (id, workspace_id, kind, membership_id) values
  ('a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'member', 'a1000000-0000-4000-8000-000000000001'),
  ('b2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'member', 'b1000000-0000-4000-8000-000000000001');
insert into core.locations (id, workspace_id, parent_id, kind, code, name) values
  ('a3000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', null, 'site', 'SEDE', 'Sede central'),
  ('a3000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'a3000000-0000-4000-8000-000000000001', 'room', 'CF', 'Cuarto frío'),
  ('a3000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-00000000000a', 'a3000000-0000-4000-8000-000000000002', 'storage', 'M2', 'Mesón 2'),
  ('a3000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-00000000000a', 'a3000000-0000-4000-8000-000000000003', 'storage', 'M2-N1', 'Nivel 1'),
  ('a3000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-00000000000a', null, 'room', 'LAB', 'Laboratorio suelto'),
  ('b3000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', null, 'room', 'LAB-B', 'Laboratorio B');

-- Un equipo de A para el historial de estado físico.
insert into equipment.asset_types (id, workspace_id, name)
values ('a4000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'Microscopio');
insert into equipment.assets (id, workspace_id, type_id, code, name, location_id, conservation, created_by_principal_id)
values ('a5000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a4000000-0000-4000-8000-000000000001',
        'MIC-01', 'Microscopio óptico', 'a3000000-0000-4000-8000-000000000003', 'good', 'a2000000-0000-4000-8000-000000000001');

set local role platlab_api;
select set_config('platlab.workspace_id', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config('platlab.principal_id', 'a2000000-0000-4000-8000-000000000001', true);

-- ---------------------------------------------------------------------------
-- Áreas: el primer nivel debajo de la sede; cada ubicación tiene una sola
-- ---------------------------------------------------------------------------

select results_eq(
  $$ select location_id, area_id from core.location_areas order by location_id $$,
  $$ values ('a3000000-0000-4000-8000-000000000001'::uuid, 'a3000000-0000-4000-8000-000000000001'::uuid),
            ('a3000000-0000-4000-8000-000000000002'::uuid, 'a3000000-0000-4000-8000-000000000002'::uuid),
            ('a3000000-0000-4000-8000-000000000003'::uuid, 'a3000000-0000-4000-8000-000000000002'::uuid),
            ('a3000000-0000-4000-8000-000000000004'::uuid, 'a3000000-0000-4000-8000-000000000002'::uuid),
            ('a3000000-0000-4000-8000-000000000005'::uuid, 'a3000000-0000-4000-8000-000000000005'::uuid) $$,
  'el mesón y su nivel cuentan en el cuarto frío; la sede y un laboratorio en la raíz son su propia área');

select is(
  (select count(*)::int from core.location_areas where workspace_id = 'b0000000-0000-4000-8000-00000000000b'),
  0,
  'RLS: la vista de áreas no muestra otro espacio');

-- ---------------------------------------------------------------------------
-- Encargado: un principal del espacio; solo él cambia desde la API
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ update core.locations set manager_principal_id = 'a2000000-0000-4000-8000-000000000001', version = version + 1
      where id = 'a3000000-0000-4000-8000-000000000002' $$,
  'el runtime asigna el encargado de un área');

select is(
  (select manager_principal_id from core.locations where id = 'a3000000-0000-4000-8000-000000000002'),
  'a2000000-0000-4000-8000-000000000001'::uuid,
  'el encargado queda en la ubicación');

select throws_ok(
  $$ update core.locations set manager_principal_id = 'b2000000-0000-4000-8000-000000000001'
      where id = 'a3000000-0000-4000-8000-000000000002' $$,
  '23503', null, 'el encargado no es un miembro de otro espacio');

select throws_ok(
  $$ update core.locations set name = 'Cuarto caliente' where id = 'a3000000-0000-4000-8000-000000000002' $$,
  '42501', null, 'el nombre de una ubicación no se cambia desde la API');

select throws_ok(
  $$ update core.locations set parent_id = null where id = 'a3000000-0000-4000-8000-000000000003' $$,
  '42501', null, 'una ubicación no se mueve desde la API');

-- Bajo RLS no alcanza la de B: la sentencia no falla, pero no cambia nada (se comprueba al final).
select lives_ok(
  $$ update core.locations set version = version + 1 where id = 'b3000000-0000-4000-8000-000000000001' $$,
  'actualizar una ubicación de otro espacio no la alcanza');

-- ---------------------------------------------------------------------------
-- Nombres plegados en el mismo nivel
-- ---------------------------------------------------------------------------

select throws_ok(
  $$ insert into core.locations (workspace_id, parent_id, kind, code, name)
     values ('a0000000-0000-4000-8000-00000000000a', 'a3000000-0000-4000-8000-000000000001', 'room', 'CF-2', '  cuarto   FRIO ') $$,
  '23505', null, 'un nombre no se repite en el mismo nivel sin tildes, mayúsculas ni espacios de más');

select lives_ok(
  $$ insert into core.locations (workspace_id, parent_id, kind, code, name)
     values ('a0000000-0000-4000-8000-00000000000a', 'a3000000-0000-4000-8000-000000000005', 'storage', 'M2-LAB', 'Mesón 2') $$,
  'el mismo nombre vale en otra área');

select is(
  inventory.fold_text('  Ácido   Clorhídrico '),
  core.fold_text('acido clorhidrico'),
  'el plegado de inventario es el de Core');

-- ---------------------------------------------------------------------------
-- Historial de estado físico: inmutable, con autoría propia y siempre un cambio
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into equipment.conservation_changes (workspace_id, asset_id, from_conservation, to_conservation, actor_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'good', 'fair',
             'a2000000-0000-4000-8000-000000000001') $$,
  'un cambio de estado físico se registra');

select throws_ok(
  $$ insert into equipment.conservation_changes (workspace_id, asset_id, from_conservation, to_conservation, actor_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'fair', 'fair',
             'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'el historial de estado físico registra solo cambios');

select throws_ok(
  $$ insert into equipment.conservation_changes (workspace_id, asset_id, from_conservation, to_conservation, actor_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'fair', 'poor',
             'b2000000-0000-4000-8000-000000000001') $$,
  '42501', null, 'la autoría del cambio es del principal del contexto');

select throws_ok(
  $$ update equipment.conservation_changes set to_conservation = 'poor' $$,
  '42501', null, 'el historial de estado físico no se edita');

reset role;

select is(
  (select version from core.locations where id = 'b3000000-0000-4000-8000-000000000001'),
  1,
  'RLS: la ubicación de otro espacio sigue intacta');

select results_eq(
  $$ select role_code from core.role_permissions where permission_code = 'equipment.report.read' $$,
  array['admin'],
  'exportar el Informe es del Administrador; el Propietario lo hereda');

select * from finish();
rollback;
