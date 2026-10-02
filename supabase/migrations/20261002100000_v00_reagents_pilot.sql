-- V-00 (04 §5): Reactivos supera su G0 con la demo sintética y las evidencias del primer incremento
-- (docs/desarrollo/evidencias) y pasa de development a pilot (02 §6, 04 §2). Desde ahora puede
-- habilitarse en contratos de piloto; un contrato estándar en un ambiente real lo sigue rechazando
-- hasta su G2. La etapa la declara el manifiesto (packages/modules) y catalog.int.test.ts verifica
-- que esta copia coincida.

do $$
begin
  update core.module_definitions set stage = 'pilot' where code = 'reagents' and stage = 'development';
  if not found then
    raise exception 'Reactivos no está registrado en etapa development';
  end if;
end
$$;
