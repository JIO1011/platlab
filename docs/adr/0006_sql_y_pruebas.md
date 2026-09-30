# ADR 0006 — SQL tipado y verificación del dominio

Estado: aceptado. Fecha: 28 de septiembre de 2026.

## SQL

Elegir **`pg` + PgTyped**, manteniendo consultas SQL parametrizadas y migraciones SQL de Supabase como única autoridad del esquema. PgTyped genera tipos de parámetros/resultados contra una base local reconstruida por migraciones; verificar generación y diferencias en CI. No generar tipos consultando producción. [PgTyped](https://pgtyped.dev/docs/), [consultas SQL](https://pgtyped.dev/docs/sql-file), [configuración](https://pgtyped.dev/docs/cli).

Todas las consultas de un caso de uso reciben el mismo `PoolClient`: autorización, `SET LOCAL`, bloqueos, saldos, auditoría y outbox. No ejecutar `pool.query` a mitad de una transacción ni introducir un segundo pool oculto en la librería. [Transacciones de node-postgres](https://node-postgres.com/features/transactions).

Configurar `numeric/decimal` como cadenas y cantidades exactas; fechas sin hora como cadenas de fecha. Los parsers de runtime y los tipos generados deben coincidir. Una librería de tipado no valida reglas de negocio ni convierte aritmética binaria en decimal exacta. [Tipos PgTyped](https://pgtyped.dev/docs/typing).

Kysely es una alternativa válida para consultas construidas principalmente en TypeScript; no se incorpora en paralelo porque duplicaría patrones sin una necesidad demostrada. Reconsiderar solo si el trabajo real con consultas dinámicas lo justifica. [Tipos en Kysely](https://kysely.dev/docs/recipes/data-types).

## Ubicaciones y alcances

Usar `core.locations.parent_id`, FK compuesta por espacio, índice `(workspace_id,parent_id)` y CTE recursiva. Impedir ciclos y padres de otro espacio. Serializar cambios del árbol por espacio y coordinar con operaciones críticas cuya autorización depende de su estructura; mover una sala puede cambiar permisos heredados y exige vista previa y auditoría.

No añadir `ltree` inicialmente. Sus rutas e índices son útiles si la medición del árbol demuestra necesidad; si se incorpora, la ruta será una proyección mantenida de una sola autoridad, no una segunda jerarquía editable. No sustituye RLS ni permisos. [CTE recursivas](https://www.postgresql.org/docs/current/queries-with.html), [ltree](https://www.postgresql.org/docs/current/ltree.html).

## Pruebas

- `supabase test db` + pgTAP: privilegios, RLS, FKs compuestas, estados, ledger y funciones limitadas.
- Ejecutarlas con roles reales de API/worker y su contexto local, no solo con `authenticated`/`auth.uid()` ni como propietario de tablas.
- Integración API: JWT → membresía → módulo → permiso → operación, revocación y errores.
- Conexiones PostgreSQL concurrentes: doble salida/reserva, cambio de licencia/ámbito y reutilización del pool sin fuga de contexto.
- Un flujo Playwright del incremento para comprobar que la UI permite completar y entender la operación.

pgTAP no demuestra carreras entre peticiones ni verificación HTTP. La [CLI de Supabase](https://supabase.com/docs/reference/cli/supabase-test-db) ejecuta los tests de base; el [primer incremento](../desarrollo/primer_incremento.md) define los casos que bloquean la demo.
