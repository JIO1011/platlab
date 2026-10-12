-- R-01A, entrega 3 (ADR 0012, cambio del 05-10-2026): mínimo por reactivo y lote sin estado propio.
--
-- El mínimo es un número opcional del ítem, para todo el espacio y en su unidad base. El lote queda
-- solo como dato (código, proveedor y caducidad): cada frasco se gestiona por separado y se desecha
-- con un ajuste a cero con motivo. Sale la condición del lote de R-00, que nadie podía cambiar.

-- ---------------------------------------------------------------------------
-- Mínimo por ítem
-- ---------------------------------------------------------------------------

alter table inventory.items
  add column minimum_quantity numeric(24, 9) check (minimum_quantity > 0);

create policy items_update on inventory.items for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

grant update (minimum_quantity, version) on inventory.items to platlab_api;

-- ---------------------------------------------------------------------------
-- Lote sin estado propio
-- ---------------------------------------------------------------------------

alter table inventory.lots drop column condition;
