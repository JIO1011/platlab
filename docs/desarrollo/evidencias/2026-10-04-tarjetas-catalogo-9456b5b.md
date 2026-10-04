# Verificación — tarjetas de catálogo del Inventario de Reactivos (ADR 0010, cambio del 04-10-2026)

Fecha: 2026-10-04 · Commit: 9456b5b, con cambios sin confirmar · Entorno: local
Veredicto: **Incompleto**, solo a falta del CI de este commit. Cambio solo de presentación: sin datos, contratos ni reglas nuevas.

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Decisión registrada antes del código | ✅ | ADR 0010, «Cambio del 04-10-2026», en `docs/05_decisiones.md` |
| 2 | Patrón común: chip de icono, rótulo y CAS, nombre, línea, «Total» con píldora e icono, cifra en el acento | ✅ | `ProductCard` en `inventory.tsx` y `IconChip` compartido en `packages/ui`; capturas `desktop.png`, `desktop-inventory-empty.png`, `mobile.png` y `tablet.png` |
| 3 | Verde, ámbar y rojo solo para estados | ✅ | El color de las tarjetas es el acento del módulo; el ámbar solo marca «Sin existencias», con icono y texto |
| 4 | Sin tocar lógica | ✅ | El diff de `inventory.tsx` solo cambia `ProductCard` y su esqueleto; `home-page.tsx` solo sustituye el span del icono por `IconChip`, con el mismo aspecto; servidor, contratos y SQL sin cambios |
| 5 | Accesibilidad WCAG 2.2 AA | ✅ | Playwright con axe, 13 pruebas pasan (incluidos inventario de escritorio, tableta y móvil); contraste de la píldora calculado en 4,9:1 |
| 6 | Revisor final de impeccable | ✅ | Primer pase «fix»: CAS que salta de línea, saldo largo y altura del esqueleto; las tres, aplicadas |
| 7 | Detector de impeccable y DESIGN.md | ✅ | Detector `[]`; documentador actualizó `DESIGN.md` y `design.json` (válido) |
| 8 | Reproducibilidad en CI | ⚠️ | Falta el CI de este commit |

Comandos locales: `pnpm typecheck`, `lint`, `deps` y `knip` en verde; `pnpm test` 37 pruebas; `pnpm e2e` 13 pruebas con axe; build y detector sin hallazgos.

No verificado: las ramas «gas» y «sin estado físico» del icono solo se vieron con «sin estado» (Cloruro de sodio de prueba) y no con «gas»; un saldo de más de 12 caracteres se resuelve por código (la unidad baja de línea) y no tiene captura.
