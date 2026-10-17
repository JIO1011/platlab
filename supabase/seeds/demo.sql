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
-- Espacios: A con Reactivos y Equipos (30 días de historial y 12 equipos), B con Reactivos y
-- existencias propias; C sin módulos.

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
  -- Un área con niveles (E-01c): el cuarto frío y sus mesones.
  ('da300000-0000-4000-8000-000000000005', 'da000000-0000-4000-8000-00000000000a', 'da300000-0000-4000-8000-000000000001', 'room', 'CUARTO-FRIO', 'Cuarto frío'),
  ('da300000-0000-4000-8000-000000000006', 'da000000-0000-4000-8000-00000000000a', 'da300000-0000-4000-8000-000000000005', 'storage', 'CF-MESON-1', 'Mesón 1'),
  ('da300000-0000-4000-8000-000000000007', 'da000000-0000-4000-8000-00000000000a', 'da300000-0000-4000-8000-000000000005', 'storage', 'CF-MESON-2', 'Mesón 2'),
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
  -- Equipos (ADR 0019) en etapa development: la demo es sintética, así que la admisión lo permite.
  ('da000000-0000-4000-8000-00000000000a', 'da500000-0000-4000-8000-000000000001', 'equipment', now() - interval '1 day'),
  ('db000000-0000-4000-8000-00000000000b', 'db500000-0000-4000-8000-000000000001', 'reagents', now() - interval '1 day');

select platform.apply_contract_revision('da500000-0000-4000-8000-000000000001', 'seed demo');
select platform.apply_contract_revision('db500000-0000-4000-8000-000000000001', 'seed demo');

-- ---------------------------------------------------------------------------
-- Existencias propias de B, para probar el aislamiento con datos en ambos lados
-- ---------------------------------------------------------------------------

insert into inventory.items (id, workspace_id, kind, code, name, base_unit) values
  ('db600000-0000-4000-8000-000000000001', 'db000000-0000-4000-8000-00000000000b', 'reagent', 'ETOH-96', 'Etanol 96 %', 'mL');
insert into reagents.products (workspace_id, item_id, cas_number, physical_state, hazards, density) values
  ('db000000-0000-4000-8000-00000000000b', 'db600000-0000-4000-8000-000000000001', '64-17-5', 'liquid', '{GHS02,GHS07}', 0.789);
insert into inventory.lots (id, workspace_id, item_id, code, brand, expires_on) values
  ('db700000-0000-4000-8000-000000000001', 'db000000-0000-4000-8000-00000000000b', 'db600000-0000-4000-8000-000000000001', 'ETOH-2026-01', 'Marca sintética', '2027-06-30');
-- Un frasco de 500 mL (ADR 0012): el lote reparte su número.
update inventory.lots set container_seq = 1 where id = 'db700000-0000-4000-8000-000000000001';
insert into inventory.containers (id, workspace_id, item_id, lot_id, seq, code, initial_quantity) values
  ('dbc00000-0000-4000-8000-000000000001', 'db000000-0000-4000-8000-00000000000b', 'db600000-0000-4000-8000-000000000001', 'db700000-0000-4000-8000-000000000001', 1, 'ETOH-2026-01-01', 500);
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
-- Ficha (ADR 0015): pictogramas SGA, densidad de los líquidos y el ácido clorhídrico controlado.
insert into reagents.products (workspace_id, item_id, cas_number, physical_state, hazards, controlled, density) values
  ('da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000001', '7647-14-5', 'solid', '{}', false, null),
  ('da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000002', '7647-01-0', 'liquid', '{GHS05,GHS07}', true, 1.19),
  ('da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000003', '1310-73-2', 'solid', '{GHS05}', false, null);
