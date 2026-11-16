# Orquestación de PlatLab

Lo inyecta `.claude/hooks/session-start.sh` al iniciar cada sesión ([ADR 0013](../docs/05_decisiones.md#adr-0013)).

## Quién hace qué

Todo lo hace la sesión principal en línea, sin subagentes (14-11-2026; los agentes definidos se quitaron el 16-11-2026). Trabaja en `high` al implementar y en `xhigh` al diseñar o decidir.

- Es delicado todo lo que pueda alterar saldos, permisos, datos, concurrencia o el contrato de la API, esté en SQL, en el servidor, en los contratos, en los manifiestos o en la web: se implementa con sus pruebas y `platlab-db-review`.
- Analiza con codebase-memory, decide con el usuario, registra en `docs/05`, implementa, confirma y sube. Si el contexto pesa, la entrega se parte.

## Entregas

- **Partes de 40 turnos como máximo:** base y API → lógica web → pantallas.
- **Base y API:** se cierran con las pruebas de su módulo (su pgTAP y su integración) en local (21-10-2026: el usuario no las revisa en el navegador).
- **Lógica web y pantallas, etapa *cambios*** (por defecto, o `echo cambios > .git/claude-fase`): se escriben o ajustan las pruebas sin correrlas y el usuario revisa en http://localhost:5173, sin capturas.
- ***Cierre*, cuando el usuario aprueba** (`echo cierre > .git/claude-fase`): pruebas dirigidas, `pnpm check`, una ronda de capturas (4 como máximo, a 1×, recortadas), revisión de acabado en línea si hubo UI (`.claude/skills/impeccable/reference/degraded/finish-reviewer.md`), PR y verificación con el log del CI (`platlab-verify-increment`, `.github/workflows/ci.yml`).
- **Entre partes:** antes de `/clear`, se escribe en `.git/claude-handoff.md` (no versionado, ≤40 líneas) el estado, los commits y lo que sigue; `session-start.sh` lo inyecta una vez y lo archiva. **Al cerrar la entrega**, `/clear`; la siguiente retoma desde `docs/README.md` y `docs/desarrollo/evidencias/README.md`.

## Skills de frontend por momento

| Momento | Skill |
|---|---|
| Antes de una pantalla o un flujo nuevo | `impeccable shape` (brief de UX confirmado por el usuario) |
| Movimiento, gestos y hojas | `animate` + `apple-design`; al terminar, `review-animations` |
| Avisos | `ask-sonner` |
| Una pieza que el stack no resuelve | `pick-ui-library`, con context7 |
| Antes de cerrar una puerta (G0, G1…) | `impeccable audit`, `harden` y `polish` sobre todo el frontend, más `review-animations` |

Reglas del dominio por encima de las de estilo: nada de UI optimista sobre el stock ni de «deshacer» en movimientos confirmados. `PRODUCT.md` y `DESIGN.md` solo enlazan a 01, 02 y al ADR 0010.

## Puertas automáticas (`.claude/hooks/`)

- `read-guard.sh`: rechaza leer sin rango un `.ts` o `.tsx` de más de 300 líneas, con `Read` o con `cat`.
- `session-start.sh`: inyecta este archivo y el handoff pendiente.
- El detector de impeccable corre al editar UI. Las escrituras remotas por MCP, `supabase link`, `db push` y `git push --force` se bloquean en local; en GitHub, una regla protege `main`.

## Lectura y tokens

- **codebase-memory, obligatorio** (14-10-2026): para ubicar código, `search_graph`, `search_code`, `get_code_snippet` y `trace_path`; nunca `grep`, `sed` ni `cat` sobre código. `grep` solo para docs y para el SQL que el índice cubre en parte.
- **Leer por partes:** la sección o el ADR que toca; nunca enteros `docs/05`, `DESIGN.md` ni archivos de más de 300 líneas.
- **Salidas cortas:** de cada comando, solo conteos y errores.
- Lo caro es el contexto que crece y se relee en cada turno (la sesión arranca con unos 58k tokens). Sin monitores de tokens.
- ReactiLab (`/home/jio/Documentos/Inventario_V1`) es referencia de UX: lecciones en [01 §7](../docs/01_producto.md).
