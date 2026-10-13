-- R-01D (ADR 0015): un solo plegado de texto para buscar en el catálogo y para no repetir nombres.
-- Sin tildes ni mayúsculas y sin espacios de más: «  Ácido   Clorhídrico » y «acido clorhidrico»
-- son el mismo nombre. Solo las vocales acentuadas y la eñe del español, sin extensiones nuevas.

create function inventory.fold_text(value text) returns text
  language sql immutable strict parallel safe set search_path = ''
  as $$
  select pg_catalog.translate(
    pg_catalog.lower(pg_catalog.regexp_replace(pg_catalog.btrim(value), '\s+', ' ', 'g')),
    'áàäâéèëêíìïîóòöôúùüûñ',
    'aaaaeeeeiiiioooouuuun')
$$;

revoke execute on function inventory.fold_text(text) from public;
grant execute on function inventory.fold_text(text) to platlab_api;