insert into inventory.lots (id, workspace_id, item_id, code, brand, expires_on) values
  ('da700000-0000-4000-8000-000000000001', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000001', 'NACL-2026-03', 'Marca sintética', '2028-03-31'),
  ('da700000-0000-4000-8000-000000000002', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000002', 'HCL-2026-01', 'Marca sintética', '2027-01-15'),
  ('da700000-0000-4000-8000-000000000003', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000003', 'NAOH-2025-11', 'Marca sintética', '2026-11-20');
-- Frascos (ADR 0012): NaCl en 2 frascos de 1000 g, HCl en 2 de 2500 mL y NaOH en 1 de 1000 g.
-- Con control por peso (ADR 0015): el primer frasco de NaCl (masa) y el primero de HCl (volumen).
insert into inventory.containers (id, workspace_id, item_id, lot_id, seq, code, initial_quantity, tare, density) values
  ('dac00000-0000-4000-8000-000000000001', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000001', 'da700000-0000-4000-8000-000000000001', 1, 'NACL-2026-03-01', 1000, 140, null),
  ('dac00000-0000-4000-8000-000000000002', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000001', 'da700000-0000-4000-8000-000000000001', 2, 'NACL-2026-03-02', 1000, null, null),
  ('dac00000-0000-4000-8000-000000000003', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000002', 'da700000-0000-4000-8000-000000000002', 1, 'HCL-2026-01-01', 2500, 420, 1.19),
  ('dac00000-0000-4000-8000-000000000004', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000002', 'da700000-0000-4000-8000-000000000002', 2, 'HCL-2026-01-02', 2500, null, null),
  ('dac00000-0000-4000-8000-000000000005', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000003', 'da700000-0000-4000-8000-000000000003', 1, 'NAOH-2025-11-01', 1000, null, null);
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
insert into reagents.products (workspace_id, item_id, cas_number, physical_state, hazards, controlled, density) values
  ('da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000004', '7664-93-9', 'liquid', '{GHS05}', false, 1.84),
  ('da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000005', '67-64-1', 'liquid', '{GHS02,GHS07}', true, 0.79);
insert into inventory.lots (id, workspace_id, item_id, code, brand, expires_on, container_seq) values
  ('da700000-0000-4000-8000-000000000004', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000004', 'H2SO4-2024-08', 'Marca sintética', '2026-08-31', 1),
  ('da700000-0000-4000-8000-000000000005', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000004', 'H2SO4-2026-02', 'Marca sintética', '2026-12-31', 1),
  ('da700000-0000-4000-8000-000000000006', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000004', 'H2SO4-2026-09', 'Marca sintética', '2028-09-30', 1),
  ('da700000-0000-4000-8000-000000000007', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000005', 'ACE-2026-01', 'Marca sintética', '2027-03-31', 1);
-- La Acetona, agotada, conserva su tara (ADR 0015).
insert into inventory.containers (id, workspace_id, item_id, lot_id, seq, code, initial_quantity, tare, density) values
  ('dac00000-0000-4000-8000-000000000006', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000004', 'da700000-0000-4000-8000-000000000004', 1, 'H2SO4-2024-08-01', 250, null, null),
  ('dac00000-0000-4000-8000-000000000007', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000004', 'da700000-0000-4000-8000-000000000005', 1, 'H2SO4-2026-02-01', 1000, null, null),
  ('dac00000-0000-4000-8000-000000000008', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000004', 'da700000-0000-4000-8000-000000000006', 1, 'H2SO4-2026-09-01', 1000, null, null),
  ('dac00000-0000-4000-8000-000000000009', 'da000000-0000-4000-8000-00000000000a', 'da600000-0000-4000-8000-000000000005', 'da700000-0000-4000-8000-000000000007', 1, 'ACE-2026-01-01', 500, 135, 0.79);
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
   -- Desechar un frasco es un ajuste a cero con motivo (ADR 0012, 05-10-2026).
   ('adjustment', 'Vencido'), ('adjustment', 'Contaminado')
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

-- Áreas o departamentos de A y B (ADR 0015): se eligen en el ingreso y se guardan en el lote.
insert into inventory.areas (workspace_id, item_kind, name)
select w.id, 'reagent', a.name
  from (values ('da000000-0000-4000-8000-00000000000a'::uuid), ('db000000-0000-4000-8000-00000000000b'::uuid)) as w (id)
 cross join (values ('Docencia'), ('Investigación')) as a (name);

-- Una solicitud de salida pendiente del Operador en la Facultad de Ciencias (ADR 0012): aparta 50 g del primer
-- frasco de NaCl hasta que la Administradora la apruebe o la rechace.
update inventory.positions set reserved = 50 where id = 'da800000-0000-4000-8000-000000000001';
insert into inventory.allocations
  (workspace_id, position_id, quantity, reason, destination, requested_by_principal_id, created_at)
values ('da000000-0000-4000-8000-00000000000a', 'da800000-0000-4000-8000-000000000001', 50,
        'Práctica de Análisis Químico', 'Laboratorio de Física', 'da200000-0000-4000-8000-000000000002', now() - interval '2 hours');

-- ---------------------------------------------------------------------------
-- Equipos de A (ADR 0019): doce equipos en tres áreas, con cada condición, un traslado,
-- fallas en cada estado, las solucionadas del último año y su historial. Solo el seed puede fechar en el pasado.
-- ---------------------------------------------------------------------------

insert into equipment.asset_types (id, workspace_id, name) values
  ('da910000-0000-4000-8000-000000000001', 'da000000-0000-4000-8000-00000000000a', 'Centrífuga'),
  ('da910000-0000-4000-8000-000000000002', 'da000000-0000-4000-8000-00000000000a', 'Balanza'),
  ('da910000-0000-4000-8000-000000000003', 'da000000-0000-4000-8000-00000000000a', 'Espectrofotómetro'),
  ('da910000-0000-4000-8000-000000000004', 'da000000-0000-4000-8000-00000000000a', 'Estufa y mufla'),
  ('da910000-0000-4000-8000-000000000005', 'da000000-0000-4000-8000-00000000000a', 'Microscopio'),
  ('da910000-0000-4000-8000-000000000006', 'da000000-0000-4000-8000-00000000000a', 'pH-metro'),
  ('da910000-0000-4000-8000-000000000007', 'da000000-0000-4000-8000-00000000000a', 'Campana de extracción'),
  ('da910000-0000-4000-8000-000000000008', 'da000000-0000-4000-8000-00000000000a', 'Autoclave'),
  ('da910000-0000-4000-8000-000000000009', 'da000000-0000-4000-8000-00000000000a', 'Agitador');

-- Ubicaciones: Química (…03), Física (…04), el almacén (…02) y el mesón 2 del cuarto frío (…07).
-- Responsables: Ana (…01) y Óscar (…02); la estufa, sin responsable. El autoclave ya cumplió su vida útil.
insert into equipment.assets
  (id, workspace_id, type_id, code, name, brand, model, serial_number, power_supply, location_id,
   responsible_principal_id, condition, conservation, supplier, acquired_on, warranty_until,
   useful_life_years, replacement_value, created_by_principal_id, created_at)
select a.id::uuid, 'da000000-0000-4000-8000-00000000000a', ('da910000-0000-4000-8000-00000000000' || a.type)::uuid,
       a.code, a.name, a.brand, a.model, a.serial, a.power, ('da300000-0000-4000-8000-00000000000' || a.loc)::uuid,
       ('da200000-0000-4000-8000-00000000000' || a.resp)::uuid, a.condition, a.conservation, a.supplier,
       a.acquired::date, a.warranty::date, a.life, a.value::numeric, 'da200000-0000-4000-8000-000000000001',
       now() - interval '400 days'
  from (values
    ('da920000-0000-4000-8000-000000000001', 1, 'CEN-01', 'Centrífuga refrigerada', 'Eppendorf', '5810R', '5811AB0042', '220 V', 7, 1, 'operational', 'good', 'Labtech Ecuador', '2021-03-15', '2024-03-15', 10, '9800.00'),
    ('da920000-0000-4000-8000-000000000002', 2, 'BAL-01', 'Balanza analítica', 'Ohaus', 'PX224', 'B-4471', '110 V', 3, 1, 'operational', 'good', 'Científica Andina', '2023-06-01', '2027-06-01', 8, '2500.50'),
    ('da920000-0000-4000-8000-000000000003', 2, 'BAL-02', 'Balanza de precisión', 'Mettler Toledo', 'ML3002', 'MT-20931', '110 V', 4, 1, 'restricted', 'fair', null, '2019-09-10', null, 8, '1850.00'),
    ('da920000-0000-4000-8000-000000000004', 3, 'ESP-01', 'Espectrofotómetro UV-Vis', 'Thermo Scientific', 'Genesys 30', 'GEN30-7712', '110 V', 3, 2, 'faulted', 'fair', 'Labtech Ecuador', '2018-02-20', null, 10, '7200.00'),
    ('da920000-0000-4000-8000-000000000005', 4, 'EST-01', 'Estufa de secado', 'Memmert', 'UN55', 'UN55-3381', '220 V', 3, null, 'operational', 'good', null, '2022-08-05', '2025-08-05', 15, '4100.00'),
    ('da920000-0000-4000-8000-000000000006', 5, 'MIC-01', 'Microscopio óptico', 'Olympus', 'CX23', 'CX23-10021', '110 V', 4, 2, 'operational', 'good', 'Científica Andina', '2024-01-12', '2027-01-12', 10, '1600.00'),
    ('da920000-0000-4000-8000-000000000007', 5, 'MIC-02', 'Microscopio óptico', 'Olympus', 'CX23', 'CX23-10022', '110 V', 4, 2, 'operational', 'fair', 'Científica Andina', '2024-01-12', '2027-01-12', 10, '1600.00'),
    ('da920000-0000-4000-8000-000000000008', 6, 'PHM-01', 'pH-metro de mesa', 'Hanna', 'HI2211', 'HI-55810', '110 V', 3, 2, 'operational', 'good', null, '2023-04-03', null, 6, '650.00'),
    ('da920000-0000-4000-8000-000000000009', 7, 'CAM-01', 'Campana de extracción', 'Esco', 'Frontier Duo', 'EF-4410', '220 V', 3, 1, 'operational', 'good', null, '2020-11-30', null, 15, '12500.00'),
    ('da920000-0000-4000-8000-000000000010', 8, 'AUT-01', 'Autoclave vertical', 'Tuttnauer', '2540EL', 'TT-88213', '220 V', 4, 1, 'operational', 'fair', 'Labtech Ecuador', '2012-05-22', null, 12, '8900.00'),
    ('da920000-0000-4000-8000-000000000011', 9, 'AGI-01', 'Agitador magnético con calefacción', 'IKA', 'C-MAG HS 7', 'IKA-30217', '110 V', 3, 2, 'restricted', 'fair', null, '2021-07-19', null, 7, '780.00'),
    ('da920000-0000-4000-8000-000000000012', 4, 'MUF-01', 'Mufla', 'Thermolyne', 'F48055', 'TH-7702', '220 V', 4, 1, 'retired', 'poor', null, '2012-03-01', null, 15, '5400.00')
  ) as a (id, type, code, name, brand, model, serial, power, loc, resp, condition, conservation, supplier, acquired, warranty, life, value);

-- Fallas (E-01b): el docente reportó la del espectrofotómetro; la del agitador está en atención; la
-- del autoclave se solucionó; y una del microscopio no impide usarlo.
insert into incidents.cases
  (id, workspace_id, module_code, asset_id, fault_type, description, usable, status, reported_by_principal_id, reported_at,
   attended_by_principal_id, attended_at, resolution, resolved_by_principal_id, resolved_at)
values
  ('da930000-0000-4000-8000-000000000001', 'da000000-0000-4000-8000-00000000000a', 'equipment', 'da920000-0000-4000-8000-000000000004',
   'electrical', 'La lámpara de deuterio no enciende al iniciar el equipo', false, 'open', 'da200000-0000-4000-8000-000000000004', now() - interval '3 days',
   null, null, null, null, null),
  ('da930000-0000-4000-8000-000000000002', 'da000000-0000-4000-8000-00000000000a', 'equipment', 'da920000-0000-4000-8000-000000000011',
   'electrical', 'La calefacción no regula la temperatura', true, 'in_progress', 'da200000-0000-4000-8000-000000000002', now() - interval '5 days',
   'da200000-0000-4000-8000-000000000002', now() - interval '4 days', null, null, null),
  ('da930000-0000-4000-8000-000000000003', 'da000000-0000-4000-8000-00000000000a', 'equipment', 'da920000-0000-4000-8000-000000000010',
   'mechanical', 'No alcanza 121 °C en el ciclo de esterilización', false, 'resolved', 'da200000-0000-4000-8000-000000000002', now() - interval '20 days',
   'da200000-0000-4000-8000-000000000001', now() - interval '18 days', 'Cambio de termostato; ciclo de prueba correcto',
   'da200000-0000-4000-8000-000000000001', now() - interval '12 days'),
  ('da930000-0000-4000-8000-000000000004', 'da000000-0000-4000-8000-00000000000a', 'equipment', 'da920000-0000-4000-8000-000000000007',
   'mechanical', 'El tornillo del enfoque fino está duro', true, 'open', 'da200000-0000-4000-8000-000000000004', now() - interval '1 day',
   null, null, null, null, null);

-- Incidentes solucionados del último año, para «Incidentes en 12 meses» del Resumen (ADR 0019): cada uno con
-- cuándo se reportó, cuántos días tardó en empezar la reparación y en solucionarse, y si impidió usar el equipo.
insert into incidents.cases
  (id, workspace_id, module_code, asset_id, fault_type, description, usable, status, reported_by_principal_id, reported_at,
   attended_by_principal_id, attended_at, resolution, resolved_by_principal_id, resolved_at)
select ('da930000-0000-4000-8000-0000000001' || h.n)::uuid, 'da000000-0000-4000-8000-00000000000a', 'equipment',
       ('da920000-0000-4000-8000-0000000000' || h.asset)::uuid, h.type, h.description, h.usable, 'resolved',
       ('da200000-0000-4000-8000-00000000000' || h.reporter)::uuid, now() - (h.ago || ' days')::interval,
       'da200000-0000-4000-8000-000000000002', now() - ((h.ago - 1) || ' days')::interval, h.resolution,
       'da200000-0000-4000-8000-000000000001', now() - ((h.ago - h.took) || ' days')::interval
  from (values
    ('01', '01', 'mechanical', 'Vibra mucho al pasar de 3000 rpm', false, 4, 330, 6, 'Rotor balanceado y rodamiento cambiado'),
    ('02', '02', 'other', 'La pantalla parpadea al tarar', true, 2, 290, 2, 'Cable de la pantalla reajustado'),
    ('03', '06', 'mechanical', 'El revólver de objetivos no queda fijo', true, 4, 250, 1, 'Resorte del revólver ajustado'),
    ('04', '09', 'electrical', 'El extractor no arranca', false, 2, 215, 9, 'Motor del extractor reemplazado'),
    ('05', '05', 'electrical', 'No pasa de 60 °C', false, 4, 180, 4, 'Resistencia y fusible cambiados'),
    ('06', '08', 'spare_part', 'El electrodo responde lento', true, 4, 150, 12, 'Electrodo nuevo instalado y calibrado'),
    ('07', '10', 'mechanical', 'La puerta no sella y pierde presión', false, 2, 120, 5, 'Empaque de la puerta reemplazado'),
    ('08', '01', 'electrical', 'Se apaga a mitad del ciclo', false, 2, 95, 3, 'Tarjeta de control reparada'),
    ('09', '07', 'other', 'El condensador está descentrado', true, 4, 70, 1, 'Condensador centrado y lámpara revisada'),
    ('10', '03', 'spare_part', 'El protector contra corrientes de aire está roto', true, 2, 45, 8, 'Protector nuevo instalado')
  ) as h (n, asset, type, description, usable, reporter, ago, took, resolution);

insert into equipment.condition_changes
  (workspace_id, asset_id, from_condition, to_condition, reason, result, actor_principal_id, occurred_at, case_id)
select 'da000000-0000-4000-8000-00000000000a', ('da920000-0000-4000-8000-0000000000' || c.asset)::uuid, c.from_c, c.to_c,
       c.reason, c.result, ('da200000-0000-4000-8000-00000000000' || c.actor)::uuid, now() - c.ago::interval,
       ('da930000-0000-4000-8000-00000000000' || c.fault)::uuid
  from (values
    ('04', 'operational', 'faulted', 'Falla eléctrica reportada: no se puede usar', null, 4, '3 days', '1'),
    ('03', 'operational', 'restricted', 'Desviación de 0,02 g en la verificación con pesa patrón: usar solo para pesadas gruesas', null, 1, '10 days', null),
    ('10', 'operational', 'faulted', 'Falla mecánica reportada: no se puede usar', null, 2, '20 days', '3'),
    ('10', 'faulted', 'operational', 'Falla resuelta', 'Cambio de termostato; ciclo de prueba correcto', 1, '12 days', '3'),
    ('11', 'operational', 'restricted', 'La calefacción no regula: usar solo para agitar', null, 2, '5 days', null),
    ('12', 'operational', 'faulted', 'La resistencia se quemó', null, 2, '60 days', null),
    ('12', 'faulted', 'retired', 'Resistencia irreparable; el repuesto ya no se fabrica', null, 1, '30 days', null)
  ) as c (asset, from_c, to_c, reason, result, actor, ago, fault);

-- Los incidentes del último año que impidieron usar el equipo lo dejaron fuera de servicio hasta solucionarse.
insert into equipment.condition_changes
  (workspace_id, asset_id, from_condition, to_condition, reason, result, actor_principal_id, occurred_at, case_id)
select c.workspace_id, c.asset_id, s.from_c, s.to_c, s.reason, case when s.to_c = 'operational' then c.resolution end,
       case when s.to_c = 'faulted' then c.reported_by_principal_id else c.resolved_by_principal_id end,
       case when s.to_c = 'faulted' then c.reported_at else c.resolved_at end, c.id
  from incidents.cases as c
 cross join (values ('operational', 'faulted', 'Falla reportada: no se puede usar'), ('faulted', 'operational', 'Falla resuelta'))
       as s (from_c, to_c, reason)
 where c.workspace_id = 'da000000-0000-4000-8000-00000000000a' and c.id::text like 'da930000-0000-4000-8000-0000000001%'
   and not c.usable;

-- El segundo microscopio pasó de bueno a regular al revisar su ficha (E-01c: el estado físico deja historial).
insert into equipment.conservation_changes (workspace_id, asset_id, from_conservation, to_conservation, actor_principal_id, occurred_at)
values ('da000000-0000-4000-8000-00000000000a', 'da920000-0000-4000-8000-000000000007', 'good', 'fair',
        'da200000-0000-4000-8000-000000000002', now() - interval '20 days');

-- Encargados de área (E-01c): Óscar en Química y Ana en el cuarto frío; Física queda sin encargado.
update core.locations set manager_principal_id = 'da200000-0000-4000-8000-000000000002'
 where id = 'da300000-0000-4000-8000-000000000003';
update core.locations set manager_principal_id = 'da200000-0000-4000-8000-000000000001'
 where id = 'da300000-0000-4000-8000-000000000005';

-- El pH-metro pasó de Física a Química para las prácticas de titulación.
insert into equipment.location_changes
  (workspace_id, asset_id, from_location_id, to_location_id, note, actor_principal_id, occurred_at)
values ('da000000-0000-4000-8000-00000000000a', 'da920000-0000-4000-8000-000000000008',
        'da300000-0000-4000-8000-000000000004', 'da300000-0000-4000-8000-000000000003',
        'Para las prácticas de titulación', 'da200000-0000-4000-8000-000000000002', now() - interval '7 days');

commit;
