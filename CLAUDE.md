# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado del proyecto

PlatLab es un SaaS modular para laboratorios. Está hecho el primer incremento (monorepo pnpm con `apps/server`, `apps/web`, `packages/contracts`, `packages/modules` y `packages/ui`; Core, admisión de dos ejes, capacidad `inventory`, módulo `reagents`, web) y el módulo Reactivos está en etapa `pilot`. No hay infraestructura desplegada. El estado, lo que sigue y las decisiones cerradas están en [docs/README.md](docs/README.md).

## Comandos

Requisitos: Node 24 (`.nvmrc`), pnpm 11 y Docker en ejecución. La CLI de Supabase es dependencia; se usa con `pnpm supabase …`.

| Tarea | Comando |
|---|---|
| Instalar | `pnpm install --frozen-lockfile` |
| Tipos / lint / fronteras / código muerto | `pnpm typecheck` · `pnpm lint` · `pnpm deps` · `pnpm knip` |
| Pruebas unitarias | `pnpm test` |
| Todo lo anterior | `pnpm check` |
| Base y Auth locales | `pnpm db:start` (genera la clave ES256 con `pnpm db:keys` si falta, arranca PostgreSQL + Auth y aplica migraciones + `seed.sql`) · `pnpm db:reset` (desde cero) |
| Regenerar tipos SQL | `pnpm db:types` (requiere base local; los `*.queries.ts` se confirman en git) |
| pgTAP | `pnpm test:db` |
| Integración (rol de runtime y Auth local) | `pnpm test:int` (requiere `pnpm db:start`) |
| API / web en desarrollo | `pnpm --filter @platlab/server dev` · `pnpm --filter @platlab/web dev` |
| Flujo de G0 en el navegador | `pnpm e2e` (Playwright + axe; requiere `pnpm db:start`; levanta la API y la vista previa; la primera vez, `pnpm --filter @platlab/web exec playwright install chromium`) |
| Demo local | Tras `pnpm db:start`, la API y la web en desarrollo: http://localhost:5173 con las cuentas de `supabase/seeds/demo.sql` (contraseña `platlab-demo`) |

Una sola prueba: `pnpm --filter @platlab/server exec vitest run src/app.test.ts` o filtrar por nombre con `-t "texto"`. Un solo archivo pgTAP: `pnpm supabase test db supabase/tests/database/runtime_role.test.sql`.

- **Versiones exactas fijadas.** TypeScript se queda en 5.9 (PgTyped admite hasta 5; typescript-eslint, hasta 6.0). Las dependencias respetan la antigüedad mínima de pnpm: no se añaden exclusiones para versiones recién publicadas.
- **Credenciales.** `platlab_api` es el rol de runtime: sin superusuario ni `BYPASSRLS`. Su contraseña local (`platlab_api_local`) vive solo en `supabase/seed.sql`; las migraciones no fijan credenciales.
- **Knip** (`knip.json`). Ignora `.claude/` y los tipos de PgTyped, y no reporta las exportaciones de `modules/*/index.ts` (interfaces públicas). Un hallazgo se elimina; no se silencia sin un motivo.
- **Auth local.** `supabase/signing_keys.json` firma los JWT de Auth local; cada máquina genera la suya y no se versiona. Para Studio y el resto de servicios, `pnpm supabase start` sin exclusiones.

## ROL
Actúa como experto senior en desarrollo de software full-stack,arquitectura, infraestructura, base de datos, cloud (cloudflare, supabase), UI/UX, product manager, marketing, con visión estratégica y buenas prácticas. Analiza, evalúa y propone la mejor solución. Responde de manera resumida y en alto nivel.

## MCP

- context7 para documentación de librerías.
- codebase-memory para analizar código local; hay una skill global.

## Modelos y delegación

Reparto por riesgo, no por capa (ADR 0013): todo cambio que pueda alterar saldos, permisos, datos, concurrencia o el contrato de la API va a Opus, esté en SQL, en el servidor o en la web. Lo demás, a Sonnet.

| Rol | Quién | Hace |
|---|---|---|
| Orquestar | Sesión principal: Opus 5.5 en `xhigh` | Analiza (codebase-memory), diseña datos, flujos e invariantes, decide con el usuario, registra en `docs/05`, escribe el brief con sus casos de prueba, revisa lo delicado (`platlab-db-review`), juzga la verificación, confirma y sube |
| Código delicado y sus pruebas | `platlab-implementer`: Opus 5.5 en `high`, con `platlab-db-review` cargada | SQL y migraciones, permisos y aislamiento, concurrencia, cantidades y saldos, contratos de la API y la lógica web que los usa; pgTAP, integración y concurrencia |
| Presentación | `platlab-ui-implementer`: Sonnet 5.5 en `high`, con las skills de diseño | Pantallas, pulido, movimiento, avisos, móvil y e2e de UI |
| Docs, mecánico y verificación | `platlab-assistant`: Sonnet 5.5 en `high` | Docs y skills, renombrar y consolidar, pruebas sin lógica nueva, ejecutar `platlab-verify-increment` y devolver el informe |
| Revisar acabado de UI | `impeccable-finish-reviewer`: Sonnet 5.5 en `high` | Correcciones ordenadas; no edita |

