-- Demo sintética de G0 (primer incremento, «Datos y reglas mínimas»). Solo desarrollo local y CI:
-- nombres, correos y contraseñas son ficticios y no hay datos personales.
--
-- Cuentas (contraseña local: platlab-demo):
--   admin@demo.platlab.test        Ana Administradora: Administradora en A; propietaria y Administradora en C.
--   operador@demo.platlab.test     Óscar Operador: Operador en A; propietario y Administrador en B.
--   propietaria@demo.platlab.test  Paula Propietaria: propietaria de A, sin rol operativo.
--
-- Espacios: A y B con Reactivos (B ya tiene existencias propias); C sin Reactivos.

begin;

-- ---------------------------------------------------------------------------
-- Cuentas de Supabase Auth locales
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
select '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
       extensions.crypt('platlab-demo', extensions.gen_salt('bf')), now(),
       '{"provider": "email", "providers": ["email"]}', jsonb_build_object('name', u.name), now(), now(),
       '', '', '', ''
  from (values
    ('d0000000-0000-4000-8000-000000000001'::uuid, 'admin@demo.platlab.test', 'Ana Administradora'),
    ('d0000000-0000-4000-8000-000000000002'::uuid, 'operador@demo.platlab.test', 'Óscar Operador'),
    ('d0000000-0000-4000-8000-000000000003'::uuid, 'propietaria@demo.platlab.test', 'Paula Propietaria')
  ) as u (id, email, name);

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
  from auth.users as u
 where u.id in ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002',
                'd0000000-0000-4000-8000-000000000003');

-- ---------------------------------------------------------------------------
-- Core: titular, espacios, identidades, membresías, principales y ubicaciones
-- ---------------------------------------------------------------------------

insert into platform.customer_accounts (id, legal_name)
values ('d1000000-0000-4000-8000-000000000001', 'Universidad Demo (sintética)');

insert into core.workspaces (id, customer_account_id, code, name, time_zone) values
  ('da000000-0000-4000-8000-00000000000a', 'd1000000-0000-4000-8000-000000000001', 'demo-quimica', 'Laboratorio de Química', 'America/Guayaquil'),
  ('db000000-0000-4000-8000-00000000000b', 'd1000000-0000-4000-8000-000000000001', 'demo-biologia', 'Laboratorio de Biología', 'America/Guayaquil'),
  ('dc000000-0000-4000-8000-00000000000c', 'd1000000-0000-4000-8000-000000000001', 'demo-fisica', 'Laboratorio de Física', 'America/Guayaquil');

insert into core.identities (id, provider, provider_subject, display_name) values
  ('d2000000-0000-4000-8000-000000000001', 'supabase', 'd0000000-0000-4000-8000-000000000001', 'Ana Administradora'),
  ('d2000000-0000-4000-8000-000000000002', 'supabase', 'd0000000-0000-4000-8000-000000000002', 'Óscar Operador'),
  ('d2000000-0000-4000-8000-000000000003', 'supabase', 'd0000000-0000-4000-8000-000000000003', 'Paula Propietaria');

insert into core.memberships (id, workspace_id, identity_id) values
  ('da100000-0000-4000-8000-000000000001', 'da000000-0000-4000-8000-00000000000a', 'd2000000-0000-4000-8000-000000000001'),
  ('da100000-0000-4000-8000-000000000002', 'da000000-0000-4000-8000-00000000000a', 'd2000000-0000-4000-8000-000000000002'),
  ('da100000-0000-4000-8000-000000000003', 'da000000-0000-4000-8000-00000000000a', 'd2000000-0000-4000-8000-000000000003'),
  ('db100000-0000-4000-8000-000000000002', 'db000000-0000-4000-8000-00000000000b', 'd2000000-0000-4000-8000-000000000002'),
  ('dc100000-0000-4000-8000-000000000001', 'dc000000-0000-4000-8000-00000000000c', 'd2000000-0000-4000-8000-000000000001');

insert into core.principals (id, workspace_id, kind, membership_id) values
  ('da200000-0000-4000-8000-000000000001', 'da000000-0000-4000-8000-00000000000a', 'member', 'da100000-0000-4000-8000-000000000001'),
  ('da200000-0000-4000-8000-000000000002', 'da000000-0000-4000-8000-00000000000a', 'member', 'da100000-0000-4000-8000-000000000002'),
  ('da200000-0000-4000-8000-000000000003', 'da000000-0000-4000-8000-00000000000a', 'member', 'da100000-0000-4000-8000-000000000003'),
  ('db200000-0000-4000-8000-000000000002', 'db000000-0000-4000-8000-00000000000b', 'member', 'db100000-0000-4000-8000-000000000002'),
  ('dc200000-0000-4000-8000-000000000001', 'dc000000-0000-4000-8000-00000000000c', 'member', 'dc100000-0000-4000-8000-000000000001');

update core.workspaces set owner_membership_id = 'da100000-0000-4000-8000-000000000003', status = 'active'
 where id = 'da000000-0000-4000-8000-00000000000a';
update core.workspaces set owner_membership_id = 'db100000-0000-4000-8000-000000000002', status = 'active'
 where id = 'db000000-0000-4000-8000-00000000000b';
update core.workspaces set owner_membership_id = 'dc100000-0000-4000-8000-000000000001', status = 'active'
 where id = 'dc000000-0000-4000-8000-00000000000c';

