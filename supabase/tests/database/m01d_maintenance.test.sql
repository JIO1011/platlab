-- M-01d (ADR 0020): el Excel del Historial es un reporte del Administrador (01 §5).
begin;
create extension if not exists pgtap with schema extensions;

select plan(1);

select is(
  (select array_agg(role_code::text order by role_code) from core.role_permissions
    where permission_code = 'maintenance.report.export'),
  array['admin'], 'el Excel del Historial es solo del Administrador');

select * from finish();
rollback;
