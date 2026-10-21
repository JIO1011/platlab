# Orquestación de PlatLab

Solo para la sesión principal: lo inyecta `.claude/hooks/session-start.sh` y los subagentes no lo cargan ([ADR 0013](../docs/05_decisiones.md#adr-0013)).

## Quién hace qué

Reparto por riesgo, no por capa: es delicado todo lo que pueda alterar saldos, permisos, datos, concurrencia o el contrato de la API, esté en SQL, en el servidor, en los contratos, en los manifiestos o en la web.

| Rol | Quién | Hace |
|---|---|---|
| Orquestar e implementar lo delicado | Sesión principal: Opus 5.5, `high` al implementar y `xhigh` al diseñar | Analiza con codebase-memory, decide con el usuario, registra en `docs/05`, implementa en línea todo lo delicado con sus pruebas (`platlab-db-review`), confirma y sube. Sin excepción por tamaño (21-10-2026): si el contexto pesa, se parte la entrega |
| Presentación | `platlab-ui-implementer`: Sonnet 5.5 en `high` | Pantallas, pulido, movimiento, avisos, móvil, e2e de UI y los comandos de ejecución de impeccable (`audit`, `harden`, `polish`, `animate`, `layout`…); la sesión principal solo usa `shape` |
| Docs y mecánico | `platlab-assistant`: Sonnet 5.5 en `medium` | Docs y skills, renombrar y consolidar, pruebas sin lógica nueva |
| Revisar acabado de UI | `impeccable-finish-reviewer`: Sonnet 5.5 en `high` | Correcciones ordenadas; no edita. Su paquete (DESIGN.md, ADR 0010, reglas del dominio) lo inyecta `subagent-gate.sh`; el brief solo añade capturas y archivos. Al actualizar impeccable, que conserve `model: claude-sonnet-5-5` |
| Opus delegado | `platlab-implementer` | Solo si el usuario crea `.git/claude-delegar` (`delegate-guard.sh`): Opus → Opus no ahorra y duplica la lectura. Nunca `fork` para implementar |

## Entregas

- **Partes de 40 turnos como máximo:** base y API → lógica web → pantallas.
- **Base y API:** la sesión principal corre las pruebas de ese módulo (su pgTAP y su integración) y confirma en local (21-10-2026: el usuario no las revisa en el navegador).
- **Lógica web y pantallas, etapa *cambios*** (por defecto, o `echo cambios > .git/claude-fase`): se escriben o ajustan las pruebas sin correrlas y el usuario revisa en http://localhost:5173, sin capturas. La puerta solo vigila el carril y `typecheck`.
- ***Cierre*, cuando el usuario aprueba** (`echo cierre > .git/claude-fase`): pruebas dirigidas, `pnpm check`, una ronda de capturas (4 como máximo, a 1×, recortadas), `impeccable-finish-reviewer` si hubo UI, PR y verificación con el log del CI (`platlab-verify-increment`, `.github/workflows/ci.yml`).
- **Entre partes:** antes de `/clear`, la sesión principal escribe en `.git/claude-handoff.md` (no versionado, ≤40 líneas) el estado, los commits y el brief de la parte siguiente; `session-start.sh` lo inyecta una vez y lo archiva. **Al cerrar la entrega**, `/clear`; la siguiente retoma desde `docs/README.md` y `docs/desarrollo/evidencias/README.md`.

## Delegar a Sonnet

- **La sesión principal ubica y designa; el agente ejecuta.** Mapea con codebase-memory, nombra las funciones por su nombre calificado y elige skills y herramientas. El agente no precarga skills ni explora: una búsqueda puntual y, si no basta, «Bloqueo».
- **Brief de 40 líneas como máximo.** Las decisiones se enlazan (`docs/05`, ADR), no se copian; lo que no aplica se omite.
  ```
  Etapa: cambios | cierre
  Objetivo: …
  Dónde: archivo:línea y símbolos (codebase-memory)
  Skills: las de la tabla de abajo que tocan, o «ninguna»
  Herramientas: codebase-memory solo para lo listado; context7 sí/no
  Leer solo: … · No leer: …
  Contrato o diseño: …
  Pruebas a escribir (sin correrlas en cambios): casos y bordes
  No tocar: …
  ```
- **Skills de frontend por momento:**

  | Momento | Skill |
  |---|---|
  | Antes de una pantalla o un flujo nuevo | `impeccable shape` (brief de UX confirmado por el usuario) |
  | Movimiento, gestos y hojas | `animate` + `apple-design`; al terminar, `review-animations` |
  | Avisos | `ask-sonner` |
  | Una pieza que el stack no resuelve | `pick-ui-library`, con context7 |
  | Antes de cerrar una puerta (G0, G1…) | `impeccable audit`, `harden` y `polish` sobre todo el frontend, más `review-animations` |

- **Escalada.** Un subagente no lanza otros, no decide ni cierra. Se detiene con «Bloqueo» si el cambio toca lo delicado, si la misma comprobación falla dos veces o si falta una decisión; la sesión principal lo resuelve en línea. Las correcciones siguen con el mismo agente (`SendMessage`) mientras su contexto no pase de ~150k.
- **Reglas del dominio por encima de las de estilo:** nada de UI optimista sobre el stock ni de «deshacer» en movimientos confirmados. `PRODUCT.md` y `DESIGN.md` solo enlazan a 01, 02 y al ADR 0010.

## Puertas automáticas (`.claude/hooks/`)

- `subagent-guard.sh`: los implementadores no confirman, suben, abren PR, tocan sus puertas ni la etapa; los agentes Sonnet no escriben en `supabase/`, `apps/server/`, `packages/contracts/` ni `packages/modules/`; en *cambios*, ningún agente corre pruebas.
- `subagent-gate.sh`: al terminar, detecta lo delicado que un agente Sonnet cambió por otra vía y corre `typecheck`; en cierre, también `lint`, `deps` y `knip`, y exige capturas si cambió la interfaz. Devuelve el trabajo una vez.
- `read-guard.sh`: rechaza leer sin rango un `.ts` o `.tsx` de más de 300 líneas, con `Read` o con `cat`.
- `delegate-guard.sh`: rechaza `platlab-implementer` sin `.git/claude-delegar`.
- `session-start.sh`: inyecta este archivo y el handoff pendiente.
- El detector de impeccable corre al editar UI. Las escrituras remotas por MCP, `supabase link`, `db push` y `git push --force` se bloquean en local; en GitHub, una regla protege `main`.

## Lectura y tokens

- **codebase-memory, obligatorio** (14-10-2026): para ubicar código, `search_graph`, `search_code`, `get_code_snippet` y `trace_path`; nunca `grep`, `sed` ni `cat` sobre código. `grep` solo para docs y para el SQL que el índice cubre en parte.
- **Leer por partes:** la sección o el ADR que toca; nunca enteros `docs/05`, `DESIGN.md` ni archivos de más de 300 líneas.
- **Salidas cortas:** de cada comando, solo conteos y errores.
- Medido (14-10-2026): la sesión principal arranca con ~58k y un subagente con ~31k; lo caro es el contexto que crece y se relee en cada turno. Sin monitores de tokens: el detalle sale una vez de `.claude/scripts/agent-tokens.sh`. Los subagentes declaran sus `tools` y los que no tocan lo delicado usan `omitClaudeMd`.
- ReactiLab (`/home/jio/Documentos/Inventario_V1`) es referencia de UX: lecciones en [01 §7](../docs/01_producto.md).
