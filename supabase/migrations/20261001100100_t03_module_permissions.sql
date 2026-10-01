-- T-03: permisos de los manifiestos de packages/modules en el catálogo fijo (02 §4 y §6).
-- catalog.int.test.ts verifica que coincidan: cambiar un manifiesto exige una migración nueva.

insert into core.permissions (code, module_code) values
  ('reagents.catalog.read', 'reagents');

insert into core.role_permissions (role_code, permission_code) values
  ('admin', 'reagents.catalog.read'),
  ('operator', 'reagents.catalog.read');
