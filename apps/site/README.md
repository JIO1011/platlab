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

- Con el dominio definitivo, cambiar `SITE.url` y `CONTENIDO_PROVISIONAL = false` en `src/shared/config/site-config.ts` (hoy comparte `platlab.ohmroyal.org` con la app y está fuera de los buscadores).
- «Iniciar sesión» apunta a `SITE.app` (`/acceso` de la app, en el mismo dominio).
- Cabeceras de seguridad en `public/_headers`; lo despliega el Worker de la app (`infra/cloudflare`, ADR 0033).
