-- T-01: rol de runtime de la API (docs/02_arquitectura.md §5, ADR 0006).
-- Sin propiedad de tablas, sin superusuario y sin BYPASSRLS: así RLS se aplica siempre.
-- La migración no fija credenciales; cada ambiente define LOGIN y contraseña fuera del repositorio.
-- En Supabase, `postgres` no es superusuario y no puede alterar esos atributos después:
-- se fijan al crear el rol y la prueba pgTAP runtime_role.test.sql los verifica.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'platlab_api') then
    create role platlab_api nologin nosuperuser nobypassrls nocreatedb nocreaterole noreplication;
  end if;
end
$$;
