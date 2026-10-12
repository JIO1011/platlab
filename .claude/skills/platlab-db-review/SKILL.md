---
name: platlab-db-review
description: Revisa migraciones SQL, políticas RLS, roles y grants, FKs compuestas, cantidades exactas, bloqueos, admisión e idempotencia de PlatLab contra las reglas de su plan (docs/03_datos.md, docs/02_arquitectura.md y ADR 0006/0009). Úsala siempre que se cree o modifique algo en supabase/migrations, pruebas pgTAP, repositorios SQL/PgTyped o comandos transaccionales del servidor. Aplica desde T-02 en adelante, antes de un commit o PR con cambios de esquema, o cuando el usuario pida «revisar la base», «revisar la migración», «revisar RLS» o «revisar el ledger», aunque no nombre esta skill.
---

# Revisión de base de datos de PlatLab

Revisa cambios de esquema y de acceso a datos contra las reglas que el plan ya fijó. El objetivo es detectar temprano lo que es caro de corregir cuando hay datos reales: una fuga entre espacios, un saldo que no cuadra, un rol con privilegios de más o una decisión de autorización que queda vieja por concurrencia.

Esta revisión **no edita archivos**. Entrega hallazgos y la corrección propuesta. Solo aplica cambios si el usuario lo pide después.

## 1. Cargar las reglas vigentes

Las reglas viven en el plan y pueden cambiar. Léelas en cada revisión en lugar de confiar en memoria:

- `docs/03_datos.md`: convenciones (§1), clases de tablas (§1.1), esquemas y propietario técnico (§2), invariantes por módulo y transacciones críticas (§7).
- `docs/02_arquitectura.md`: aislamiento y pasos de cada comando (§5), admisión de dos ejes y admisión bajo bloqueo (§6), consistencia (§7) y parámetros (§12).
- `docs/05_decisiones.md`: ADR 0006 (SQL y pruebas) y ADR 0009 (etapas y admisión).
- `docs/desarrollo/primer_incremento.md`, si el cambio pertenece a F1a + R-00.

Si una regla del plan contradice lo que parece correcto, repórtalo como hallazgo. No corrijas el plan dentro de la revisión.

## 2. Delimitar qué se revisa

- Por defecto: el diff actual (`git diff` y archivos nuevos) bajo `supabase/`, `apps/server/src/**/infrastructure`, `apps/server/src/platform/db` y los archivos `.sql` de PgTyped.
- Si el usuario indica archivos o una tarea (T-02, R-00…), revisa eso.
- Lee también las migraciones anteriores que definen las tablas referenciadas: una FK solo es correcta si su destino tiene la clave única que exige.

## 3. Revisar

Recorre la lista de `references/checklist.md`. Tiene 8 bloques; cada punto indica por qué importa y dónde está la regla. No todos los bloques aplican a todo cambio: marca como «no aplica» los que no correspondan en lugar de forzarlos.

Criterios que evitan falsos positivos:

- Verifica en el código. «RLS activada» no basta: comprueba que la política exista, cubra `USING` y `WITH CHECK`, y que el rol del runtime no la evada.
- Distingue las clases de tabla (03 §1.1). Una tabla global sin `workspace_id` es correcta si su clase lo permite.
- Si algo no puede comprobarse leyendo el código, como el comportamiento concurrente, dilo y propón la prueba que lo demostraría. No lo des por aprobado.

## 4. Informar

Usa esta plantilla:

```markdown
# Revisión de base de datos — <alcance>

Veredicto: Bloquea / Aprobar con cambios / Aprobar
Revisado: <archivos o diff> · Reglas: <documentos y secciones leídos>

## Hallazgos
| # | Gravedad | Archivo:línea | Problema | Regla | Corrección propuesta |
|---|---|---|---|---|---|

## Pruebas que faltan
- <prueba pgTAP, de integración API o de concurrencia que demostraría el punto>

## No aplica o sin comprobar
- <bloque del checklist y motivo>
```

Gravedad:

- **Bloqueante:** permite fuga o cruce entre espacios, saldo incorrecto, borrado de historia, privilegio excesivo o decisión de autorización obsoleta. Debe corregirse antes del commit.
- **Importante:** debilita una invariante o deja una regla sin prueba. Debe corregirse en la misma tarea.
- **Menor:** convenciones, nombres o índices.

La corrección propuesta debe ser concreta: el fragmento SQL o el cambio exacto, no «revisar esto». Ordena los hallazgos por gravedad. Si no hay ninguno, dilo y lista qué se comprobó.
