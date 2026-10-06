-- Demo sintética de G0 (primer incremento, «Datos y reglas mínimas»). Solo desarrollo local y CI:
-- nombres, correos y contraseñas son ficticios y no hay datos personales.
--
-- Cuentas (contraseña local: platlab-demo):
--   admin@demo.platlab.test        Ana Administradora: Administradora en A; propietaria y Administradora en C.
--   operador@demo.platlab.test     Óscar Operador: Operador en A; propietario y Administrador en B.
--   propietaria@demo.platlab.test  Paula Propietaria: propietaria de A, sin rol asignado; opera con los
--                                  permisos del Administrador por ser propietaria (ADR 0008, 02-10-2026).
--   docente@demo.platlab.test      Diego Docente: Docente en A, sin permisos de Reactivos.
--
-- Espacios: A y B con Reactivos (A con 30 días de historial y B con existencias propias); C sin
-- Reactivos.

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
    ('d0000000-0000-4000-8000-000000000003'::uuid, 'propietaria@demo.platlab.test', 'Paula Propietaria'),
    ('d0000000-0000-4000-8000-000000000004'::uuid, 'docente@demo.platlab.test', 'Diego Docente')
  ) as u (id, email, name);

insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select u.id::text, u.id, jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       'email', now(), now(), now()
  from auth.users as u
 where u.id in ('d0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000002',
                'd0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000004');

-- ---------------------------------------------------------------------------
-- Core: titular, espacios, identidades, membresías, principales y ubicaciones
-- ---------------------------------------------------------------------------

-- Dos titulares (01 §2): la Universidad contrata dos espacios, y el Instituto Tecnológico, otro.
-- Ningún espacio ve los datos de otro, aunque sean del mismo titular. Ana pertenece a espacios de
-- las dos instituciones, y su menú de espacios las distingue (ADR 0011, 05-10-2026).
insert into platform.customer_accounts (id, legal_name) values
  ('d1000000-0000-4000-8000-000000000001', 'Universidad Demo (sintética)'),
  ('d1000000-0000-4000-8000-000000000002', 'Instituto Tecnológico Demo (sintético)');

insert into core.workspaces (id, customer_account_id, code, name, institution_name, time_zone) values
  ('da000000-0000-4000-8000-00000000000a', 'd1000000-0000-4000-8000-000000000001', 'demo-ciencias', 'Facultad de Ciencias', 'Universidad Demo', 'America/Guayaquil'),
  ('db000000-0000-4000-8000-00000000000b', 'd1000000-0000-4000-8000-000000000001', 'demo-biotecnologia', 'Instituto de Biotecnología', 'Universidad Demo', 'America/Guayaquil'),
  ('dc000000-0000-4000-8000-00000000000c', 'd1000000-0000-4000-8000-000000000002', 'demo-investigacion', 'Centro de Investigación', 'Instituto Tecnológico Demo', 'America/Guayaquil');

insert into core.identities (id, provider, provider_subject, display_name) values
  ('d2000000-0000-4000-8000-000000000001', 'supabase', 'd0000000-0000-4000-8000-000000000001', 'Ana Administradora'),
  ('d2000000-0000-4000-8000-000000000002', 'supabase', 'd0000000-0000-4000-8000-000000000002', 'Óscar Operador'),
  ('d2000000-0000-4000-8000-000000000003', 'supabase', 'd0000000-0000-4000-8000-000000000003', 'Paula Propietaria'),
  ('d2000000-0000-4000-8000-000000000004', 'supabase', 'd0000000-0000-4000-8000-000000000004', 'Diego Docente');

insert into core.memberships (id, workspace_id, identity_id) values
  ('da100000-0000-4000-8000-000000000001', 'da000000-0000-4000-8000-00000000000a', 'd2000000-0000-4000-8000-000000000001'),
  ('da100000-0000-4000-8000-000000000002', 'da000000-0000-4000-8000-00000000000a', 'd2000000-0000-4000-8000-000000000002'),
  ('da100000-0000-4000-8000-000000000003', 'da000000-0000-4000-8000-00000000000a', 'd2000000-0000-4000-8000-000000000003'),
  ('da100000-0000-4000-8000-000000000004', 'da000000-0000-4000-8000-00000000000a', 'd2000000-0000-4000-8000-000000000004'),
  ('db100000-0000-4000-8000-000000000002', 'db000000-0000-4000-8000-00000000000b', 'd2000000-0000-4000-8000-000000000002'),
  ('dc100000-0000-4000-8000-000000000001', 'dc000000-0000-4000-8000-00000000000c', 'd2000000-0000-4000-8000-000000000001');

