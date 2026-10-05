# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Estado del proyecto

PlatLab es un SaaS modular para laboratorios. T-01 está implementado: monorepo pnpm (`apps/server`, `apps/web`, `packages/contracts`, `packages/modules`), Supabase local, PgTyped y CI. T-02/T-03 añaden Core (`core`, `platform`), RLS, JWT por JWKS y `GET /v1/me/workspaces`. T-04/T-05 añaden el registro de módulos, los derechos por `platform.apply_contract_revision`, la admisión de dos ejes (`core.admission`, con `withModuleAccess`), `/me` con módulos, `/home`, auditoría e idempotencia. R-00 añade la capacidad `inventory` (ledger con saldo verificado contra sus asientos) y el módulo `reagents` con sus rutas `/v1/workspaces/:workspaceId/reagents/*`. El paso 5 añade `packages/ui` (tokens del ADR 0010 y componentes propios) y la web: acceso, selector de espacio, Inicio y tablero de Reactivos, con el rediseño «precisión suave». V-00 cierra la G0 de Reactivos y lo pasa a etapa `pilot`. Desde el ADR 0011, el Inicio es un tablero de módulos y cada módulo es una app con sus secciones (declaradas en el manifiesto) y su `/summary`. Desde el cambio del ADR 0008, el propietario tiene los permisos del Administrador (`core.effective_role_assignments`). No hay infraestructura desplegada.

## Comandos

Requisitos: Node 24 (`.nvmrc`), pnpm 11 y Docker en ejecución. La CLI de Supabase se instala como dependencia; se usa con `pnpm supabase …`.

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

Notas:

- **Versiones exactas fijadas.**
  - TypeScript se queda en 5.9: PgTyped admite hasta 5 y typescript-eslint, hasta 6.0.
  - Las dependencias respetan la antigüedad mínima de pnpm, así que no se añaden exclusiones para versiones recién publicadas.
- **Credenciales.** `platlab_api` es el rol de runtime: sin superusuario ni `BYPASSRLS`. Su contraseña local (`platlab_api_local`) vive solo en `supabase/seed.sql`. Las migraciones no fijan credenciales.
- **Knip** (`knip.json`). Ignora `.claude/` y los tipos que genera PgTyped, y no reporta las exportaciones de `modules/*/index.ts`, porque son interfaces públicas. Un hallazgo se elimina; no se silencia sin un motivo.
- **Auth local.** `supabase/signing_keys.json` es la clave con la que Auth local firma los JWT; cada máquina genera la suya y no se versiona. Para Studio y el resto de servicios, `pnpm supabase start` sin exclusiones.

## ROL
Actúa como experto senior en desarrollo de software full-stack,arquitectura, infraestructura, base de datos, cloud (cloudflare, supabase), UI/UX, product manager, marketing, con visión estratégica y buenas prácticas. Analiza, evalúa y propone la mejor solución. Responde de manera resumida y en alto nivel.

## MCP

- context7 para documentación de librerías.
- codebase-memory para analizar código local; hay una skill global.

## Frontend (`apps/web`, `apps/console`, `packages/ui`)

Empieza en el paso 5 del primer incremento. Antes de tocar código, se registra en `docs/05` el ADR 0010 (sistema de diseño). La dirección visual está en 01 «Dirección visual» y el stack, en 02 §2. Las skills viven en `.claude/skills/` y se usan sin esperar a que se pidan:

| Momento | Skill |
|---|---|
| Antes de una pantalla o un flujo nuevo | `impeccable shape` (brief de UX confirmado por el usuario) |
| Movimiento, gestos y hojas | `animate` + `apple-design` |
| Avisos | `ask-sonner` |
| Una pieza que el stack no resuelve | `pick-ui-library`; la documentación se consulta con context7 |
| Antes de cerrar una entrega con UI | `impeccable audit`, `harden` y `polish`, más `review-animations`; después, `platlab-verify-increment` |

- **Sin duplicar documentos.** `PRODUCT.md` y `DESIGN.md`, de `impeccable init` o `document`, solo enlazan a 01, 02 y al ADR 0010; no copian contenido.
- **Detector automático.** Los hooks de `.claude/settings.json` ejecutan el detector de impeccable al editar archivos de UI.
- **Reglas del dominio por encima de las de estilo.** Nada de UI optimista sobre el stock ni de «deshacer» en movimientos confirmados.

