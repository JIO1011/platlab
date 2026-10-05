-- ADR 0011, cambio del 05-10-2026: el menú de espacios distingue la institución cuando los
-- espacios de una persona son de instituciones distintas. El nombre visible vive en el espacio,
-- y lo fija el Equipo PlatLab: el runtime sigue sin leer platform.customer_accounts, y el nombre
-- jurídico del titular no se muestra a los miembros. El grant de SELECT sobre core.workspaces
-- ya cubre la columna nueva; el runtime no puede cambiarla (solo actualiza `version`).

alter table core.workspaces
  add column institution_name text
    check (institution_name is null or length(btrim(institution_name)) between 1 and 200);

comment on column core.workspaces.institution_name is
  'Nombre de la institución que ven los miembros (no el jurídico). Opcional; lo fija el Equipo PlatLab.';
