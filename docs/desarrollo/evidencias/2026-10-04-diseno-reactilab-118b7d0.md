# Verificación — rediseño con el lenguaje visual de ReactiLab (ADR 0010, cambio del 04-10-2026, segundo)

Fecha: 2026-10-04 · Commit: 118b7d0, con cambios sin confirmar · Entorno: local
Veredicto: **Cumple**, también en el CI (run 37260126321 sobre 5701e7f). Cambio de presentación: sin datos, contratos ni reglas nuevas.

Origen: el usuario pidió mantener el diseño de ReactiLab y adjuntó dos imágenes de referencia (tarjeta de inventario y tablero). Se tomó el lenguaje visual del proyecto local `Inventario_V1`; no se copió su código, cuya licencia está por aclarar.

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Decisión registrada antes del código | ✅ | ADR 0010, «Cambio del 04-10-2026 (segundo)»; 01 «Dirección visual», `CLAUDE.md` y el hilo al día |
| 2 | Estructura: barra lateral pegada con el activo relleno, tarjeta de la persona, «Salir» al pie y barra superior translúcida | ✅ | `app-shell.tsx`; capturas `desktop.png`, `desktop-summary.png`, `tablet.png`, `mobile-summary.png` |
| 3 | Tarjetas con borde fino, esquinas de 24 px y elevación al pasar el puntero | ✅ | Tokens en `styles.css` (el borde va dentro de la sombra, sin cambiar tamaños); capturas |
| 4 | Resumen: tarjeta degradada de acción rápida, cuatro indicadores con icono y actividad como línea de tiempo | ✅ | `reagents-page.tsx`, `StatCard`, `activity-row.tsx`; `desktop-summary.png` y `mobile-summary.png` |
| 5 | Tarjeta de catálogo con marca de agua y tres columnas; Inicio con píldora de fecha | ✅ | `inventory.tsx`, `home-page.tsx`; `desktop.png` y `desktop-home.png` |
| 6 | Acento de Reactivos en índigo con contraste AA | ✅ | `#4F46E5` con blanco 6,3:1 y sobre `#EEF2FF` 5,6:1; el revisor verificó los pares de texto y fondo del ADR |
| 7 | Lo que se mantiene: estados con texto, una primaria por pantalla, sin UI optimista | ✅ | Playwright (13 pruebas, flujos de G0, solicitudes, consulta y errores) y axe en 34 pantallas |
| 8 | Accesibilidad WCAG 2.2 AA | ✅ | axe sin violaciones; la comprobación ahora espera a que terminen las transiciones |
| 9 | Revisor final de impeccable | ✅ | Pase «fix», con 8 puntos: 6 aplicados total o parcialmente y 2 rechazados con motivo (ver abajo) |
| 10 | Detector, build y secretos | ✅ | Detector `[]`; build correcto; sin credenciales en `dist` |
| 11 | DESIGN.md al día y compacto | ✅ | 19,8 KB (era 48 KB); `design.json` válido (42 KB) |
| 12 | Reproducibilidad en CI | ✅ | Run 37260126321 sobre 5701e7f, todos los pasos en verde, Playwright con axe incluido |

Comandos locales: `typecheck`, `lint`, `deps` y `knip` en verde; `pnpm test` 37 pruebas; pgTAP 168; integración 94; Playwright 13 con axe; build.

## Revisión final: qué se aplicó y qué no

El revisor no pudo abrir las imágenes de referencia (su carpeta temporal no las tenía) y juzgó contra el ADR.

- **Aplicado:** círculos de la actividad siempre en el acento (evita un muro rojo); cifra con signo coloreada también en la tabla de Movimientos; sin acciones de cabecera en Solicitudes, con «Aprobar salida» como primaria; insignia de rol de 11 px; marca de agua del Inicio más tenue; contrato de superficie actualizado.
- **Rechazado, porque contradice la referencia:** quitar la pastilla «Gestión rápida» y el rótulo de categoría sobre el nombre (ambos aparecen en las imágenes), y no usar rojo para las salidas (la referencia lo usa). Quedó escrito en el ADR.
- **No aplicado:** pasar la barra lateral de ancho completo a `lg`. En 820 px el contenido queda en unos 530 px y funciona; lo decide el usuario si prefiere otra cosa.

## No verificado

- **Comparación visual píxel a píxel con las imágenes de referencia:** el revisor no las vio; se comparó a ojo en esta sesión.
- Una captura móvil de Movimientos con una salida aprobada.