## Qué leer y qué documento manda

- [docs/README.md](docs/README.md): hilo del proyecto; estado, decisiones cerradas, siguiente paso y glosario. Empezar siempre aquí.
- [Primer incremento](docs/desarrollo/primer_incremento.md): lo que se programa ahora (F1a + R-00, puerta G0).
- [01 Producto](docs/01_producto.md): módulos, roles y su matriz, flujos y pantallas.
- [02 Arquitectura](docs/02_arquitectura.md): contrato de módulo, aislamiento, stack, infraestructura y parámetros iniciales (§12, única fuente).
- [03 Datos](docs/03_datos.md): esquemas, tablas, estados, invariantes y transacciones.
- [04 Roadmap](docs/04_roadmap.md): única autoridad de fases, puertas y backlog; no copiarlos aquí.
- [05 Decisiones](docs/05_decisiones.md): ADR 0001–0008 resumidos y preguntas pendientes. Registrar ahí toda decisión nueva antes de cambiar código u otros documentos.
- Antecedentes en `docs/antecedentes/`: PRD, proforma y Propuesta.pdf (la referencia visual). No son oferta vigente ni reglas validadas.
- El plan detallado anterior está en el commit `bc26fa8`; consultarlo con `git show bc26fa8:<ruta>` solo si hace falta un detalle.

## Invariantes para implementar

- Monolito modular con producto y migraciones comunes. Nombres canónicos: `core.workspaces`, `workspace_id` y `/v1/workspaces/:workspaceId`; en la interfaz, «Espacio de trabajo». Titular jurídico y propietario son conceptos diferentes.
- Cada módulo es una rebanada vertical con manifiesto en `packages/modules`. Se agrega siguiendo el contrato de 02 §4 y no modifica tablas de otros módulos. Cada esquema tiene un único propietario técnico: un módulo o una capacidad.
- **Etapas y admisión (ADR 0009, 02 §6).**
  - Cada módulo avanza `development → pilot → general`.
  - Una sola función de admisión evalúa dos ejes, espacio y módulo, y admite solo lo que ambos permiten. Los estados desconocidos se deniegan.
  - La admisión separa operación nueva, resolución de pendientes y consulta/exportación, y se prueba con todas las combinaciones.
  - Lee espacio, derecho y membresía con bloqueo compartido en la misma consulta con la que decide. El orden de bloqueo es fijo: espacio → derecho → membresía → datos.
- **Capacidades compartidas (inventario, agenda, incidencias).** No comparten derechos: cada operación se autoriza contra el módulo dueño del recurso. Se exponen con rutas y permisos de ese módulo (`/reagents/issues`, `reagents.issue.create`), nunca con rutas `/inventory/*`.
- La API autoriza todas las operaciones de dominio: membresía, derecho del módulo, permiso y ámbito se comprueban en el servidor. RLS y FKs compuestas añaden aislamiento. El navegador no tiene CRUD directo al dominio.
- SQL parametrizado con `pg` + PgTyped. Una conexión y una transacción para autorización, contexto local, negocio, auditoría e idempotencia. El runtime no es dueño de tablas ni tiene `BYPASSRLS`. Las migraciones SQL son la autoridad.
- Cantidades exactas: `numeric` y cadenas decimales, nunca aritmética de cantidades con `number`. Movimiento confirmado y saldo se guardan juntos. Nadie borra registros de negocio: se archiva, se cancela o se compensa.
- Reservar, entregar y consumir son operaciones distintas. Los efectos externos van por outbox y nunca antes del commit.
- Solo el Equipo PlatLab cambia derechos de módulos, mediante `apply_contract_revision`. Suscripción, permisos del miembro y banderas de despliegue son controles separados.
- Roles del espacio: Propietario, Administrador, Operador, Docente, Estudiante (tesista) y Responsable de fiscalizados. El personal del proveedor es el «Equipo PlatLab» (`staff`, `apps/console`, `/v1/console/*`). Nunca usar «operador» para el personal del proveedor.
- Aislar la consola no elimina el acceso privilegiado de infraestructura: aplicar los ADR 0004 y 0005.
- Demo sintética, piloto real y venta abierta tienen puertas diferentes (G0, G1, G2); seguir el roadmap.
- pgTAP bajo roles reales, integración API y concurrencia PostgreSQL verifican invariantes distintas. No marcar verificaciones como aprobadas por estar documentadas.

