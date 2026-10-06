# Verificación — R-01A: lote sin estado propio (05-10-2026)

Fecha: 2026-10-05 · Commit base: 89ae651, con cambios sin confirmar, rama `feat/precision-suave` · Entorno: local (Docker + Supabase CLI, PostgreSQL 17, Chromium de Playwright)
Veredicto: **Incompleto**. Todo lo ejecutado cumple; queda sin verificar el CI del commit de cierre.

Criterio fuente: [ADR 0012](../../05_decisiones.md#adr-0012), cambio del 05-10-2026 «Sin estado del lote», decidido por el usuario tras probar la entrega 3: cada frasco se gestiona por separado. Sustituye la parte de estado del lote del [informe anterior](2026-10-05-r01a-entrega3-minimos-lote.md); los mínimos siguen igual.

## Criterios

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Decisión registrada antes del código y documentos alineados | ✅ | ADR 0012; 01 §3 y §6.1, 03 §4, 04, README, CLAUDE.md y DESIGN.md |
| 2 | El lote no tiene estado: sin campo, sin historial, sin permiso ni rutas | ✅ | **pgTAP:** «el lote no tiene estado propio…» (sin columna `condition`), el catálogo de permisos ya no tiene `reagents.lot.manage` y `inventory` no tiene `lot_condition_changes`. La migración de la entrega 3 se reescribió (no hay ninguna base desplegada): solo el mínimo y la retirada de `condition` |
| 3 | Sin tipo de movimiento «baja» | ✅ | Contrato: `operationType` vuelve a ingreso, salida y ajuste; Movimientos sin «Bajas» |
| 4 | Un frasco se desecha con «Ajustar» a cero y motivo | ✅ | **Navegador:** «mínimos…» (el frasco vencido no tiene «Estado del lote»; la hoja de ajuste ofrece «Vencido» y «Contaminado») |
| 5 | Salidas, FEFO e ingresos ya no dependen del lote | ✅ | Solo la disposición del frasco (`usable`) decide si admite salidas; **integración** de salidas, FEFO e ingresos en verde |
| 6 | Los mínimos no cambian | ✅ | **Integración:** «el mínimo lo fija el Administrador…»; **navegador:** «Bajo mínimo» en el Resumen y el Inventario |
| 7 | Accesibilidad y detector | ✅ | axe sin violaciones (14 pruebas); detector `[]` |

## Comandos ejecutados

| # | Comando | Resultado | Detalle |
|---|---|---|---|
| 1 | `pnpm typecheck` · `pnpm lint` · `pnpm deps` · `pnpm knip` | exit 0 | 114 módulos, 332 dependencias, 0 violaciones; sin código muerto |
| 2 | `pnpm test` | exit 0 | 37 pruebas |
| 3 | `pnpm db:reset` · `pnpm db:types` | exit 0 | 13 migraciones + seed + demo |
| 4 | `pnpm test:db` | exit 0 | 173 pruebas pgTAP (salen las 14 del estado del lote; entra 1) |
| 5 | `pnpm test:int` | exit 0 | 96 pruebas (salen las 4 del estado del lote y la de cuarentena tras pedir) |
| 6 | `pnpm e2e` (tras `pnpm db:reset`) | exit 0 | 14 pruebas Playwright con axe |
| 7 | `impeccable detect --json` | exit 0 | `[]` |

## No verificado

- **CI del commit de cierre:** se revisa tras subirlo.
- **Disposición por posición:** sigue en el esquema para custodia y retornos (03 §4); hoy toda posición nace `usable` y nada la cambia.
