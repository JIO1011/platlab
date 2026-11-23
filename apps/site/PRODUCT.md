# Product

<!-- impeccable:product-schema 1 -->

Sitio público de presentación de PlatLab. Específico del sitio (`apps/site`); no sustituye al `PRODUCT.md` de la raíz, que describe la app. La verdad del producto vive en [docs/01_producto.md](../../docs/01_producto.md) y en el [ADR 0030](../../docs/05_decisiones.md#adr-0030); aquí solo se enlaza.

## Platform

web

## Users

- Directores y jefes de laboratorio de **universidades** (varios laboratorios, docentes y tesistas) y de **clínicas** (insumos con vencimiento por lote). Llegan por recomendación o búsqueda y deciden si piden una demostración.
- Quien aprueba la compra (decanato, dirección administrativa): necesita ver orden, control y seriedad, no una herramienta de moda.
- Usuarios actuales de la demo o del piloto: entran para iniciar sesión y salir.

## Product Purpose

Presentar PlatLab, plataforma modular para laboratorios (reactivos, equipos, laboratorios, mantenimiento y materiales). El sitio logra su fin cuando el visitante **pide una demostración por correo** o un usuario actual **inicia sesión** en la app.

## Positioning

Un solo espacio de trabajo por institución, con módulos contratables, aprobaciones, historial que nunca se borra y datos separados por institución. Nace de ReactiLab (inventario de reactivos) y lo amplía.

## Capabilities and Constraints

- Etapas reales: Reactivos y Laboratorios en piloto; Equipos, Mantenimiento y Materiales en desarrollo. «Construir un módulo no lo pone a la venta» (01 §3).
- Sustancias controladas: informe exportable con marca, filtro y PDF/Excel (ADR 0016); cupos, custodia y reporte oficial aún no existen.
- Sin fechas contractuales. Los precios y el modelo comercial los fija el ADR 0032 (en el PR `feat/precios`); no inventar cifras fuera de `src/modules/precios/precios.ts`.
- Funciona en el navegador, también en el celular; escanea QR con la cámara.
- Sitio estático (Next 16, Cloudflare), español de Ecuador, WCAG 2.2 AA.

## Brand Commitments

Nombre «PlatLab»; el personal del proveedor es el «Equipo PlatLab». La paleta de la app (azul marino y azul de marca, un acento por módulo) es la base de identidad compartida.

## Evidence on Hand

- Capturas reales de la demo en `public/capturas/` (datos sintéticos; los nombres de la demo son de ejemplo).
- App en línea: `https://platlab.ohmroyal.org/acceso`. Único canal de contacto: `contacto@ohmroyal.org` (sin WhatsApp ni teléfono, por decisión del usuario).
- Ausentes, no inventar: logos de clientes, testimonios, cifras de uso, fotografías de laboratorios, dominio definitivo del sitio.

## Product Principles

1. Mostrar el producto real antes que describirlo.
2. Decir la etapa verdadera de cada módulo.
3. Lenguaje de comprador, no de ingeniería.
4. Una sola acción principal por pantalla: pedir la demostración.

## Accessibility & Inclusion

WCAG 2.2 AA, estados con texto además de color, foco visible y teclado completo; respeta `prefers-reduced-motion`.
