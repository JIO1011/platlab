-- Solo desarrollo local y CI: credencial de prueba del rol de runtime.
-- Nunca se usa en staging ni producción. No contiene datos personales.
alter role platlab_api with login password 'platlab_api_local';