insert into core.principals (id, workspace_id, kind, membership_id) values
  ('da200000-0000-4000-8000-000000000001', 'da000000-0000-4000-8000-00000000000a', 'member', 'da100000-0000-4000-8000-000000000001'),
  ('da200000-0000-4000-8000-000000000002', 'da000000-0000-4000-8000-00000000000a', 'member', 'da100000-0000-4000-8000-000000000002'),
  ('da200000-0000-4000-8000-000000000003', 'da000000-0000-4000-8000-00000000000a', 'member', 'da100000-0000-4000-8000-000000000003'),
  ('da200000-0000-4000-8000-000000000004', 'da000000-0000-4000-8000-00000000000a', 'member', 'da100000-0000-4000-8000-000000000004'),
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
  ('da300000-0000-4000-8000-000000000003', 'da000000-0000-4000-8000-00000000000a', 'da300000-0000-4000-8000-000000000001', 'room', 'LAB-QUI', 'Laboratorio de Química'),
  ('da300000-0000-4000-8000-000000000004', 'da000000-0000-4000-8000-00000000000a', 'da300000-0000-4000-8000-000000000001', 'room', 'LAB-FIS', 'Laboratorio de Física'),
  ('db300000-0000-4000-8000-000000000001', 'db000000-0000-4000-8000-00000000000b', null, 'site', 'SEDE', 'Sede norte'),
  ('db300000-0000-4000-8000-000000000002', 'db000000-0000-4000-8000-00000000000b', 'db300000-0000-4000-8000-000000000001', 'storage', 'ALM-BIO', 'Almacén de biología'),
  ('dc300000-0000-4000-8000-000000000001', 'dc000000-0000-4000-8000-00000000000c', null, 'site', 'SEDE', 'Sede sur');

insert into core.role_assignments (workspace_id, principal_id, role_code) values
  ('da000000-0000-4000-8000-00000000000a', 'da200000-0000-4000-8000-000000000001', 'admin'),
  ('da000000-0000-4000-8000-00000000000a', 'da200000-0000-4000-8000-000000000002', 'operator'),
  ('da000000-0000-4000-8000-00000000000a', 'da200000-0000-4000-8000-000000000004', 'teacher'),
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
-- Un frasco de 500 mL (ADR 0012): el lote reparte su número.
update inventory.lots set container_seq = 1 where id = 'db700000-0000-4000-8000-000000000001';
insert into inventory.containers (id, workspace_id, item_id, lot_id, seq, initial_quantity) values
  ('dbc00000-0000-4000-8000-000000000001', 'db000000-0000-4000-8000-00000000000b', 'db600000-0000-4000-8000-000000000001', 'db700000-0000-4000-8000-000000000001', 1, 500);
insert into inventory.positions (id, workspace_id, item_id, lot_id, container_id, location_id) values
  ('db800000-0000-4000-8000-000000000001', 'db000000-0000-4000-8000-00000000000b', 'db600000-0000-4000-8000-000000000001', 'db700000-0000-4000-8000-000000000001', 'dbc00000-0000-4000-8000-000000000001', 'db300000-0000-4000-8000-000000000002');
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

-- ---------------------------------------------------------------------------
-- Historial sintético de A: tres reactivos con 30 días de movimientos, para que el Inicio y el
-- Resumen tengan cifras y un gráfico con datos (ADR 0011). Solo el seed puede fechar en el pasado:
-- el runtime no tiene permiso sobre effective_at. Cada asiento deja el saldo acumulado.
-- ---------------------------------------------------------------------------

insert into inventory.items (id, workspace_id, kind, code, name, base_unit) values
  ('da600000-0000-4000-8000-000000000001', 'da000000-0000-4000-8000-00000000000a', 'reagent', 'NACL', 'Cloruro de sodio', 'g'),
  ('da600000-0000-4000-8000-000000000002', 'da000000-0000-4000-8000-00000000000a', 'reagent', 'HCL-37', 'Ácido clorhídrico 37 %', 'mL'),
  ('da600000-0000-4000-8000-000000000003', 'da000000-0000-4000-8000-00000000000a', 'reagent', 'NAOH', 'Hidróxido de sodio', 'g');
insert into reagents.products (workspace_id, item_id, cas_number, physical_state) values
  ('da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000001', '7647-14-5', 'solid'),
  ('da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000002', '7647-01-0', 'liquid'),
  ('da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000003', '1310-73-2', 'solid');
