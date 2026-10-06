# Verificación — Encabezado de la ficha del reactivo (06-10-2026)

Fecha: 2026-10-06 · Commit base: 9535d36, con cambios sin confirmar, rama `feat/precision-suave` · Entorno: local
Veredicto: **Incompleto**. Todo lo ejecutado cumple; queda sin verificar el CI del commit y el escaneo con un revisor de contraste formal.

Criterio fuente: [ADR 0012](../../05_decisiones.md#adr-0012), cambio del 06-10-2026: menos ruido en el encabezado de la ficha.

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Decisión registrada antes del código; DESIGN.md alineado | ✅ | ADR 0012 y DESIGN.md («Ficha del reactivo») |
| 2 | Identidad en una línea de texto; banda de tres datos (Existencia, Mínimo, Caducidad) | ✅ | Capturas de escritorio y 390 px de tres reactivos (vencido, bajo mínimo, normal) |
| 3 | Color solo para estados y con texto; «Sin vencidos ni por vencer» solo afirma lo que se cuenta | ✅ | Revisor de acabado, correcciones 1 a 4 aplicadas |
| 4 | Sin cambios de datos, reglas ni permisos | ✅ | Solo `inventory.tsx`, `DESIGN.md`, docs y una prueba e2e |
| 5 | Accesibilidad y detector | ✅ | axe sin violaciones en 17 pruebas e2e; detector `[]` |

Comandos: `pnpm typecheck`, `pnpm lint`, `pnpm knip` (exit 0); `pnpm db:reset` + `pnpm e2e` (17 pruebas con axe, exit 0); `impeccable detect --json apps/web/src` → `[]`.

## No verificado
- **CI del commit:** se revisa tras subirlo.
- **Cabecera «Actualizado… Actualizar»:** pertenece a la cabecera compartida de los módulos; queda para otra entrega.
