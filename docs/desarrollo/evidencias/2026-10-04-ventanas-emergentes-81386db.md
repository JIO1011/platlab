# Verificación — ventanas emergentes con el estilo del modal de salida de ReactiLab

Fecha: 2026-10-04 · Commit: 81386db, con cambios sin confirmar · Entorno: local
Veredicto: **Cumple**, también en el CI (run 37263869740 sobre a3d666b). Cambio solo de presentación: el formulario, la validación y las acciones siguen igual.

Pedido del usuario: conservar las ventanas emergentes y darles el estilo del modal de salida de ReactiLab (`CheckoutModal.tsx`, tomado solo como referencia visual). Decisión en el ADR 0010, «Cambio del 04-10-2026 (segundo)».

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Se conservan como ventanas emergentes, ahora centradas | ✅ | `Sheet` de `packages/ui`; Playwright abre y cierra las cuatro (nuevo reactivo, ingreso, salida y ajuste) por su título |
| 2 | Cabecera con cuadro de icono, título y cierre | ✅ | `desktop-issue.png`, `desktop-receipt.png`, `desktop-adjust.png`, `desktop-sheet.png` |
| 3 | Salida: stock con barra, cantidad grande y centrada con atajos, motivo y destino en píldoras, botón ancho degradado | ✅ | `desktop-issue.png` y `desktop-fefo.png`; el texto «Quedarán» y los avisos de error siguen en un solo lugar |
| 4 | Ajuste con las mismas secciones | ✅ | `desktop-adjust.png` |
| 5 | Móvil sin desbordes | ✅ | `mobile-sheet.png`: la ventana deja 16 px a cada lado; se corrigió un selector que ensanchaba el formulario (columna fija en `Field` y en el formulario) |
| 6 | Acciones y permisos sin cambios | ✅ | Playwright: «Registrar salida», «Solicitar salida», «Cancelar» y cierre por nombre; el flujo de aprobación y el de insuficiente siguen igual |
| 7 | Accesibilidad WCAG 2.2 AA | ✅ | axe en 34 pantallas, incluidas las cuatro ventanas, el aviso de frasco vencido y la hoja con stock insuficiente |
| 8 | Comprobaciones | ✅ | `typecheck`, `lint`, `deps`, `knip`, `pnpm test` (37), pgTAP 168, integración 94, Playwright 13, build y detector `[]` |
| 9 | Reproducibilidad en CI | ✅ | Run 37263869740 sobre a3d666b, todos los pasos en verde, Playwright con axe incluido |

No verificado: revisión final de impeccable de estas ventanas (no se pidió un pase aparte); comparación píxel a píxel con ReactiLab; las ventanas de ingreso y de nuevo reactivo conservan sus campos sin los rótulos en mayúsculas de la salida y el ajuste.
