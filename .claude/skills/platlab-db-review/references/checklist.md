# Lista de revisión

Cada punto indica por qué importa y dónde está la regla. Si el plan cambió, manda el plan.

## 1. Aislamiento entre espacios (03 §1, §1.1; 02 §5)

- Cada tabla de espacio tiene `workspace_id NOT NULL`, `PRIMARY KEY (id)` y `UNIQUE (workspace_id, id)`. **Por qué:** sin esa clave única no puede existir una FK compuesta hacia ella.
- Toda FK institucional incluye `workspace_id`: `(workspace_id, x_id) REFERENCES t (workspace_id, id)`. Una FK solo por `id` permite referenciar una fila de otro cliente.
- Las FKs que agregan un discriminador (item, lote) tienen su clave única en el destino. Ejemplo: un lote debe pertenecer al mismo item.
- La tabla está en la clase correcta (catálogo global, global de plataforma, plataforma por espacio o dominio). Las globales no usan un espacio ficticio.
- La autoría (`actor`, creador, ejecutor) referencia `(workspace_id, principal_id)`.
- No hay pares genéricos `resource_type/resource_id` en operaciones críticas; se usan FKs tipadas.

## 2. RLS, roles y grants (02 §5; ADR 0006)

- RLS habilitada en cada tabla de dominio, con políticas `USING` y `WITH CHECK` basadas en el contexto local (espacio y principal), no en `auth.uid()` directo.
- El rol de runtime (API/worker) no es dueño de tablas, no es superusuario y no tiene `BYPASSRLS`. **Por qué:** con esos atributos, PostgreSQL omite RLS.
- Se revoca el acceso de `anon`, `authenticated` y `PUBLIC` a los esquemas de dominio, incluidos los privilegios por defecto. Los esquemas de dominio no se exponen por la Data API.
- Las migraciones corren con un rol distinto del runtime.
- Una consulta sin contexto falla o devuelve cero filas.
- Toda función `SECURITY DEFINER` tiene `search_path` fijo, SQL estático, ejecución revocada a `PUBLIC` y alcance mínimo. Solo está prevista `platform.claim_jobs`.
- Las políticas de membresía permiten comprobar la propia membresía sin recursión entre políticas.

## 3. Cantidades exactas (03 §1, §4)

- Las cantidades son `numeric` (inicialmente `numeric(24,9)`, 02 §12); nunca `real`, `double precision` ni `float`.
- En PgTyped y en el runtime, `numeric` se maneja como cadena. Ninguna aritmética de cantidades usa `number` de TypeScript.
- Se guardan la cantidad y la unidad capturadas y la cantidad normalizada. Las conversiones solo ocurren dentro de la misma dimensión.
- `CHECK` de fila: saldo ≥ 0 y 0 ≤ reservado ≤ saldo. Las sumas entre filas se protegen con transacción y bloqueo, no con `CHECK`.

## 4. Ledger e historia (03 §4, §7)

- Los asientos (`inventory.entries`) son inmutables: el runtime no tiene `UPDATE` ni `DELETE` sobre ellos.
- Movimiento, asientos, saldo y auditoría se escriben en la misma transacción. No hay ruta para editar el saldo directamente.
- Las correcciones se hacen con una operación compensatoria.
- No hay `DELETE` de negocio: los catálogos se archivan (`archived_at`) y las membresías se desactivan (`status`). Solo el procedimiento de disposición elimina datos.
- La clave única de posición trata los nulos como iguales (`NULLS NOT DISTINCT` o equivalente), para no duplicar posiciones.

## 5. Transacción, admisión y bloqueos (02 §5–§6; ADR 0009)

- Un solo `PoolClient` por comando: nunca `pool.query` dentro de la transacción, ni un segundo pool oculto.
- El contexto se fija con `set_config(..., true)` o `SET LOCAL`; nunca a nivel de sesión. **Por qué:** el pool reutiliza conexiones.
- La admisión lee espacio, derecho del módulo dueño del recurso y membresía con bloqueo compartido (`FOR SHARE`) en la misma consulta con la que decide. Comprobar primero y bloquear después deja la decisión obsoleta.
- Los cambios de estado (suspender, desactivar, aplicar contrato, revocar o cambiar roles) modifican esas filas. Así esperan a las operaciones en curso.
- El orden de bloqueo es fijo: espacio → derecho → membresía → datos del dominio. Ante un orden distinto, señala el riesgo de interbloqueo.
- La admisión evalúa los dos ejes, espacio y módulo. Gana lo más restrictivo y se deniegan los estados desconocidos.
- Salidas y ajustes negativos leen y descuentan el saldo bajo el mismo bloqueo de la posición.
- No se llama a servicios externos ni se envía correo dentro de la transacción; esos efectos van por la outbox.

## 6. Capacidades y módulos (02 §4; 03 §2)

- Solo el propietario técnico escribe en su esquema. Los módulos usan una capacidad a través de sus comandos.
- Las rutas y los permisos son del módulo dueño del recurso (`reagents.*`); no hay rutas `/inventory/*`.
- La capacidad rechaza un ítem cuyo `kind` no corresponde al módulo que la invoca.

## 7. Idempotencia y concurrencia (02 §7; 03 §7)

- Los comandos críticos reclaman `platform.idempotency_records` con clave única por espacio, actor y operación, y con el hash canónico del contenido.
- La misma clave con otro contenido se rechaza. Un duplicado simultáneo no produce dos efectos.
- La versión esperada (`version`) se usa en los registros editables.
- Conflictos de agenda: exclusión GiST por espacio, recurso e intervalo `[inicio, fin)`, solo sobre reservas confirmadas.

## 8. Migraciones y pruebas (ADR 0006; 04 T-01…T-05)

- Las migraciones son aditivas y compatibles con la versión anterior. No hay un «down» destructivo automático.
- La base se reconstruye desde cero y PgTyped regenera sin diferencias.
- Hay pgTAP bajo los roles reales de API y worker, no solo como dueño.
- Pruebas que el cambio exige, según su alcance:
  - IDs de otro espacio y FK cruzada.
  - Membresía revocada y módulo apagado.
  - Combinaciones de admisión.
  - Dos salidas concurrentes.
  - Movimiento contra desactivación simultánea.
  - Reintento idempotente y rollback sin residuos.
  - Pool reutilizado sin fuga de contexto.
- Una prueba que usa mocks no demuestra RLS ni bloqueos.
