-- Solo desarrollo local y CI: credencial de prueba del rol de runtime.
-- Nunca se usa en staging ni producción. No contiene datos personales.
alter role platlab_api with login password 'platlab_api_local';

-- Solo desarrollo local y CI: este ambiente tiene datos sintéticos (ADR 0009). La migración lo
-- deja como datos reales; staging y demo lo marcan en su aprovisionamiento, producción nunca.
update platform.environment set data_class = 'synthetic';
