-- Materiales con dos clases (ADR 0025, 19-11-2026): se quita «reutilizable identificado» antes de usarse. Lo que se
-- sigue unidad por unidad es un activo de Equipos y se presta en el mismo vale. Ningún material tiene esa clase: si
-- alguno la tuviera, la restricción nueva no se valida y la migración falla en vez de reclasificarlo a ciegas.
alter table materials.products drop constraint products_class_check;
alter table materials.products
  add constraint products_class_check check (class in ('consumable', 'reusable_counted'));