insert into inventory.lots (id, workspace_id, item_id, code, supplier_name, expires_on) values
  ('da700000-0000-4000-8000-000000000001', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000001', 'NACL-2026-03', 'Proveedor sintético', '2028-03-31'),
  ('da700000-0000-4000-8000-000000000002', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000002', 'HCL-2026-01', 'Proveedor sintético', '2027-01-15'),
  ('da700000-0000-4000-8000-000000000003', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000003', 'NAOH-2025-11', 'Proveedor sintético', '2026-11-20');
-- Frascos (ADR 0012): NaCl en 2 frascos de 1000 g, HCl en 2 de 2500 mL y NaOH en 1 de 1000 g.
insert into inventory.containers (id, workspace_id, item_id, lot_id, seq, initial_quantity) values
  ('dac00000-0000-4000-8000-000000000001', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000001', 'da700000-0000-4000-8000-000000000001', 1, 1000),
  ('dac00000-0000-4000-8000-000000000002', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000001', 'da700000-0000-4000-8000-000000000001', 2, 1000),
  ('dac00000-0000-4000-8000-000000000003', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000002', 'da700000-0000-4000-8000-000000000002', 1, 2500),
  ('dac00000-0000-4000-8000-000000000004', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000002', 'da700000-0000-4000-8000-000000000002', 2, 2500),
  ('dac00000-0000-4000-8000-000000000005', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000003', 'da700000-0000-4000-8000-000000000003', 1, 1000);
update inventory.lots set container_seq = 2 where id in ('da700000-0000-4000-8000-000000000001', 'da700000-0000-4000-8000-000000000002');
update inventory.lots set container_seq = 1 where id = 'da700000-0000-4000-8000-000000000003';
insert into inventory.positions (id, workspace_id, item_id, lot_id, container_id, location_id)
select ('da800000-0000-4000-8000-00000000000' || right(c.id::text, 1))::uuid, c.workspace_id, c.item_id, c.lot_id, c.id,
       'da300000-0000-4000-8000-000000000002'
  from inventory.containers as c
 where c.workspace_id = 'da000000-0000-4000-8000-00000000000a';

do $$
declare
  operation_id uuid;
  balance numeric;
  position_n int;
  issues_today int;
  sequence_n int := 0;
  -- Frasco → unidad, cantidad inicial y lote: 1-2 NaCl (g), 3-4 HCl (mL), 5 NaOH (g).
  units text[] := array['g', 'g', 'mL', 'mL', 'g'];
  initial numeric[] := array[1000, 1000, 2500, 2500, 1000];
  reasons text[] := array['Práctica de Química General', 'Práctica de Análisis Químico', 'Preparación de soluciones',
                          'Práctica de Química Orgánica', 'Proyecto de titulación'];
begin
  -- Un ingreso por lote hace 29 días, con un asiento por frasco. Cada asiento deja el saldo
  -- acumulado y las fechas son locales del espacio.
  for lot_n in 1..3 loop
    insert into inventory.operations (workspace_id, type, actor_principal_id, reference, effective_at, correlation_id)
    values ('da000000-0000-4000-8000-00000000000a', 'receipt', 'da200000-0000-4000-8000-000000000001', 'Compra sintética',
            ((now() at time zone 'America/Guayaquil')::date - 29 + make_interval(hours => 8 + lot_n))
              at time zone 'America/Guayaquil',
            gen_random_uuid())
    returning id into operation_id;
    for position_n in select unnest(case lot_n when 1 then array[1, 2] when 2 then array[3, 4] else array[5] end) loop
      update inventory.positions set balance = positions.balance + initial[position_n]
       where id = ('da800000-0000-4000-8000-00000000000' || position_n)::uuid
      returning positions.balance into balance;
      insert into inventory.entries (workspace_id, operation_id, position_id, quantity, captured_quantity, captured_unit, balance_after)
      values ('da000000-0000-4000-8000-00000000000a', operation_id, ('da800000-0000-4000-8000-00000000000' || position_n)::uuid,
              initial[position_n], initial[position_n], units[position_n], balance);
    end loop;
  end loop;

  -- Salidas de los últimos 28 días: de 1 a 4 por día laborable y ninguna el fin de semana. Las
  -- pide el Operador y las aprueba la Administradora (ADR 0012): ella es la responsable.
  for day_offset in reverse 28..1 loop
    if extract(isodow from (now() at time zone 'America/Guayaquil')::date - day_offset) in (6, 7) then
      continue;
    end if;
    issues_today := 1 + (day_offset * 7) % 4;
    for i in 1..issues_today loop
      sequence_n := sequence_n + 1;
      position_n := 1 + sequence_n % 5;
      insert into inventory.operations
        (workspace_id, type, actor_principal_id, requested_by_principal_id, reason, destination, effective_at, correlation_id)
      values ('da000000-0000-4000-8000-00000000000a', 'issue', 'da200000-0000-4000-8000-000000000001',
              'da200000-0000-4000-8000-000000000002', reasons[1 + sequence_n % 5], 'Laboratorio de Química',
              ((now() at time zone 'America/Guayaquil')::date - day_offset + make_interval(hours => 8 + i * 2))
                at time zone 'America/Guayaquil',
              gen_random_uuid())
      returning id into operation_id;
      update inventory.positions set balance = positions.balance - (10 + (sequence_n * 7) % 25)
       where id = ('da800000-0000-4000-8000-00000000000' || position_n)::uuid
      returning positions.balance into balance;
      insert into inventory.entries (workspace_id, operation_id, position_id, quantity, captured_quantity, captured_unit, balance_after)
      values ('da000000-0000-4000-8000-00000000000a', operation_id, ('da800000-0000-4000-8000-00000000000' || position_n)::uuid,
              -(10 + (sequence_n * 7) % 25), -(10 + (sequence_n * 7) % 25), units[position_n], balance);
    end loop;
  end loop;

  -- Un ajuste por conteo hace una semana, con su motivo.
  insert into inventory.operations (workspace_id, type, actor_principal_id, reason, effective_at, correlation_id)
  values ('da000000-0000-4000-8000-00000000000a', 'adjustment', 'da200000-0000-4000-8000-000000000001', 'Conteo mensual',
          ((now() at time zone 'America/Guayaquil')::date - 7 + make_interval(hours => 17)) at time zone 'America/Guayaquil',
          gen_random_uuid())
  returning id into operation_id;
  update inventory.positions set balance = positions.balance - 2.5
   where id = 'da800000-0000-4000-8000-000000000005'
  returning positions.balance into balance;
  insert into inventory.entries (workspace_id, operation_id, position_id, quantity, captured_quantity, captured_unit, balance_after)
  values ('da000000-0000-4000-8000-00000000000a', operation_id, 'da800000-0000-4000-8000-000000000005', -2.5, -2.5, 'g', balance);
end
$$;

-- Ácido sulfúrico con tres lotes (vencido, próximo y lejano) para la sugerencia FEFO y el aviso de
-- frasco vencido, y Acetona agotada para el interruptor «Mostrar agotados» (ADR 0012).
insert into inventory.items (id, workspace_id, kind, code, name, base_unit) values
  ('da600000-0000-4000-8000-000000000004', 'da000000-0000-4000-8000-00000000000a', 'reagent', 'H2SO4', 'Ácido sulfúrico 98 %', 'mL'),
  ('da600000-0000-4000-8000-000000000005', 'da000000-0000-4000-8000-00000000000a', 'reagent', 'ACETONA', 'Acetona', 'mL');
insert into reagents.products (workspace_id, item_id, cas_number, physical_state) values
  ('da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000004', '7664-93-9', 'liquid'),
  ('da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000005', '67-64-1', 'liquid');
insert into inventory.lots (id, workspace_id, item_id, code, supplier_name, expires_on, container_seq) values
  ('da700000-0000-4000-8000-000000000004', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000004', 'H2SO4-2024-08', 'Proveedor sintético', '2026-08-31', 1),
  ('da700000-0000-4000-8000-000000000005', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000004', 'H2SO4-2026-02', 'Proveedor sintético', '2026-12-31', 1),
  ('da700000-0000-4000-8000-000000000006', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000004', 'H2SO4-2026-09', 'Proveedor sintético', '2028-09-30', 1),
  ('da700000-0000-4000-8000-000000000007', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000005', 'ACE-2026-01', 'Proveedor sintético', '2027-03-31', 1);
insert into inventory.containers (id, workspace_id, item_id, lot_id, seq, initial_quantity) values
  ('dac00000-0000-4000-8000-000000000006', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000004', 'da700000-0000-4000-8000-000000000004', 1, 250),
  ('dac00000-0000-4000-8000-000000000007', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000004', 'da700000-0000-4000-8000-000000000005', 1, 1000),
  ('dac00000-0000-4000-8000-000000000008', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000004', 'da700000-0000-4000-8000-000000000006', 1, 1000),
  ('dac00000-0000-4000-8000-000000000009', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000005', 'da700000-0000-4000-8000-000000000007', 1, 500);
insert into inventory.positions (id, workspace_id, item_id, lot_id, container_id, location_id)
select ('da800000-0000-4000-8000-00000000000' || right(c.id::text, 1))::uuid, c.workspace_id, c.item_id, c.lot_id, c.id,
       'da300000-0000-4000-8000-000000000002'
  from inventory.containers as c
 where c.id in ('dac00000-0000-4000-8000-000000000006', 'dac00000-0000-4000-8000-000000000007',
                'dac00000-0000-4000-8000-000000000008', 'dac00000-0000-4000-8000-000000000009');

do $$
declare
  operation_id uuid;
  balance numeric;
  movement record;
begin
  -- (frasco, tipo, cantidad con signo, días atrás, actor, motivo, destino)
  for movement in
    select * from (values
      (6, 'receipt', 250::numeric, 20, 1, null, null),
      (7, 'receipt', 1000, 20, 1, null, null),
      (8, 'receipt', 1000, 20, 1, null, null),
      (9, 'receipt', 500, 18, 1, null, null),
      (9, 'issue', -500, 5, 2, 'Práctica de Química Orgánica', 'Laboratorio de Física')
    ) as m (position_n, type, quantity, days_ago, actor_n, reason, destination)
  loop
    insert into inventory.operations (workspace_id, type, actor_principal_id, reason, destination, reference, effective_at, correlation_id)
    values ('da000000-0000-4000-8000-00000000000a', movement.type, ('da200000-0000-4000-8000-00000000000' || movement.actor_n)::uuid,
            movement.reason, movement.destination, case when movement.type = 'receipt' then 'Compra sintética' end,
            ((now() at time zone 'America/Guayaquil')::date - movement.days_ago + make_interval(hours => 10))
              at time zone 'America/Guayaquil',
            gen_random_uuid())
    returning id into operation_id;
    update inventory.positions set balance = positions.balance + movement.quantity
     where id = ('da800000-0000-4000-8000-00000000000' || movement.position_n)::uuid
    returning positions.balance into balance;
    insert into inventory.entries (workspace_id, operation_id, position_id, quantity, captured_quantity, captured_unit, balance_after)
    values ('da000000-0000-4000-8000-00000000000a', operation_id, ('da800000-0000-4000-8000-00000000000' || movement.position_n)::uuid,
            movement.quantity, movement.quantity, 'mL', balance);
  end loop;
end
$$;

-- Motivos y destinos de A y B (ADR 0012): listas del laboratorio para elegir al registrar.
insert into inventory.reasons (workspace_id, item_kind, kind, name)
select w.id, 'reagent', r.kind, r.name
  from (values ('da000000-0000-4000-8000-00000000000a'::uuid), ('db000000-0000-4000-8000-00000000000b'::uuid)) as w (id)
 cross join (values
   ('issue', 'Práctica de Química General'), ('issue', 'Práctica de Análisis Químico'),
   ('issue', 'Preparación de soluciones'), ('issue', 'Proyecto de titulación'),
   ('adjustment', 'Conteo mensual'), ('adjustment', 'Derrame'), ('adjustment', 'Error de registro'),
   ('disposal', 'Vencido'), ('disposal', 'Contaminado'), ('disposal', 'Envase dañado')
 ) as r (kind, name);

-- Mínimos (ADR 0012, 05-10-2026): la Acetona, sin existencias, y el Hidróxido de sodio quedan bajo
-- su mínimo; el Cloruro de sodio, por encima.
update inventory.items set minimum_quantity = 1000 where id = 'da600000-0000-4000-8000-000000000005';
update inventory.items set minimum_quantity = 1000 where id = 'da600000-0000-4000-8000-000000000003';
update inventory.items set minimum_quantity = 500 where id = 'da600000-0000-4000-8000-000000000001';
insert into inventory.destinations (workspace_id, item_kind, name)
select w.id, 'reagent', d.name
  from (values ('da000000-0000-4000-8000-00000000000a'::uuid), ('db000000-0000-4000-8000-00000000000b'::uuid)) as w (id)
 cross join (values ('Laboratorio de Química'), ('Laboratorio de Física'), ('Bodega central')) as d (name);

-- Una solicitud de salida pendiente del Operador en la Facultad de Ciencias (ADR 0012): aparta 50 g del primer
-- frasco de NaCl hasta que la Administradora la apruebe o la rechace.
update inventory.positions set reserved = 50 where id = 'da800000-0000-4000-8000-000000000001';
insert into inventory.allocations
  (workspace_id, position_id, quantity, reason, destination, requested_by_principal_id, created_at)
values ('da000000-0000-4000-8000-00000000000a', 'da800000-0000-4000-8000-000000000001', 50,
        'Práctica de Análisis Químico', 'Laboratorio de Física', 'da200000-0000-4000-8000-000000000002', now() - interval '2 hours');

commit;
