# PlatLab

SaaS modular para laboratorios. Cada laboratorio trabaja en su propio espacio de trabajo y habilita los módulos que contrata; el primero, **Reactivos**, lleva el inventario por frasco, las salidas con aprobación y su historial.

> Estado: desarrollo local y demo sintética. No hay infraestructura desplegada. El hilo del proyecto (decisiones, siguiente paso y glosario) está en [docs/README.md](docs/README.md).

## Qué hay

| Parte | Dónde | Tecnología |
|---|---|---|
| API | `apps/server` | Node 24, Fastify 5, `pg` con consultas tipadas por PgTyped |
| Web | `apps/web` | React 19, Vite, React Router, TanStack Query y Table |
| Componentes y tokens | `packages/ui` | Tailwind v4, Radix |
| Contratos de la API | `packages/contracts` | Zod 4 |
| Manifiestos de módulos | `packages/modules` | TypeScript |
| Base de datos y Auth | `supabase/` | PostgreSQL 17, migraciones SQL, Auth local (ES256) |

## Requisitos

- **Node 24** (`.nvmrc`). Con nvm: `nvm use`.
- **pnpm 11**. Con Corepack: `corepack enable`.
- **Docker en ejecución**: Supabase local corre en contenedores.

La CLI de Supabase viene como dependencia; se usa con `pnpm supabase …`, sin instalarla aparte.

## Cómo correrlo

```bash
pnpm install --frozen-lockfile     # una sola vez

pnpm db:start                      # PostgreSQL + Auth locales, migraciones y datos de demo
pnpm --filter @platlab/server dev  # API en http://127.0.0.1:3000
pnpm --filter @platlab/web dev     # web en http://localhost:5173
```

Cada comando va en su propia terminal, salvo `db:start`, que termina al dejar la base lista. Después abre **http://localhost:5173**.

La primera vez, `db:start` genera la clave de firma de Auth en `supabase/signing_keys.json` (cada máquina tiene la suya y no se versiona). No hace falta crear archivos `.env`: los valores por defecto apuntan a Supabase local. La web pide sus datos a `/v1`, que Vite reenvía a la API, así que no hay CORS.

### Cuentas de la demo

Contraseña de todas: `platlab-demo`. Los datos son sintéticos (`supabase/seeds/demo.sql`).

| Correo | Quién es |
|---|---|
| `admin@demo.platlab.test` | Ana Administradora: Administradora en la Facultad de Ciencias (Universidad Demo), y propietaria del Centro de Investigación (Instituto Tecnológico Demo, otra institución) |
| `operador@demo.platlab.test` | Óscar Operador: Operador en la Facultad de Ciencias, y propietario y Administrador del Instituto de Biotecnología |
| `propietaria@demo.platlab.test` | Paula Propietaria: propietaria de la Facultad de Ciencias, con los permisos del Administrador |
| `docente@demo.platlab.test` | Diego Docente: sin permisos en Reactivos |

Para ver el ciclo de aprobación, abre dos sesiones (una ventana normal y otra de incógnito): el Operador pide una salida desde la ficha de un reactivo y la Administradora la aprueba en **Solicitudes**.

### Si algo falla

- **Volver a empezar con los datos de demo:** `pnpm db:reset`. Las pruebas modifican los datos, así que conviene reiniciar tras correrlas.
- **La API responde 000 o el puerto está ocupado:** comprueba que Docker esté activo y que nada más use los puertos 3000 (API), 5173 (web), 54321 (Auth) y 54322 (PostgreSQL).
- **Otros servicios de Supabase (Studio, correo):** `pnpm supabase start` los levanta sin exclusiones.

## Comandos

| Tarea | Comando |
|---|---|
| Tipos, lint, fronteras y código muerto | `pnpm typecheck` · `pnpm lint` · `pnpm deps` · `pnpm knip` |
| Pruebas unitarias | `pnpm test` |
| Todo lo anterior | `pnpm check` |
| Reconstruir la base desde cero | `pnpm db:reset` |
| Regenerar los tipos de SQL (con la base en marcha) | `pnpm db:types` |
| pgTAP: RLS, grants, invariantes del ledger | `pnpm test:db` |
| Integración de la API, con el rol de runtime | `pnpm test:int` |
| Recorrido en el navegador con accesibilidad (Playwright y axe) | `pnpm e2e` |

Para `pnpm e2e`, la primera vez: `pnpm --filter @platlab/web exec playwright install chromium`. Levanta él mismo la API y la vista previa; solo necesita la base en marcha.

Una sola prueba: `pnpm --filter @platlab/server exec vitest run src/app.test.ts`, o filtrando por nombre con `-t "texto"`. Un solo archivo pgTAP: `pnpm supabase test db supabase/tests/database/runtime_role.test.sql`.

## Estructura

```
apps/server        API: módulos (core, reagents) y capacidades (inventory)
apps/web           interfaz: acceso, Inicio y la app de cada módulo
packages/ui        tokens y componentes propios
packages/contracts esquemas Zod compartidos entre API y web
packages/modules   manifiesto de cada módulo
supabase/          migraciones, semillas y pruebas pgTAP
docs/              producto, arquitectura, datos, roadmap y decisiones
```

## Documentación

Empieza por [docs/README.md](docs/README.md). Cada tema tiene una sola fuente:

- [01 Producto](docs/01_producto.md): módulos, roles, flujos y pantallas.
- [02 Arquitectura](docs/02_arquitectura.md): contrato de módulo, aislamiento, stack y parámetros.
- [03 Datos](docs/03_datos.md): esquemas, estados, invariantes y transacciones.
- [04 Roadmap](docs/04_roadmap.md): fases, puertas y backlog.
- [05 Decisiones](docs/05_decisiones.md): los ADR; toda decisión nueva se registra ahí antes de cambiar código.
- [DESIGN.md](DESIGN.md): el sistema de diseño de la interfaz.
- [CLAUDE.md](CLAUDE.md): guía para trabajar con Claude Code en este repositorio.

## Reglas que conviene conocer

- Las cantidades son exactas: `numeric` en la base y cadenas decimales en la API y la web, nunca `number`.
- Nadie borra registros de negocio: se archivan, se cancelan o se compensan con otro movimiento.
- La API autoriza cada operación en el servidor; el navegador no accede directamente a los datos del dominio.
- El rol de la API (`platlab_api`) no es dueño de las tablas ni puede saltarse RLS. Su contraseña local vive solo en `supabase/seed.sql`; las migraciones no fijan credenciales.
- Nunca se usan credenciales de staging o producción en local.
