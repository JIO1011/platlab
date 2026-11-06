-- G0 de Laboratorios (ADR 0023, «G0 de Laboratorios»): con la demo sintética coherente, pgTAP, integración y
-- concurrencia de reservar, cambiar frascos y cerrar, el e2e del flujo solicitante → Administrador → responsable con
-- axe y la auditoría de la interfaz (docs/desarrollo/evidencias), Laboratorios pasa de development a pilot (02 §6,
-- 04 §2). Puede habilitarse en contratos de piloto; un contrato estándar en un ambiente real lo sigue rechazando hasta
-- su G2. La etapa la declara el manifiesto (packages/modules) y catalog.int.test.ts verifica que esta copia coincida.

do $$
begin
  update core.module_definitions set stage = 'pilot' where code = 'labs' and stage = 'development';
  if not found then
    raise exception 'Laboratorios no está registrado en etapa development';
  end if;
end
$$;
