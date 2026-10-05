# Verificación — ficha del reactivo (segundo nivel del inventario) con el diseño de ReactiLab

Fecha: 2026-10-04 · Commit: 6ed2dc4, con cambios sin confirmar · Entorno: local
Veredicto: **Cumple**, también en el CI (run 37262202232 sobre 8e952f0). Cambio solo de presentación: sin datos, contratos, permisos ni reglas nuevas.

Referencia: la vista de detalle de frascos de `Inventario_V1` (ADR 0010, 04-10-2026). Se toma el lenguaje visual; no se copia su código.

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Resumen con chip de icono, existencia grande en el acento y datos como píldoras | ✅ | `ReagentsProductPage`; `desktop-product-multi.png` y `mobile-product.png` |
| 2 | Tarjeta de frasco: píldoras de ubicación y caducidad con icono, código y saldo grande, barra y acciones compactas | ✅ | `ContainerCard`; capturas de escritorio y móvil |
| 3 | Borde según el estado, siempre con texto: FEFO, vencido, vacío | ✅ | `desktop-product-multi.png` (vencido y FEFO) y `desktop-product-reserved.png`; la insignia FEFO reutiliza `fefoCandidates` de la hoja de salida, sin lógica nueva |
| 4 | Botones y permisos sin cambios | ✅ | Playwright: «Salida» y «Ajustar» (ahora con icono y nombre accesible) siguen por nombre; modo consulta sin acciones |
| 5 | Historial como línea de tiempo | ✅ | `desktop-product-reserved.png` |
| 6 | Accesibilidad WCAG 2.2 AA | ✅ | axe en 34 pantallas, incluidas ficha, ficha con varios frascos y ficha móvil |
| 7 | Comprobaciones | ✅ | `typecheck`, `lint`, `deps` (113 módulos) y `knip` en verde; 13 pruebas Playwright |
| 8 | Reproducibilidad en CI | ✅ | Run 37262202232 sobre 8e952f0, todos los pasos en verde, Playwright con axe incluido |

No verificado: revisión final de impeccable de esta ficha (no se pidió un pase aparte) y comparación píxel a píxel con ReactiLab; se comparó a ojo con su código.
