-- MA-01g (ADR 0025, 18-11-2026): unidades de conteo de Materiales. Un insumo se cuenta en la unidad con que se entrega
-- (caja, rollo, par…); no hay conversión entre ellas: cada movimiento va en la unidad base del material. El metro abre
-- la dimensión de longitud (alambre de ortodoncia en la planilla del cliente). Reactivos sigue con su propia lista.

alter table inventory.units drop constraint units_dimension_check;
alter table inventory.units add constraint units_dimension_check check (dimension in ('mass', 'volume', 'count', 'length'));

insert into inventory.units (code, dimension, name) values
  ('par', 'count', 'par'),
  ('caja', 'count', 'caja'),
  ('bolsa', 'count', 'bolsa'),
  ('paquete', 'count', 'paquete'),
  ('rollo', 'count', 'rollo'),
  ('frasco', 'count', 'frasco'),
  ('tubo', 'count', 'tubo'),
  ('sobre', 'count', 'sobre'),
  ('kit', 'count', 'kit'),
  ('m', 'length', 'metro');