- **Escalada.** Un subagente no lanza otros. Los agentes Sonnet se detienen con «Bloqueo» si el cambio toca lo delicado, si la misma comprobación falla dos veces o si falta una decisión; la sesión principal lo reasigna a `platlab-implementer`. Las correcciones siguen con el mismo agente (`SendMessage`), no con uno nuevo.
- **Puertas automáticas** (ADR 0013, `.claude/hooks/`). `subagent-guard.sh` impide que los implementadores confirmen, suban, abran PR o editen sus puertas, y que los agentes Sonnet escriban en `supabase/`, `apps/server/`, `packages/contracts/` o `packages/modules/`. Al terminar, `subagent-gate.sh` detecta lo delicado que un agente Sonnet cambió por otra vía, exige capturas si el implementador de UI cambió la interfaz y corre `typecheck`, `lint`, `deps` y `knip`; si algo falla, devuelve el trabajo una vez. Las escrituras remotas por MCP, `supabase link`, `db push` y `git push --force` se bloquean en local; en GitHub, una regla impide el force-push y el borrado de `main`.
- **Impeccable corre en Sonnet 5.5 en `high`.** Sus comandos de ejecución y revisión (`audit`, `harden`, `polish`, `animate`, `layout`…) los lanza `platlab-ui-implementer`. La sesión principal solo usa `shape` para proponer. Los roles de documentar, producir imágenes y aplicar ediciones de `live` no tienen agente: la skill los ejecuta en línea (`reference/degraded/`) dentro del implementador de UI. Al actualizar la skill, revisar que `impeccable-finish-reviewer` conserve `model: claude-sonnet-5-5`.
- **Paquete para `impeccable-finish-reviewer`.** Se lo inyecta `subagent-gate.sh` al empezar: construcción guiada por código, contrato en `DESIGN.md` y ADR 0010, sin diseño de referencia, QUALITY BAR, `state.json` ni semilla, y reglas del dominio. El brief solo añade las capturas y los archivos.

- **Brief autocontenido.** El subagente empieza sin contexto: objetivo, decisiones ya tomadas, archivos, criterios de aceptación, comandos y qué no tocar.
- **Los subagentes no deciden ni cierran.** Si falta una decisión, se detienen y la reportan; no confirman ni suben.
- **Lo trivial, en línea.** Un cambio de pocas líneas en un archivo lo hace la sesión principal: delegarlo cuesta más que hacerlo.
- **Una sesión por entrega.** Al cerrarla (commit y CI en verde), `/clear`; la siguiente retoma desde `docs/README.md` y `docs/desarrollo/evidencias/README.md`.
- **Leer por partes.** codebase-memory, `grep` o `sed -n` de la sección o del ADR que toca; no leer enteros `docs/05`, `DESIGN.md` ni archivos de más de 300 líneas.
- **Salidas cortas.** De cada comando, solo conteos y errores; capturas solo si cambia la UI, recortadas.

## Frontend (`apps/web`, `apps/console`, `packages/ui`)

La dirección visual está en 01 «Dirección visual», el stack en 02 §2 y el sistema en el ADR 0010. Las skills viven en `.claude/skills/` y se usan sin esperar a que se pidan:

| Momento | Skill |
|---|---|
| Antes de una pantalla o un flujo nuevo | `impeccable shape` (brief de UX confirmado por el usuario) |
| Movimiento, gestos y hojas | `animate` + `apple-design`; al terminar, `review-animations` |
| Avisos | `ask-sonner` |
| Una pieza que el stack no resuelve | `pick-ui-library`; la documentación se consulta con context7 |
| Antes de cerrar una entrega con UI | Capturas de escritorio y móvil en `apps/web/.impeccable/review/` (la puerta las exige) e `impeccable-finish-reviewer`; después, `platlab-verify-increment` |
| Antes de cerrar una puerta (G0, G1…) | `impeccable audit`, `harden` y `polish` sobre todo el frontend, más `review-animations` |

- **Sin duplicar documentos.** `PRODUCT.md` y `DESIGN.md`, de `impeccable init` o `document`, solo enlazan a 01, 02 y al ADR 0010.
- **Detector automático.** Los hooks de `.claude/settings.json` ejecutan el detector de impeccable al editar archivos de UI.
- **Reglas del dominio por encima de las de estilo.** Nada de UI optimista sobre el stock ni de «deshacer» en movimientos confirmados.

## Qué leer y qué documento manda

