-- MA-01d (ADR 0025): exportar el libro de Materiales es un reporte (01 §5), como maintenance.report.export: del
-- Administrador. Ver el libro e imprimirlo solo pide materials.catalog.read.
insert into core.permissions (code, module_code) values ('materials.report.export', 'materials');
insert into core.role_permissions (role_code, permission_code) values ('admin', 'materials.report.export');
