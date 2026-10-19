-- M-01d (ADR 0020): el Excel del Historial es un reporte (01 §5), del Administrador, como el Informe de
-- Equipos. Filtros, «Imprimir», línea de tiempo y estado de calibración se calculan al consultar y no
-- cambian el esquema.

-- Permiso del manifiesto (02 §4); el Propietario hereda por core.effective_role_assignments.
insert into core.permissions (code, module_code) values ('maintenance.report.export', 'maintenance');
insert into core.role_permissions (role_code, permission_code) values ('admin', 'maintenance.report.export');
