-- R-01B, entrega 1 (ADR 0017): la ficha de seguridad puede ser un PDF que la API sube a un bucket
-- público de Storage. Cada archivo es una fila que nunca se borra ni se sobrescribe: el reactivo
-- apunta a la vigente y las anteriores quedan para la trazabilidad. Hay una sola ficha vigente,
-- enlace o PDF.

create table reagents.safety_sheets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  product_id uuid not null,
  -- Ruta dentro del bucket, fija por el espacio y el id: nadie apunta a un archivo de otro espacio.
  object_path text not null unique,
  -- Enlace público permanente; se guarda para leerlo sin la configuración de Storage.
  url text not null check (url ~ '^https?://' and length(url) <= 2000),
  byte_size integer not null check (byte_size between 1 and 6291456),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_by_principal_id uuid not null,
  uploaded_at timestamptz not null default now(),
  unique (workspace_id, id),
  -- El puntero del reactivo exige que la ficha sea suya.
  unique (workspace_id, product_id, id),
  foreign key (workspace_id, product_id) references reagents.products (workspace_id, item_id),
  foreign key (workspace_id, uploaded_by_principal_id) references core.principals (workspace_id, id),
  constraint safety_sheets_object_path check (object_path = workspace_id::text || '/sds/' || id::text || '.pdf')
);

alter table reagents.safety_sheets enable row level security;

create policy safety_sheets_select on reagents.safety_sheets for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy safety_sheets_insert on reagents.safety_sheets for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()));

-- Sin UPDATE ni DELETE: una ficha nueva es otra fila.
grant select, insert on reagents.safety_sheets to platlab_api;

alter table reagents.products
  add column sds_sheet_id uuid,
  add constraint products_sds_sheet_fk
    foreign key (workspace_id, item_id, sds_sheet_id) references reagents.safety_sheets (workspace_id, product_id, id),
  -- Una sola ficha vigente: el PDF solo con ficha digital y nunca junto a un enlace.
  add constraint products_sds_sheet_digital check (sds_sheet_id is null or (sds_kind = 'digital' and sds_url is null));

grant update (sds_sheet_id) on reagents.products to platlab_api;
