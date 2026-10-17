-- E-01e (ADR 0019): documentos del equipo. PDF públicos que la API sube a Storage con las reglas de la
-- ficha de seguridad (ADR 0017): cada archivo es una fila que nunca se borra ni se sobrescribe. Quitar
-- un documento lo archiva: deja de verse y su archivo se conserva.

create table equipment.asset_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  asset_id uuid not null,
  kind text not null check (kind in ('manual', 'invoice', 'warranty', 'service_report', 'delivery_record')),
  title text not null check (length(btrim(title)) between 1 and 120),
  -- Ruta dentro del bucket, fija por el espacio y el id: nadie apunta a un archivo de otro espacio.
  object_path text not null unique,
  -- Enlace público permanente; se guarda para leerlo sin la configuración de Storage.
  url text not null check (url ~ '^https?://' and length(url) <= 2000),
  -- Hasta 20 MiB, el límite general de archivos (02 §12).
  byte_size integer not null check (byte_size between 1 and 20971520),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_by_principal_id uuid not null,
  uploaded_at timestamptz not null default now(),
  archived_by_principal_id uuid,
  archived_at timestamptz,
  unique (workspace_id, id),
  foreign key (workspace_id, asset_id) references equipment.assets (workspace_id, id),
  foreign key (workspace_id, uploaded_by_principal_id) references core.principals (workspace_id, id),
  foreign key (workspace_id, archived_by_principal_id) references core.principals (workspace_id, id),
  constraint asset_documents_object_path check (
    object_path = workspace_id::text || '/equipment/documents/' || id::text || '.pdf'
  ),
  -- Archivar deja quién y cuándo, juntos.
  constraint asset_documents_archived check ((archived_at is null) = (archived_by_principal_id is null))
);

-- La pestaña Documentos y la garantía del incidente leen los vigentes de un equipo, del más reciente al más antiguo.
create index asset_documents_current on equipment.asset_documents (workspace_id, asset_id, uploaded_at desc)
  where archived_at is null;

-- Archivar es el único cambio, y una sola vez: el documento archivado ya no se toca.
create function equipment.protect_document() returns trigger
  language plpgsql set search_path = ''
  as $$
begin
  if old.archived_at is not null then
    raise exception 'Un documento archivado no se modifica' using errcode = 'check_violation';
  end if;
  if to_jsonb(new) - 'archived_at' - 'archived_by_principal_id' <> to_jsonb(old) - 'archived_at' - 'archived_by_principal_id' then
    raise exception 'De un documento solo se archiva' using errcode = 'check_violation';
  end if;
  return new;
end
$$;

revoke execute on function equipment.protect_document() from public;

create trigger asset_documents_protect before update on equipment.asset_documents
  for each row execute function equipment.protect_document();

-- ---------------------------------------------------------------------------
-- RLS y grants: el runtime lee y escribe solo en el espacio de su contexto, y la autoría es suya
-- ---------------------------------------------------------------------------

alter table equipment.asset_documents enable row level security;

create policy asset_documents_select on equipment.asset_documents for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy asset_documents_insert on equipment.asset_documents for insert to platlab_api
  with check (
    workspace_id = (select core.current_workspace_id())
    and uploaded_by_principal_id = (select core.current_principal_id())
  );
create policy asset_documents_update on equipment.asset_documents for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (
    workspace_id = (select core.current_workspace_id())
    and archived_by_principal_id = (select core.current_principal_id())
  );

grant select on equipment.asset_documents to platlab_api;
-- Un documento nace vigente: el alta no escribe la fecha ni el archivo.
grant insert (
  id, workspace_id, asset_id, kind, title, object_path, url, byte_size, sha256, uploaded_by_principal_id
) on equipment.asset_documents to platlab_api;
-- Archivar es lo único que se cambia; sin DELETE.
grant update (archived_by_principal_id, archived_at) on equipment.asset_documents to platlab_api;
