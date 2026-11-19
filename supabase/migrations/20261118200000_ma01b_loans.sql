-- MA-01b (ADR 0025): préstamos de material. El vale (`loans`) y sus líneas (`loan_lines`) guardan quién se
-- llevó qué y cuánto falta devolver; `return_lines` es el historial inmutable de devoluciones. Lo prestado sigue
-- en el saldo de su posición (existencia institucional, 03 §4) pero no está disponible: se aparta en
-- `inventory.positions.reserved`, así que la base impide sacar de más. Un daño o una pérdida dan de baja con un
-- ajuste del libro. Nada se borra: un préstamo se cierra al devolverse todo.

insert into core.permissions (code, module_code) values
  ('materials.loan.create', 'materials'),
  ('materials.loan.return', 'materials');

-- Matriz de 01 §5: «ingresos, salidas, entregas y devoluciones» son del Operador y el Administrador.
insert into core.role_permissions (role_code, permission_code) values
  ('admin', 'materials.loan.create'),
  ('admin', 'materials.loan.return'),
  ('operator', 'materials.loan.create'),
  ('operator', 'materials.loan.return');

-- ---------------------------------------------------------------------------
-- Vale de préstamo
-- ---------------------------------------------------------------------------

create table materials.loans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references core.workspaces (id),
  -- Número correlativo por espacio, asignado bajo bloqueo (P-0001…).
  number integer not null check (number > 0),
  -- Quien se lleva el material: un miembro del espacio (por defecto, ADR 0025).
  borrower_principal_id uuid not null,
  lent_by_principal_id uuid not null,
  lent_at timestamptz not null default now(),
  -- Fecha civil de devolución prevista; nula si no hay plazo.
  due_on date,
  notes text check (length(btrim(notes)) between 1 and 500),
  status text not null default 'open' check (status in ('open', 'closed')),
  closed_at timestamptz,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, number),
  foreign key (workspace_id, borrower_principal_id) references core.principals (workspace_id, id),
  foreign key (workspace_id, lent_by_principal_id) references core.principals (workspace_id, id),
  constraint loans_closed_at check ((status = 'closed') = (closed_at is not null))
);

create index loans_open on materials.loans (workspace_id, lent_at desc, id) where status = 'open';
create index loans_borrower on materials.loans (workspace_id, borrower_principal_id, lent_at desc);

create trigger loans_touch before update on materials.loans
  for each row execute function core.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Líneas: cuánto se prestó de una posición y cómo volvió
-- ---------------------------------------------------------------------------

create table materials.loan_lines (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  loan_id uuid not null,
  line integer not null check (line > 0),
  -- De dónde salió: la posición del material; lo prestado queda apartado en ella.
  position_id uuid not null,
  quantity numeric(24, 9) not null check (quantity > 0),
  returned numeric(24, 9) not null default 0 check (returned >= 0),
  damaged numeric(24, 9) not null default 0 check (damaged >= 0),
  lost numeric(24, 9) not null default 0 check (lost >= 0),
  unique (workspace_id, id),
  unique (workspace_id, loan_id, line),
  foreign key (workspace_id, loan_id) references materials.loans (workspace_id, id),
  foreign key (workspace_id, position_id) references inventory.positions (workspace_id, id),
  -- Lo devuelto, dañado y perdido nunca supera lo prestado; lo que falta es la resta.
  constraint loan_lines_resolved_within_quantity check (returned + damaged + lost <= quantity)
);

create index loan_lines_position on materials.loan_lines (workspace_id, position_id);

-- ---------------------------------------------------------------------------
-- Devoluciones: historial inmutable
-- ---------------------------------------------------------------------------

create table materials.return_lines (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  loan_line_id uuid not null,
  outcome text not null check (outcome in ('good', 'damaged', 'lost')),
  quantity numeric(24, 9) not null check (quantity > 0),
  note text check (length(btrim(note)) between 1 and 500),
  returned_by_principal_id uuid not null,
  returned_at timestamptz not null default now(),
  -- La baja del libro cuando volvió dañado o perdido; nula si volvió bien.
  operation_id uuid,
  unique (workspace_id, id),
  foreign key (workspace_id, loan_line_id) references materials.loan_lines (workspace_id, id),
  foreign key (workspace_id, returned_by_principal_id) references core.principals (workspace_id, id),
  foreign key (workspace_id, operation_id) references inventory.operations (workspace_id, id),
  constraint return_lines_write_off check ((outcome = 'good') = (operation_id is null))
);

create index return_lines_line on materials.return_lines (workspace_id, loan_line_id, returned_at);

-- ---------------------------------------------------------------------------
-- RLS y grants: el runtime crea vales y líneas, solo cambia lo que avanza una devolución y no borra
-- ---------------------------------------------------------------------------

alter table materials.loans enable row level security;
alter table materials.loan_lines enable row level security;
alter table materials.return_lines enable row level security;

create policy loans_select on materials.loans for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy loans_insert on materials.loans for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id())
              and lent_by_principal_id = (select core.current_principal_id()));
create policy loans_update on materials.loans for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

create policy loan_lines_select on materials.loan_lines for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy loan_lines_insert on materials.loan_lines for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id()));
create policy loan_lines_update on materials.loan_lines for update to platlab_api
  using (workspace_id = (select core.current_workspace_id()))
  with check (workspace_id = (select core.current_workspace_id()));

create policy return_lines_select on materials.return_lines for select to platlab_api
  using (workspace_id = (select core.current_workspace_id()));
create policy return_lines_insert on materials.return_lines for insert to platlab_api
  with check (workspace_id = (select core.current_workspace_id())
              and returned_by_principal_id = (select core.current_principal_id()));

grant select, insert on materials.loans, materials.loan_lines, materials.return_lines to platlab_api;
grant update (status, closed_at, version) on materials.loans to platlab_api;
grant update (returned, damaged, lost) on materials.loan_lines to platlab_api;
