-- ADR 0008, cambio del 02-10-2026: el propietario tiene en todo el espacio los permisos del
-- Administrador (y por tanto los del Operador) sin asignación. Los permisos efectivos se leen de
-- esta vista, su única fuente: las asignaciones de rol más una implícita del rol `admin`, con
-- ámbito de todo el espacio, para la membresía propietaria. Transferir la propiedad la mueve y no
-- se puede retirar mientras se es propietario. El rol de fiscalizados nunca es implícito.
--
-- security_invoker: la vista aplica las políticas RLS de quien consulta, así que el runtime solo
-- ve las filas del espacio de su contexto. La admisión ya bloqueó el espacio con FOR SHARE, de
-- modo que un traspaso de propiedad espera a que termine la operación en curso (02 §6).

create view core.effective_role_assignments with (security_invoker = true) as
select ra.workspace_id, ra.principal_id, ra.role_code, ra.location_id,
       ra.valid_from, ra.valid_until, ra.revoked_at
  from core.role_assignments as ra
union all
select w.id, p.id, 'admin', null::uuid, '-infinity'::timestamptz, null::timestamptz, null::timestamptz
  from core.workspaces as w
  join core.principals as p on p.workspace_id = w.id and p.membership_id = w.owner_membership_id;

comment on view core.effective_role_assignments is
  'Asignaciones de rol efectivas: las explícitas más el rol admin implícito del propietario (ADR 0008).';

grant select on core.effective_role_assignments to platlab_api;