## Contexto confirmado del producto

El usuario quiere varios paquetes y el producto completo de ocho módulos, con espacios independientes y propietario transferible, y podrá agregar módulos nuevos. Hay un laboratorio interesado en todos los módulos. Las sustancias fiscalizadas son necesarias desde el piloto; no diferirlas a Analítica ni excluirlas sin una nueva decisión explícita.

El usuario confirma calificación, responsable y reportes actuales, y acepta el piloto por entregas. REG-01 debe verificar el proceso y el formato concretos.

La aprobación condicionada está aceptada: el docente propone recursos desde una plantilla y el Administrador asigna o reubica la sala, apoyado por sugerencias. El ADR 0007 define qué cambios requieren aceptación.

Decidido el 30-09-2026:

- Los roles del ADR 0008.
- «Operador» es el rol del laboratorio.
- Solo PlatLab activa o desactiva módulos por contrato.
- Documentación compacta en `docs/`.
- Etapas de módulo y admisión de dos ejes bajo bloqueo (ADR 0009).
- Rutas y permisos por módulo para las capacidades compartidas.
- RPO de 24 h aceptado durante las pruebas y el piloto.
- Materiales en F3 según una práctica real (P-04).
- Equipos solicitados por tipo.
- Confirmación en lote con un resultado por solicitud.

Decidido el 02-10-2026:

- Reactivos en etapa `pilot` (V-00).
- Los permisos forman una escalera: Propietario ⊇ Administrador ⊇ Operador. El propietario opera sin rol asignado; Responsable de fiscalizados sigue aparte (ADR 0008).
- El Inicio es un tablero con una tarjeta por módulo (cifras y gráfico con datos reales) y cada módulo es una app con su propio menú (ADR 0011).
- Entrada directa al último espacio usado y cambio de espacio desde la barra; sin pantalla para elegir (ADR 0011).
- Cada módulo tematiza su app con su color (Reactivos en índigo, como ReactiLab); el Inicio y la marca siguen en azul (ADR 0010).
- Reactivos por frasco (código y QR), ficha en dos niveles, salidas del Operador con aprobación y reserva, vencidos con advertencia, sugerencia FEFO y motivos y destinos en listas; R-01A antes de T-07 (ADR 0012).

Decidido el 04-10-2026:

- La interfaz toma el diseño de ReactiLab: barra lateral pegada con el activo relleno, tarjetas con borde fino y elevación, indicadores con icono, acción rápida degradada y actividad como línea de tiempo (ADR 0010). Solo el lenguaje visual; su código no se copia.
- Las tarjetas de catálogo de todos los módulos siguen un mismo patrón con el componente `IconChip`; verde, ámbar y rojo siguen siendo de estado (ADR 0010).

El modelo comercial sigue pendiente: la recomendación está en 01 §4 y debe confirmarla el usuario.

No volver a preguntar estas decisiones.

No fijar fechas, horas ni presupuestos contractuales inventados. Mantener parámetros, matrices de roles y fases únicamente en sus fuentes y enlazarlos desde los demás documentos.

## ReactiLab

Referencia local: `/home/jio/Documentos/Inventario_V1`, código del propio usuario.

- **Usar como referencia de UX:** salida rápida, vista de producto a lote, SDS al retirar, motivo obligatorio y bandeja de aprobaciones.
- **No copiar:**
  - Su baseline ni su historia de migraciones.
  - Su modelo de frasco, lote y código fusionados.
  - El ajuste sin signo ni el borrado usado como baja.
- **Importación:** ReactiLab no la tiene; se diseña desde cero.
- **Licencia:** aclarar titularidad y licencia (README MIT frente a términos de software propietario) antes de copiar código.