insert into core.locations (id, workspace_id, parent_id, kind, code, name) values
  ('da300000-0000-4000-8000-000000000001', 'da000000-0000-4000-8000-00000000000a', null, 'site', 'SEDE', 'Sede central'),
  ('da300000-0000-4000-8000-000000000002', 'da000000-0000-4000-8000-00000000000a', 'da300000-0000-4000-8000-000000000001', 'storage', 'ALM-REA', 'Almacén de reactivos'),
  ('da300000-0000-4000-8000-000000000003', 'da000000-0000-4000-8000-00000000000a', 'da300000-0000-4000-8000-000000000001', 'room', 'LAB-1', 'Laboratorio 1'),
  ('db300000-0000-4000-8000-000000000001', 'db000000-0000-4000-8000-00000000000b', null, 'site', 'SEDE', 'Sede norte'),
  ('db300000-0000-4000-8000-000000000002', 'db000000-0000-4000-8000-00000000000b', 'db300000-0000-4000-8000-000000000001', 'storage', 'ALM-BIO', 'Almacén de biología'),
  ('dc300000-0000-4000-8000-000000000001', 'dc000000-0000-4000-8000-00000000000c', null, 'site', 'SEDE', 'Sede sur');

insert into core.role_assignments (workspace_id, principal_id, role_code) values
  ('da000000-0000-4000-8000-00000000000a', 'da200000-0000-4000-8000-000000000001', 'admin'),
  ('da000000-0000-4000-8000-00000000000a', 'da200000-0000-4000-8000-000000000002', 'operator'),
  ('db000000-0000-4000-8000-00000000000b', 'db200000-0000-4000-8000-000000000002', 'admin'),
  ('dc000000-0000-4000-8000-00000000000c', 'dc200000-0000-4000-8000-000000000001', 'admin');

-- ---------------------------------------------------------------------------
-- Derechos: Reactivos para A y B por el comando contractual (T-04); C sin Reactivos
-- ---------------------------------------------------------------------------

insert into platform.contracts (id, workspace_id) values
  ('da400000-0000-4000-8000-000000000001', 'da000000-0000-4000-8000-00000000000a'),
  ('db400000-0000-4000-8000-000000000001', 'db000000-0000-4000-8000-00000000000b');

insert into platform.contract_revisions (id, workspace_id, contract_id, revision_number, kind) values
  ('da500000-0000-4000-8000-000000000001', 'da000000-0000-4000-8000-00000000000a', 'da400000-0000-4000-8000-000000000001', 1, 'demo'),
  ('db500000-0000-4000-8000-000000000001', 'db000000-0000-4000-8000-00000000000b', 'db400000-0000-4000-8000-000000000001', 1, 'demo');

insert into platform.contract_revision_modules (workspace_id, revision_id, module_code, valid_from) values
  ('da000000-0000-4000-8000-00000000000a', 'da500000-0000-4000-8000-000000000001', 'reagents', now() - interval '1 day'),
  ('db000000-0000-4000-8000-00000000000b', 'db500000-0000-4000-8000-000000000001', 'reagents', now() - interval '1 day');

select platform.apply_contract_revision('da500000-0000-4000-8000-000000000001', 'seed demo');
select platform.apply_contract_revision('db500000-0000-4000-8000-000000000001', 'seed demo');

-- ---------------------------------------------------------------------------
-- Existencias propias de B, para probar el aislamiento con datos en ambos lados
-- ---------------------------------------------------------------------------

insert into inventory.items (id, workspace_id, kind, code, name, base_unit) values
  ('db600000-0000-4000-8000-000000000001', 'db000000-0000-4000-8000-00000000000b', 'reagent', 'ETOH-96', 'Etanol 96 %', 'mL');
insert into reagents.products (workspace_id, item_id, cas_number, physical_state) values
  ('db000000-0000-4000-8000-00000000000b', 'db600000-0000-4000-8000-000000000001', '64-17-5', 'liquid');
insert into inventory.lots (id, workspace_id, item_id, code, supplier_name, expires_on) values
  ('db700000-0000-4000-8000-000000000001', 'db000000-0000-4000-8000-00000000000b', 'db600000-0000-4000-8000-000000000001', 'ETOH-2026-01', 'Proveedor sintético', '2027-06-30');
insert into inventory.positions (id, workspace_id, item_id, lot_id, location_id) values
  ('db800000-0000-4000-8000-000000000001', 'db000000-0000-4000-8000-00000000000b', 'db600000-0000-4000-8000-000000000001', 'db700000-0000-4000-8000-000000000001', 'db300000-0000-4000-8000-000000000002');
insert into inventory.operations (id, workspace_id, type, actor_principal_id, reference, correlation_id) values
  ('db900000-0000-4000-8000-000000000001', 'db000000-0000-4000-8000-00000000000b', 'receipt', 'db200000-0000-4000-8000-000000000002', 'Saldo inicial de la demo', gen_random_uuid());

with moved as (
  update inventory.positions set balance = balance + 500
   where id = 'db800000-0000-4000-8000-000000000001'
  returning id, balance
)
insert into inventory.entries (workspace_id, operation_id, position_id, quantity, captured_quantity, captured_unit, balance_after)
select 'db000000-0000-4000-8000-00000000000b', 'db900000-0000-4000-8000-000000000001', id, 500, 500, 'mL', balance
  from moved;

commit;
