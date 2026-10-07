---
name: platlab-verify-increment
description: Ejecuta las comprobaciones de un incremento de PlatLab (tipos, lint, fronteras, código muerto, migraciones desde cero, PgTyped, pgTAP, pruebas de API, de concurrencia, Playwright y revisión de UI), las cruza con la evidencia que exige su puerta (G0, G1…) y reporta qué pasó, qué falló y qué no se verificó, registrando una fila en docs/desarrollo/evidencias/README.md. Úsala siempre que el usuario quiera saber si un incremento o tarea (T-01…T-07, R-00, V-00) está listo, pida «verifica», «corre las pruebas», «¿pasa G0?» o «¿podemos cerrar la tarea?», o antes de marcar como hecha una entrega del roadmap, aunque no nombre esta skill.
---

# Verificar un incremento de PlatLab

Responde con evidencia a una pregunta concreta: **¿esta entrega cumple lo que su puerta exige?** El valor del informe está en su honestidad. Un criterio sin evidencia ejecutada queda «no verificado», aunque esté escrito en el plan o parezca obvio. El plan lo prohíbe explícitamente: «no marcar verificaciones como aprobadas por estar documentadas».

La skill **no modifica código**. Si algo falla, lo reporta con su diagnóstico y la corrección sugerida. Corregir es otro paso, que el usuario decide.

## 1. Identificar qué se verifica

- Pregunta o deduce la entrega: una tarea (T-01, R-00…) o una puerta (G0 de un módulo, G1…).
- Carga sus criterios desde la fuente, porque pueden cambiar:
  - Evidencia de G0 del primer tramo: `docs/desarrollo/primer_incremento.md`, sección «Evidencia para cerrar G0».
  - Criterios por fase y columna «Evidencia» del backlog: `docs/04_roadmap.md` §4 y §5.
- Registra el commit (`git rev-parse --short HEAD`) y si hay cambios sin confirmar (`git status --short`). Un resultado solo vale para el código que se ejecutó.

## 2. Encontrar los comandos

La fuente de los comandos es la sección de comandos de `CLAUDE.md`, que T-01 debe completar. Complementa con los scripts de `package.json` (raíz y paquetes).

- Si un comando necesario no está registrado, no lo inventes ni adivines variantes. Anótalo como «no verificado: falta comando» y como hallazgo: el proyecto debería registrarlo.
- Si hay comandos en `package.json` que `CLAUDE.md` no lista, úsalos y señala la diferencia.

## 3. Preparar el entorno local

Puedes levantar **solo servicios locales**: `supabase start`, reconstruir la base local desde cero y cargar fixtures sintéticos.

- Nunca uses credenciales, URLs ni proyectos de staging o producción. Si una variable de entorno apunta a un host remoto, detente y repórtalo; no ejecutes esa comprobación.
- Si Docker o Supabase local no arrancan, marca como «no verificado» lo que dependa de ellos e incluye el error.

## 4. Ejecutar

Sigue el orden de `references/checks.md`: de lo más barato a lo más caro, porque un fallo temprano (tipos, migraciones) invalida lo posterior.

- Ejecuta todo lo que sea posible aunque algo falle antes. Si un fallo impide lógicamente un paso, márcalo «bloqueado por #n».
- Conserva de cada comando: comando exacto, código de salida, duración y las líneas relevantes de la salida (resumen y errores, no el log entero).
- **Lee los conteos.** Un runner que termina en 0 con 0 pruebas ejecutadas, pruebas `skip`/`todo` o un filtro que no coincide con nada no es «pasó», es «no verificado».
- No reintentes una prueba fallida hasta que pase. Si parece intermitente, ejecútala como máximo una vez más y reporta ambos resultados como «inestable»; en concurrencia, eso es un hallazgo en sí mismo.

## 5. Cruzar con la evidencia de la puerta

Para cada criterio de la puerta, asigna **una** prueba o comando concreto que lo demuestre.

- **✅ Cumple:** se ejecutó, pasó y la prueba realmente cubre el criterio. Cita el nombre de la prueba.
- **❌ Falla:** se ejecutó y falló.
- **⚠️ No verificado:** no existe una prueba que lo cubra, no se pudo ejecutar o solo está documentado.
- **— No aplica:** el criterio no corresponde a esta entrega (explica por qué).

Si una prueba pasa pero no demuestra el criterio (por ejemplo, RLS probada solo como dueño de tablas, o concurrencia con mocks), el criterio queda «no verificado».

## 6. Informar y guardar la evidencia

**En el chat**, un informe compacto de 15 líneas como máximo:

```markdown
<AAAA-MM-DD> · `<sha>` <(con cambios sin confirmar)> · **Cumple / No cumple / Incompleto**
Criterios: N/M ✅ (lista solo los que no están en ✅, con su estado)
Fallos: <criterio> → <diagnóstico> → <corrección sugerida>
No verificado: <criterio> → <qué haría falta: prueba, comando o servicio>
```

**En `docs/desarrollo/evidencias/README.md`**:

- **Una sola fila por entrega, con el CI del mismo commit terminado** (`gh run list --commit <sha> --json status,conclusion`). Si el commit no está subido o el CI no terminó, informa en el chat y no escribas la fila todavía; escríbela cuando termine, con su resultado.
- Añade una fila arriba del «Registro»: fecha, entrega, commit, veredicto, conteos de pruebas (`pgTAP 173 · int 102 · e2e 17`) y una nota.
- Actualiza «Pendiente de verificar»: añade lo nuevo sin verificar y quita lo que esta verificación resolvió.
- Al cerrar una puerta, añade o reemplaza su sección en «Puertas»: una línea por criterio → prueba con nombre.

Reglas del archivo:

- Nunca crees archivos nuevos en `evidencias/`. El historial es el Registro y git; no se crean archivos por entrega.
- La nota tiene 100 caracteres como máximo. Sin duraciones.
- Los comandos solo se anotan si fallaron o se omitieron; la lista completa vive en `references/checks.md`.

Veredicto:

- **Cumple:** todos los criterios aplicables están en ✅.
- **No cumple:** hay al menos un ❌.
- **Incompleto:** no hay fallos, pero queda algún ⚠️.

Nunca redondees un «Incompleto» a «Cumple». Cierra el mensaje con la ruta de `docs/desarrollo/evidencias/README.md` y, si hay fallos, sugiere ejecutar la skill `platlab-db-review` cuando el problema esté en migraciones, RLS o transacciones.
