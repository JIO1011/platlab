-- R-01A, entrega 4 (ADR 0012, cambio del 05-10-2026): traslado de un frasco en un paso.
--
-- Una operación `transfer` mueve el frasco entero: un asiento lo vacía en la posición de origen y
-- otro lo llena en la de destino, en la misma transacción. La base ya exige que un frasco tenga saldo
-- en una sola posición (positions_container_stocked), así que el origen se vacía antes de llenar el
-- destino. Sin tablas de traslado: no hay borrador, aprobación ni tránsito.

alter table inventory.operations drop constraint operations_type_check;
alter table inventory.operations
  add constraint operations_type_check check (type in ('receipt', 'issue', 'adjustment', 'transfer'));

-- La posición de destino puede nacer en el traslado (saldo cero, la llena el asiento); el runtime ya
-- inserta posiciones con saldo cero (r00_inventory).

-- ---------------------------------------------------------------------------
-- Permiso de traslado (manifiesto de Reactivos): Operador y Administrador; el Propietario lo hereda
-- ---------------------------------------------------------------------------

insert into core.permissions (code, module_code) values ('reagents.transfer.create', 'reagents');
insert into core.role_permissions (role_code, permission_code) values
  ('admin', 'reagents.transfer.create'),
  ('operator', 'reagents.transfer.create');
