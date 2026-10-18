-- M-01b (ADR 0020): el correctivo, ligado al incidente que atiende, y la corrección por anulación. Un
-- registro sigue sin editarse: solo se anula una vez, con motivo, y la corrección es un registro nuevo.

-- ---------------------------------------------------------------------------
-- Correctivo: un tipo de trabajo sin plan que dice qué se hizo; puede atender un incidente del equipo
-- (la API comprueba, con el incidente bloqueado, que sea del mismo equipo)
-- ---------------------------------------------------------------------------

alter table maintenance.records drop constraint records_kind_check;
alter table maintenance.records
  add constraint records_kind_check
    check (kind in ('preventive', 'calibration', 'verification', 'cleaning', 'corrective')),
  add column fault_id uuid,
  add foreign key (workspace_id, fault_id) references incidents.cases (workspace_id, id),
  -- «Qué se hizo» es el resultado con que se soluciona el incidente.
  add constraint records_corrective check (kind <> 'corrective' or (plan_id is null and observations is not null)),
  add constraint records_fault check (fault_id is null or kind = 'corrective');

create index records_fault on maintenance.records (workspace_id, fault_id) where fault_id is not null;

-- ---------------------------------------------------------------------------
-- Anulación: motivo, quién y cuándo, una sola vez. La corrección apunta al anulado, del mismo equipo, y
-- cada registro se corrige como mucho una vez.
-- ---------------------------------------------------------------------------

alter table maintenance.records
  add column voided_at timestamptz,
  add column voided_by_principal_id uuid,
  add column void_reason text check (length(btrim(void_reason)) between 1 and 500),
  add column corrects_record_id uuid,
  add unique (workspace_id, id, asset_id),
  add foreign key (workspace_id, voided_by_principal_id) references core.principals (workspace_id, id),
  add foreign key (workspace_id, corrects_record_id, asset_id) references maintenance.records (workspace_id, id, asset_id),
  add unique (workspace_id, corrects_record_id),
  add constraint records_voided check (
    (voided_at is null) = (voided_by_principal_id is null) and (voided_at is null) = (void_reason is null)
  ),
  add constraint records_corrects_other check (corrects_record_id <> id);

-- El último registro vigente de un plan para un equipo sale del índice (próxima fecha).
drop index maintenance.records_last;
create index records_last on maintenance.records (workspace_id, plan_id, asset_id, performed_on desc, recorded_at desc)
  where plan_id is not null and voided_at is null;

-- Anular es lo único que cambia de un registro, y solo mientras no esté anulado: un anulado no es visible
-- para la actualización.
create policy records_void on maintenance.records for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()) and voided_at is null)
  with check (
    workspace_id = (select core.current_workspace_id())
    and voided_by_principal_id = (select core.current_principal_id())
  );

grant insert (fault_id, corrects_record_id) on maintenance.records to platlab_api;
grant update (voided_at, voided_by_principal_id, void_reason) on maintenance.records to platlab_api;

-- ---------------------------------------------------------------------------
-- La corrección lleva el certificado del anulado: una fila nueva que apunta al mismo archivo, que nunca
-- se borra ni se sobrescribe. Un archivo propio sigue con la ruta fija por su id.
-- ---------------------------------------------------------------------------

alter table maintenance.record_certificates
  drop constraint record_certificates_object_path_key,
  drop constraint record_certificates_object_path,
  add column carried_from_id uuid,
  add foreign key (workspace_id, carried_from_id) references maintenance.record_certificates (workspace_id, id),
  add constraint record_certificates_object_path check (
    starts_with(object_path, workspace_id::text || '/maintenance/certificates/')
    and (carried_from_id is not null or object_path = workspace_id::text || '/maintenance/certificates/' || id::text || '.pdf')
  );

create unique index record_certificates_own_object on maintenance.record_certificates (object_path)
  where carried_from_id is null;

grant insert (carried_from_id) on maintenance.record_certificates to platlab_api;

-- ---------------------------------------------------------------------------
-- La próxima fecha cuenta solo los registros vigentes: anular devuelve la fecha anterior
-- ---------------------------------------------------------------------------

create or replace view maintenance.plan_assets with (security_invoker = true) as
  select p.workspace_id,
         p.id as plan_id,
         a.id as asset_id,
         last.id as last_record_id,
         last.performed_on as last_performed_on,
         last.result as last_result,
         coalesce(
           last.valid_until,
           (last.performed_on + case p.interval_unit
              when 'day' then make_interval(days => p.interval_count)
              when 'week' then make_interval(weeks => p.interval_count)
              when 'month' then make_interval(months => p.interval_count)
              else make_interval(years => p.interval_count)
            end)::date,
           greatest(p.starts_on, (a.created_at at time zone w.time_zone)::date)
         ) as due_on
    from maintenance.plans as p
    join core.workspaces as w on w.id = p.workspace_id
    join equipment.asset_directory as a
      on a.workspace_id = p.workspace_id and (a.id = p.asset_id or a.type_id = p.asset_type_id)
    left join lateral (
      select r.id, r.performed_on, r.valid_until, r.result
        from maintenance.records as r
       where r.workspace_id = p.workspace_id and r.plan_id = p.id and r.asset_id = a.id
         and r.voided_at is null
       order by r.performed_on desc, r.recorded_at desc
       limit 1
    ) as last on true
   where p.archived_at is null
     and a.condition <> 'retired'
     and not exists (
       select 1 from maintenance.plan_exclusions as x
        where x.workspace_id = p.workspace_id and x.plan_id = p.id and x.asset_id = a.id
          and x.archived_at is null
     );

-- ---------------------------------------------------------------------------
-- Permiso del manifiesto (02 §4): anular y corregir es del Administrador (decidido por el usuario); el
-- Propietario hereda por core.effective_role_assignments
-- ---------------------------------------------------------------------------

insert into core.permissions (code, module_code) values ('maintenance.record.void', 'maintenance');
insert into core.role_permissions (role_code, permission_code) values ('admin', 'maintenance.record.void');
