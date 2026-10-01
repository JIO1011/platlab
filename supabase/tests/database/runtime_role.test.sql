-- Atributos del rol de runtime (docs/02_arquitectura.md §5).
begin;
create extension if not exists pgtap with schema extensions;

select plan(4);

select has_role('platlab_api', 'existe el rol de runtime de la API');

select is(
  (select rolsuper from pg_roles where rolname = 'platlab_api'),
  false,
  'platlab_api no es superusuario'
);

select is(
  (select rolbypassrls from pg_roles where rolname = 'platlab_api'),
  false,
  'platlab_api no tiene BYPASSRLS'
);

select is(
  (select rolcreaterole or rolcreatedb or rolreplication from pg_roles where rolname = 'platlab_api'),
  false,
  'platlab_api no crea roles, bases ni replicación'
);

select * from finish();
rollback;