- [docs/README.md](docs/README.md): hilo del proyecto (estado, decisiones cerradas, siguiente paso, glosario). Empezar siempre aquí.
- [Primer incremento](docs/desarrollo/primer_incremento.md): lo que se programa ahora (F1a + R-00, puerta G0).
- [01 Producto](docs/01_producto.md): módulos, roles y su matriz, flujos y pantallas.
- [02 Arquitectura](docs/02_arquitectura.md): contrato de módulo, aislamiento, stack, infraestructura y parámetros iniciales (§12, única fuente).
- [03 Datos](docs/03_datos.md): esquemas, tablas, estados, invariantes y transacciones.
- [04 Roadmap](docs/04_roadmap.md): única autoridad de fases, puertas y backlog; no copiarlos aquí.
- [05 Decisiones](docs/05_decisiones.md): ADR resumidos y preguntas pendientes. Registrar ahí toda decisión nueva antes de cambiar código u otros documentos.
- Antecedentes en `docs/antecedentes/` (PRD, proforma y Propuesta.pdf, la referencia visual): no son oferta vigente ni reglas validadas.
- El plan detallado anterior está en el commit `bc26fa8`; consultarlo con `git show bc26fa8:<ruta>` solo si hace falta un detalle.

## Invariantes para implementar

- Monolito modular con producto y migraciones comunes. Nombres canónicos: `core.workspaces`, `workspace_id` y `/v1/workspaces/:workspaceId`; en la interfaz, «Espacio de trabajo». Titular jurídico y propietario son conceptos diferentes.
- Cada módulo es una rebanada vertical con manifiesto en `packages/modules`. Se agrega según el contrato de 02 §4 y no modifica tablas de otros módulos. Cada esquema tiene un único propietario técnico: un módulo o una capacidad.
- **Etapas y admisión (ADR 0009, 02 §6).**
  - Cada módulo avanza `development → pilot → general`.
  - Una sola función de admisión evalúa dos ejes, espacio y módulo, y admite solo lo que ambos permiten. Los estados desconocidos se deniegan.
  - Separa operación nueva, resolución de pendientes y consulta/exportación, y se prueba con todas las combinaciones.
  - Lee espacio, derecho y membresía con bloqueo compartido en la misma consulta con la que decide. Orden de bloqueo fijo: espacio → derecho → membresía → datos.
- **Capacidades compartidas (inventario, agenda, incidencias).** No comparten derechos: cada operación se autoriza contra el módulo dueño del recurso. Se exponen con rutas y permisos de ese módulo (`/reagents/issues`, `reagents.issue.create`), nunca con `/inventory/*`.
- La API autoriza toda operación de dominio: membresía, derecho del módulo, permiso y ámbito se comprueban en el servidor. RLS y FKs compuestas añaden aislamiento. El navegador no tiene CRUD directo al dominio.
- SQL parametrizado con `pg` + PgTyped. Una conexión y una transacción para autorización, contexto local, negocio, auditoría e idempotencia. El runtime no es dueño de tablas ni tiene `BYPASSRLS`. Las migraciones SQL son la autoridad.
- Cantidades exactas: `numeric` y cadenas decimales, nunca aritmética de cantidades con `number`. Movimiento confirmado y saldo se guardan juntos. Nadie borra registros de negocio: se archiva, se cancela o se compensa.
- Reservar, entregar y consumir son operaciones distintas. Los efectos externos van por outbox y nunca antes del commit.
- Solo el Equipo PlatLab cambia derechos de módulos, mediante `apply_contract_revision`. Suscripción, permisos del miembro y banderas de despliegue son controles separados.
- Roles del espacio: Propietario, Administrador, Operador, Docente, Estudiante (tesista) y Responsable de fiscalizados. El personal del proveedor es el «Equipo PlatLab» (`staff`, `apps/console`, `/v1/console/*`); nunca usar «operador» para él.
- Aislar la consola no elimina el acceso privilegiado de infraestructura: aplicar los ADR 0004 y 0005.
- Demo sintética, piloto real y venta abierta tienen puertas diferentes (G0, G1, G2); seguir el roadmap.
- pgTAP bajo roles reales, integración API y concurrencia PostgreSQL verifican invariantes distintas. No marcar verificaciones como aprobadas por estar documentadas.

## Barreras del producto

Las decisiones cerradas están en `docs/README.md` («Decisiones cerradas») y en `docs/05`; no volver a preguntarlas.

- Las sustancias fiscalizadas son necesarias desde el piloto: no diferirlas a Analítica ni excluirlas sin una nueva decisión explícita.
- El modelo comercial sigue pendiente: la recomendación está en 01 §4 y debe confirmarla el usuario.
- No fijar fechas, horas ni presupuestos contractuales inventados.
- Parámetros, matrices de roles y fases viven solo en sus fuentes; enlazarlas, no copiarlas.

## ReactiLab

Referencia local: `/home/jio/Documentos/Inventario_V1`, código del propio usuario.

- **Usar como referencia de UX:** salida rápida, vista de producto a lote, SDS al retirar, motivo obligatorio y bandeja de aprobaciones.
- **No copiar:** su baseline ni su historia de migraciones; su modelo de frasco, lote y código fusionados; el ajuste sin signo ni el borrado usado como baja.
- **Importación:** ReactiLab no la tiene; se diseña desde cero.
- **Licencia:** aclarar titularidad y licencia (README MIT frente a términos de software propietario) antes de copiar código.
