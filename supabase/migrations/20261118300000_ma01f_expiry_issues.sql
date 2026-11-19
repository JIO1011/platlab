-- MA-01f (ADR 0025, 18-11-2026): vencimiento por lote para los insumos que vencen y salida con tipo y solicitante,
-- a partir de la planilla del cliente. Reutiliza los lotes de la capacidad inventario (fecha y lote del proveedor);
-- Materiales solo guarda si el insumo vence y el detalle de cada salida.

-- ---------------------------------------------------------------------------
-- El insumo dice si vence
-- ---------------------------------------------------------------------------

-- Si vence, cada ingreso pide su fecha y puede llevar el lote del proveedor; si no, sigue el lote único sin fecha.
-- Solo un consumible vence: lo reutilizable se presta y vuelve.
alter table materials.products
  add column tracks_expiry boolean not null default false,
  add constraint products_expiry_consumable check (class = 'consumable' or not tracks_expiry);

create policy products_update on materials.products for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

-- La clase sigue sin editarse: el runtime solo cambia si el insumo vence.
grant update (tracks_expiry) on materials.products to platlab_api;

-- ---------------------------------------------------------------------------
-- Lote del proveedor, único por ítem
-- ---------------------------------------------------------------------------

-- El mismo lote del proveedor no se registra dos veces para un ítem (sin distinguir mayúsculas): un segundo ingreso
-- suma al mismo lote. Hasta hoy ningún lote lo usa (todos nulos), así que el índice no choca con lo existente.
create unique index lots_supplier_lot on inventory.lots (workspace_id, item_id, lower(supplier_lot))
  where supplier_lot is not null;

-- ---------------------------------------------------------------------------
-- Detalle de cada salida: tipo y solicitante
-- ---------------------------------------------------------------------------

create table materials.issue_details (
  workspace_id uuid not null,
  -- La salida del libro (inventory.operations de tipo `issue`): una fila por salida, inmutable.
  operation_id uuid not null,
  -- Práctica, Clínica o General, como separa la planilla del cliente. El periodo sale de la fecha de la salida.
  purpose text not null check (purpose in ('practice', 'clinic', 'general')),
  -- Quien la pidió: un miembro del espacio; nulo si no se indicó.
  requester_principal_id uuid,
  created_at timestamptz not null default now(),
  primary key (operation_id),
  unique (workspace_id, operation_id),
  foreign key (workspace_id, operation_id) references inventory.operations (workspace_id, id),
  foreign key (workspace_id, requester_principal_id) references core.principals (workspace_id, id)
);

create index issue_details_requester on materials.issue_details (workspace_id, requester_principal_id)
  where requester_principal_id is not null;

alter table materials.issue_details enable row level security;

create policy issue_details_select on materials.issue_details for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy issue_details_insert on materials.issue_details for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()));

-- Nadie cambia ni borra el detalle de una salida confirmada: se corrige con otro movimiento.
grant select, insert on materials.issue_details to platlab_api;
