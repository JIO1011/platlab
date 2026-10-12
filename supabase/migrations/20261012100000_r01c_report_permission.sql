-- R-01C (ADR 0014): Movimientos como informe. Los totales y la exportación son «reportes» (01 §5):
-- permiso del Administrador, que el Propietario hereda por core.effective_role_assignments
-- (ADR 0008). El Operador consulta el detalle y sus filtros con `reagents.catalog.read`.
--
-- Sin tablas nuevas: los totales y los conteos por filtro se calculan sobre el libro existente.

insert into core.permissions (code, module_code) values ('reagents.report.read', 'reagents');
insert into core.role_permissions (role_code, permission_code) values ('admin', 'reagents.report.read');
