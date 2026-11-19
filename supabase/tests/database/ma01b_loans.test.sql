-- MA-01b (ADR 0025): vales de préstamo, líneas y devoluciones bajo el rol de runtime. Aislamiento por espacio,
-- FKs compuestas, autoría propia, tope de lo resuelto, historial inmutable y sin borrado.
begin;
create extension if not exists pgtap with schema extensions;

select plan(15);

grant usage on schema extensions to platlab_api;
grant platlab_api to postgres with set true, inherit false;

-- ---------------------------------------------------------------------------
-- Fixtures sintéticos: A con dos miembros y una posición de material; B con su propio vale
-- ---------------------------------------------------------------------------

insert into platform.customer_accounts (id, legal_name)
values ('c0000000-0000-4000-8000-000000000001', 'Titular sintético');
insert into core.workspaces (id, customer_account_id, code, name, time_zone) values
  ('a0000000-0000-4000-8000-00000000000a', 'c0000000-0000-4000-8000-000000000001', 'ln-a', 'A', 'America/Guayaquil'),
  ('b0000000-0000-4000-8000-00000000000b', 'c0000000-0000-4000-8000-000000000001', 'ln-b', 'B', 'America/Guayaquil');
insert into core.identities (id, provider, provider_subject, display_name) values
  ('10000000-0000-4000-8000-000000000001', 'supabase', 'ln-a1', 'Operador A'),
  ('10000000-0000-4000-8000-000000000002', 'supabase', 'ln-a2', 'Docente A'),
  ('10000000-0000-4000-8000-000000000003', 'supabase', 'ln-b1', 'Operador B');
insert into core.memberships (id, workspace_id, identity_id) values
  ('a1000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000001'),
  ('a1000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', '10000000-0000-4000-8000-000000000002'),
  ('b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', '10000000-0000-4000-8000-000000000003');
insert into core.principals (id, workspace_id, kind, membership_id) values
  ('a2000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'member', 'a1000000-0000-4000-8000-000000000001'),
  ('a2000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-00000000000a', 'member', 'a1000000-0000-4000-8000-000000000002'),
  ('b2000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 'member', 'b1000000-0000-4000-8000-000000000001');
insert into core.locations (id, workspace_id, parent_id, kind, code, name) values
  ('a3000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', null, 'room', 'LAB-1', 'Laboratorio 1');
insert into inventory.items (id, workspace_id, kind, code, name, base_unit)
values ('a5000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'material', 'VAS-01', 'Vasos', 'u');
insert into inventory.lots (id, workspace_id, item_id, code)
values ('a6000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001', 'L-001');
insert into inventory.positions (id, workspace_id, item_id, lot_id, location_id)
values ('a7000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a5000000-0000-4000-8000-000000000001',
        'a6000000-0000-4000-8000-000000000001', 'a3000000-0000-4000-8000-000000000001');
-- Un vale de B, escrito como propietario para probar que A no lo alcanza.
insert into materials.loans (id, workspace_id, number, borrower_principal_id, lent_by_principal_id)
values ('b8000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-00000000000b', 1,
        'b2000000-0000-4000-8000-000000000001', 'b2000000-0000-4000-8000-000000000001');

set local role platlab_api;
select set_config('platlab.workspace_id', 'a0000000-0000-4000-8000-00000000000a', true);
select set_config('platlab.principal_id', 'a2000000-0000-4000-8000-000000000001', true);

-- ---------------------------------------------------------------------------
-- Vale: espacio, autoría, FKs compuestas y número único
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into materials.loans (id, workspace_id, number, borrower_principal_id, lent_by_principal_id)
     values ('a8000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 1,
             'a2000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000001') $$,
  'el runtime presta a un miembro del espacio');

select throws_ok(
  $$ insert into materials.loans (workspace_id, number, borrower_principal_id, lent_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 2, 'a2000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000002') $$,
  '42501', null, 'quien presta es el principal del contexto');

select throws_ok(
  $$ insert into materials.loans (workspace_id, number, borrower_principal_id, lent_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 2, 'b2000000-0000-4000-8000-000000000001', 'a2000000-0000-4000-8000-000000000001') $$,
  '23503', null, 'no se presta a un miembro de otro espacio');

select throws_ok(
  $$ insert into materials.loans (workspace_id, number, borrower_principal_id, lent_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 1, 'a2000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000001') $$,
  '23505', null, 'el número del vale no se repite en el espacio');

select throws_ok(
  $$ insert into materials.loans (workspace_id, number, borrower_principal_id, lent_by_principal_id, status)
     values ('a0000000-0000-4000-8000-00000000000a', 3, 'a2000000-0000-4000-8000-000000000002', 'a2000000-0000-4000-8000-000000000001', 'closed') $$,
  '23514', null, 'un vale cerrado tiene fecha de cierre');

select is((select count(*)::int from materials.loans), 1, 'solo se ve el vale del espacio de contexto');

-- ---------------------------------------------------------------------------
-- Líneas: lo resuelto nunca supera lo prestado
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into materials.loan_lines (id, workspace_id, loan_id, line, position_id, quantity)
     values ('a9000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-00000000000a', 'a8000000-0000-4000-8000-000000000001',
             1, 'a7000000-0000-4000-8000-000000000001', 4) $$,
  'el runtime añade la línea con la posición de su espacio');

select lives_ok(
  $$ update materials.loan_lines set returned = 2, damaged = 1, lost = 1 where id = 'a9000000-0000-4000-8000-000000000001' $$,
  'una devolución puede resolver hasta lo prestado');

select throws_ok(
  $$ update materials.loan_lines set returned = 3 where id = 'a9000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'lo devuelto, dañado y perdido no supera lo prestado');

select throws_ok(
  $$ update materials.loan_lines set quantity = 100 where id = 'a9000000-0000-4000-8000-000000000001' $$,
  '42501', null, 'la cantidad prestada no se edita');

-- ---------------------------------------------------------------------------
-- Devoluciones: historial inmutable y coherente con el libro
-- ---------------------------------------------------------------------------

select lives_ok(
  $$ insert into materials.return_lines (workspace_id, loan_line_id, outcome, quantity, returned_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a9000000-0000-4000-8000-000000000001', 'good', 2, 'a2000000-0000-4000-8000-000000000001') $$,
  'lo que vuelve bien no lleva baja del libro');

select throws_ok(
  $$ insert into materials.return_lines (workspace_id, loan_line_id, outcome, quantity, returned_by_principal_id)
     values ('a0000000-0000-4000-8000-00000000000a', 'a9000000-0000-4000-8000-000000000001', 'damaged', 1, 'a2000000-0000-4000-8000-000000000001') $$,
  '23514', null, 'lo dañado exige la baja del libro');

select throws_ok(
  $$ update materials.return_lines set quantity = 1 $$,
  '42501', null, 'una devolución registrada no se edita');

select throws_ok(
  $$ delete from materials.loans $$,
  '42501', null, 'nadie borra un préstamo');

reset role;
select is(
  (select count(*)::int from core.role_permissions where permission_code like 'materials.loan.%'), 4,
  'Operador y Administrador reciben prestar y devolver');

select * from finish();
rollback;
