-- MA-01a (ADR 0025): módulo Materiales. Su esquema guarda la clase de cada material 1:1 del ítem; las
-- existencias viven en la capacidad inventario (`kind = 'material'`), sin envases y con un lote único
-- por material. Los préstamos llegan con MA-01b. Etapa `development` hasta su G0.

insert into core.module_definitions (code, name, stage) values ('materials', 'Materiales', 'development');

create schema materials;
revoke all on schema materials from public;
grant usage on schema materials to platlab_api;

create table materials.products (
  workspace_id uuid not null,
  item_id uuid not null,
  -- Fija el tipo: solo un ítem material tiene clase (03 §4, «Tipos»); un ítem no es reactivo y material.
  item_kind text not null default 'material' check (item_kind = 'material'),
  -- Consumible (se gasta), reutilizable por cantidad (se presta y se devuelve) o reutilizable
  -- identificado (una unidad con código). La clase no cambia: define cómo se mueve (ADR 0025).
  class text not null check (class in ('consumable', 'reusable_counted', 'reusable_identified')),
  created_at timestamptz not null default now(),
  primary key (item_id),
  unique (workspace_id, item_id),
  foreign key (workspace_id, item_id, item_kind) references inventory.items (workspace_id, id, kind)
);

alter table materials.products enable row level security;

create policy products_select on materials.products for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy products_insert on materials.products for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()));

-- La clase no se edita: sin UPDATE ni DELETE.
grant select, insert on materials.products to platlab_api;

-- Permisos del manifiesto (02 §4); catalog.int.test.ts verifica que coincidan.
insert into core.permissions (code, module_code) values
  ('materials.catalog.read', 'materials'),
  ('materials.catalog.manage', 'materials'),
  ('materials.receipt.create', 'materials'),
  ('materials.issue.create', 'materials'),
  ('materials.adjustment.create', 'materials');

-- Matriz de 01 §5: el Operador registra ingresos y salidas; catálogo y ajustes son del Administrador.
-- El Propietario los hereda por core.effective_role_assignments (ADR 0008).
insert into core.role_permissions (role_code, permission_code) values
  ('admin', 'materials.catalog.read'),
  ('admin', 'materials.catalog.manage'),
  ('admin', 'materials.receipt.create'),
  ('admin', 'materials.issue.create'),
  ('admin', 'materials.adjustment.create'),
  ('operator', 'materials.catalog.read'),
  ('operator', 'materials.receipt.create'),
  ('operator', 'materials.issue.create');
