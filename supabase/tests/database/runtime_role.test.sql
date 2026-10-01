-- Atributos del rol de runtime (docs/02_arquitectura.md §5).
begin;
create extension if not exists pgtap with schema extensions;

select plan(6);

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

select is(
  (select count(*)::int
     from pg_auth_members m
     join pg_roles r on r.oid = m.member
    where r.rolname = 'platlab_api'),
  0,
  'platlab_api no hereda privilegios de otros roles'
);

select ok(
  not has_schema_privilege('platlab_api', 'public', 'CREATE'),
  'platlab_api no puede crear objetos en public'
);

select * from finish();
rollback;
