# PlatLab — Sitio público de presentación

Sitio estático en Next 16 (`output: "export"`) que presenta PlatLab con capturas reales de la demo. Decisiones: [ADR 0030](../../docs/05_decisiones.md#adr-0030); contexto de diseño: [PRODUCT.md](PRODUCT.md).

## Comandos (desde la raíz del monorepo)

```bash
pnpm --filter @platlab/site dev        # http://localhost:3005
pnpm --filter @platlab/site build      # escribe apps/site/out
pnpm --filter @platlab/site capturar   # recaptura las pantallas desde la demo local (solo lectura)
pnpm --filter @platlab/site e2e        # Playwright + axe (usa la salida de build)
```

`pnpm check` de la raíz ya incluye sus tipos, lint (ESLint 9 propio) y pruebas; el CI además lo compila.

## Antes de abrirlo al público

- Definir el dominio y cambiar `SITE.url` y `CONTENIDO_PROVISIONAL = false` en `src/shared/config/site-config.ts` (hoy el sitio está fuera de los buscadores).
- «Iniciar sesión» apunta a `SITE.app` (la demo en `platlab.ohmroyal.org`); dejar la app siempre en línea antes de publicar (02 §9).
- Cabeceras de seguridad en `public/_headers`; despliegue con `wrangler.jsonc` (manual, aún sin hacer).
