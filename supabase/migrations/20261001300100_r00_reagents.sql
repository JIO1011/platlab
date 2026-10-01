-- R-00: módulo Reactivos (docs/03_datos.md §4, primer incremento). Su esquema guarda el detalle
-- químico 1:1 del ítem; las existencias viven en la capacidad inventario.

create schema reagents;
revoke all on schema reagents from public;
grant usage on schema reagents to platlab_api;

create table reagents.products (
  workspace_id uuid not null,
  item_id uuid not null,
  -- Fija el tipo: solo un ítem reactivo tiene detalle químico (03 §4, «Tipos»).
  item_kind text not null default 'reagent' check (item_kind = 'reagent'),
  -- CAS opcional y nunca clave (03 §1).
  cas_number text check (cas_number ~ '^[0-9]{2,7}-[0-9]{2}-[0-9]$'),
  physical_state text check (physical_state in ('solid', 'liquid', 'gas')),
  created_at timestamptz not null default now(),
  primary key (item_id),
  unique (workspace_id, item_id),
  foreign key (workspace_id, item_id, item_kind) references inventory.items (workspace_id, id, kind)
);

alter table reagents.products enable row level security;

create policy products_select on reagents.products for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy products_insert on reagents.products for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()));

grant select, insert on reagents.products to platlab_api;

-- Permisos del manifiesto (02 §4); catalog.int.test.ts verifica que coincidan.
insert into core.permissions (code, module_code) values
  ('reagents.catalog.manage', 'reagents'),
  ('reagents.receipt.create', 'reagents'),
  ('reagents.issue.create', 'reagents'),
  ('reagents.adjustment.create', 'reagents');

-- Matriz de 01 §5: el Operador registra ingresos y salidas; catálogo y ajustes son del Administrador.
insert into core.role_permissions (role_code, permission_code) values
  ('admin', 'reagents.catalog.manage'),
  ('admin', 'reagents.receipt.create'),
  ('admin', 'reagents.issue.create'),
  ('admin', 'reagents.adjustment.create'),
  ('operator', 'reagents.receipt.create'),
  ('operator', 'reagents.issue.create');
