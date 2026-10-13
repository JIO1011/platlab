# Orquestación de PlatLab

Solo para la sesión principal: lo inyecta el hook `SessionStart` de `.claude/settings.json` y los subagentes no lo cargan ([ADR 0013](../docs/05_decisiones.md#adr-0013)).

## MCP

- context7 para documentación de librerías.
- codebase-memory para analizar código local; hay una skill global.

## Modelos y delegación

Reparto por riesgo, no por capa (ADR 0013): todo cambio que pueda alterar saldos, permisos, datos, concurrencia o el contrato de la API va a Opus, esté en SQL, en el servidor o en la web. Lo demás, a Sonnet.

| Rol | Quién | Hace |
|---|---|---|
| Orquestar | Sesión principal: Opus 5.5 en `xhigh` | Analiza (codebase-memory), diseña datos, flujos e invariantes, decide con el usuario, registra en `docs/05`, escribe el brief con sus casos de prueba, revisa lo delicado (`platlab-db-review`), verifica con el CI (`platlab-verify-increment`), confirma y sube |
| Código delicado y sus pruebas | `platlab-implementer`: Opus 5.5 en `high`, con `platlab-db-review` cargada | SQL y migraciones, permisos y aislamiento, concurrencia, cantidades y saldos, contratos de la API y la lógica web que los usa; pgTAP, integración y concurrencia |
| Presentación | `platlab-ui-implementer`: Sonnet 5.5 en `high`, con las skills de diseño | Pantallas, pulido, movimiento, avisos, móvil y e2e de UI |
| Docs y mecánico | `platlab-assistant`: Sonnet 5.5 en `medium` | Docs y skills, renombrar y consolidar, pruebas sin lógica nueva |
| Revisar acabado de UI | `impeccable-finish-reviewer`: Sonnet 5.5 en `high` | Correcciones ordenadas; no edita |

- **Escalada.** Un subagente no lanza otros. Los agentes Sonnet se detienen con «Bloqueo» si el cambio toca lo delicado, si la misma comprobación falla dos veces o si falta una decisión; la sesión principal lo reasigna a `platlab-implementer`. Las correcciones siguen con el mismo agente (`SendMessage`) mientras su contexto sea pequeño; si pasa de ~150k, agente nuevo con brief.
- **Puertas automáticas** (ADR 0013, `.claude/hooks/`). `subagent-guard.sh` impide que los implementadores confirmen, suban, abran PR o editen sus puertas, y que los agentes Sonnet escriban en `supabase/`, `apps/server/`, `packages/contracts/` o `packages/modules/`. Al terminar, `subagent-gate.sh` detecta lo delicado que un agente Sonnet cambió por otra vía, exige capturas si el implementador de UI cambió la interfaz y corre `typecheck`, `lint`, `deps` y `knip`; si algo falla, devuelve el trabajo una vez. Las escrituras remotas por MCP, `supabase link`, `db push` y `git push --force` se bloquean en local; en GitHub, una regla impide el force-push y el borrado de `main`.
- **Impeccable corre en Sonnet 5.5 en `high`.** Sus comandos de ejecución y revisión (`audit`, `harden`, `polish`, `animate`, `layout`…) los lanza `platlab-ui-implementer`. La sesión principal solo usa `shape` para proponer. Los roles de documentar, producir imágenes y aplicar ediciones de `live` no tienen agente: la skill los ejecuta en línea (`reference/degraded/`) dentro del implementador de UI. Al actualizar la skill, revisar que `impeccable-finish-reviewer` conserve `model: claude-sonnet-5-5`.
- **Paquete para `impeccable-finish-reviewer`.** Se lo inyecta `subagent-gate.sh` al empezar: construcción guiada por código, contrato en `DESIGN.md` y ADR 0010, sin diseño de referencia, QUALITY BAR, `state.json` ni semilla, y reglas del dominio. El brief solo añade las capturas y los archivos.

- **Los subagentes no deciden ni cierran.** Si falta una decisión, se detienen y la reportan; no confirman ni suben.
- **Una sesión por entrega.** Al cerrarla (commit y CI en verde), `/clear`; la siguiente retoma desde `docs/README.md` y `docs/desarrollo/evidencias/README.md`.
- **Leer por partes.** codebase-memory, `grep` o `sed -n` de la sección o del ADR que toca; no leer enteros `docs/05`, `DESIGN.md` ni archivos de más de 300 líneas.
- **Salidas cortas.** De cada comando, solo conteos y errores; capturas solo si cambia la UI, recortadas.

## Economía de tokens (ADR 0013, 13-10-2026)

Medido: arrancar un subagente cuesta ~40k tokens antes del brief, y ese contexto se reprocesa en cada turno. Lo caro son el arranque por turnos, la exploración y repetir pruebas; el brief pesa poco.

- **Delegar solo lo que lo merece.** Hasta ~20 líneas en uno o dos archivos, en línea. Nunca `fork` para implementar: hereda toda la conversación.
- **Brief de 40 líneas como máximo:** objetivo, archivo:línea mapeados con codebase-memory, contrato o diseño exacto, casos de prueba con sus bordes (límites, paginación, duplicados, permisos), comandos y qué no tocar. Las decisiones se enlazan (`docs/05`, ADR), no se copian.
- **Entregas de 40 turnos como máximo.** Base y API, lógica web (Opus) y pantallas (Sonnet) van por separado.
- **Los agentes implementan; la sesión principal prueba.** Los agentes se ubican con codebase-memory, escriben o ajustan las pruebas y no corren suites, e2e ni `pnpm check`; la puerta final ya corre tipos, lint, fronteras y knip. Solo `platlab-implementer` puede correr el archivo de pruebas que escribió. La sesión principal corre las pruebas dirigidas, y el CI del PR (`.github/workflows/ci.yml`) la suite completa. La verificación se hace con el log del CI, sin subagente.
- **Una ronda de capturas** (4 como máximo, a 1×, recortadas), después de las correcciones.
- **Subagentes livianos.** Cada uno declara sus herramientas (`tools`, sin MCP ajenos) y los que no tocan lo delicado no cargan `CLAUDE.md` (`omitClaudeMd`). Los MCP ajenos al proyecto se deshabilitan en `/mcp`.

## Frontend (`apps/web`, `apps/console`, `packages/ui`)

La dirección visual está en 01 «Dirección visual», el stack en 02 §2 y el sistema en el ADR 0010. Las skills viven en `.claude/skills/` y se usan sin esperar a que se pidan:

| Momento | Skill |
|---|---|
| Antes de una pantalla o un flujo nuevo | `impeccable shape` (brief de UX confirmado por el usuario) |
| Movimiento, gestos y hojas | `animate` + `apple-design`; al terminar, `review-animations` |
| Avisos | `ask-sonner` |
| Una pieza que el stack no resuelve | `pick-ui-library`; la documentación se consulta con context7 |
| Antes de cerrar una entrega con UI | Capturas de escritorio y móvil en `apps/web/.impeccable/review/` (la puerta las exige) e `impeccable-finish-reviewer`; después, `platlab-verify-increment` con el CI |
| Antes de cerrar una puerta (G0, G1…) | `impeccable audit`, `harden` y `polish` sobre todo el frontend, más `review-animations` |

- **Sin duplicar documentos.** `PRODUCT.md` y `DESIGN.md`, de `impeccable init` o `document`, solo enlazan a 01, 02 y al ADR 0010.
- **Detector automático.** Los hooks de `.claude/settings.json` ejecutan el detector de impeccable al editar archivos de UI.
- **Reglas del dominio por encima de las de estilo.** Nada de UI optimista sobre el stock ni de «deshacer» en movimientos confirmados.

## ReactiLab

Referencia local: `/home/jio/Documentos/Inventario_V1`, código del propio usuario.

- **Usar como referencia de UX:** salida rápida, vista de producto a lote, SDS al retirar, motivo obligatorio y bandeja de aprobaciones.
- **No copiar:** su baseline ni su historia de migraciones; su modelo de frasco, lote y código fusionados; el ajuste sin signo ni el borrado usado como baja.
- **Importación:** ReactiLab no la tiene; se diseña desde cero.
- **Licencia:** aclarar titularidad y licencia (README MIT frente a términos de software propietario) antes de copiar código.
