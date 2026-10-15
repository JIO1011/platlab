-- ADR 0008 y 0016: los roles valen para todo el espacio. La ubicación es un dato del registro, no
-- un límite de acceso, y el producto nunca asignó un ámbito, así que se retira la columna
-- `location_id` de las asignaciones. La vista depende de la columna: se elimina y se recrea igual,
-- sin ella.

-- Una asignación con ámbito pasaría a valer en todo el espacio: si existiera, se detiene aquí.
do $$
begin
  if exists (select 1 from core.role_assignments where location_id is not null) then
    raise exception 'Hay asignaciones de rol con ámbito: revísalas antes de retirar location_id';
  end if;
end
$$;

drop view core.effective_role_assignments;

drop index core.role_assignments_open;

alter table core.role_assignments drop column location_id;

-- Una sola asignación abierta por principal y rol.
create unique index role_assignments_open
  on core.role_assignments (workspace_id, principal_id, role_code)
  where revoked_at is null;

-- Misma definición que en 20261002100100_owner_admin_permissions.sql, sin el ámbito.
create view core.effective_role_assignments with (security_invoker = true) as
select ra.workspace_id, ra.principal_id, ra.role_code,
       ra.valid_from, ra.valid_until, ra.revoked_at
  from core.role_assignments as ra
union all
select w.id, p.id, 'admin', '-infinity'::timestamptz, null::timestamptz, null::timestamptz
  from core.workspaces as w
  join core.principals as p on p.workspace_id = w.id and p.membership_id = w.owner_membership_id;

comment on view core.effective_role_assignments is
  'Asignaciones de rol efectivas: las explícitas más el rol admin implícito del propietario (ADR 0008).';

grant select on core.effective_role_assignments to platlab_api;
