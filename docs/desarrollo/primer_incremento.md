# Primer incremento — Reactivos: ingreso, salida y ajuste

Revisión: 30 de septiembre de 2026. Especificación para desarrollar F1a + R-00 y cerrar la puerta G0 del [roadmap](../04_roadmap.md). Solo usa datos sintéticos. Todavía no hay código ni infraestructura desplegada.

## Resultado observable

1. Un Administrador entra a PlatLab, elige su espacio y ve el Inicio con la tarjeta de Reactivos.
2. En el tablero de Reactivos crea un reactivo y un lote.
3. Un Operador registra un ingreso de 100 g y una salida de 20 g, y ve 80 g con ambos movimientos y sus responsables.
4. El Operador no puede ajustar. El Administrador registra un ajuste de −0,5 g por conteo, con motivo, y quedan 79,5 g.
5. Otro espacio no puede consultar ni modificar esos datos, y si no tiene Reactivos habilitado, no ve el módulo.

El recorrido demuestra el producto visible y las invariantes que permitirán ampliarlo: aislamiento, roles, módulos efectivos, ledger exacto, auditoría, idempotencia y concurrencia.

No incluye agenda, solicitudes docentes, archivos, importación, facturación, avisos externos ni la consola del Equipo PlatLab. El correo real y la restauración productiva llegan antes de G1.

## Datos y reglas mínimas

- **Espacios.** Dos espacios sintéticos, A (con Reactivos) y B (sin Reactivos). Cada uno tiene propietario válido y ubicaciones propias. Una misma identidad pertenece a ambos con roles distintos.
- **Roles de la demo.** Propietario sin rol operativo, Administrador y Operador, con la matriz de [01 §5](../01_producto.md#5-actores-y-roles). Docente y Estudiante llegan en F3.
- **Catálogo.** Código único por espacio, nombre, tipo reactivo y unidad base. Un lote pertenece a un reactivo del mismo espacio; si la caducidad o la referencia del proveedor se desconocen, quedan como desconocidas.
- **Posición.** Representa lote, ubicación y disposición. En este incremento no hay envases, retornos, reservas ni conversiones de unidades.
- **Cantidades.** En la API van como cadenas decimales y en la base como `numeric`. Se opera en la unidad base del producto; una unidad incompatible o una cantidad no positiva se rechazan (el ajuste admite signo, pero no cero).
- **Movimientos.** Cada ingreso, salida o ajuste genera cabecera, asientos y saldo; el saldo no tiene edición directa. El servidor fija la fecha efectiva y el actor, y no se admiten retrofechas.
- **Motivos.** Salida y ajuste exigen un motivo en texto acotado; las listas administradas de motivos y destinos llegan en R-01.
- **Correcciones.** Un movimiento confirmado no se edita ni se borra; se corrige con otro movimiento.
- **Concurrencia.** Crear una posición en paralelo no duplica su clave.
- **Aislamiento.** Todo pertenece a un `workspace_id` y todas las FKs lo incluyen.

Modelo de referencia: [03 Datos](../03_datos.md). Decisiones aplicables: [ADR 0001, 0002, 0006 y 0008](../05_decisiones.md).

## Rutas

El parámetro `:workspaceId` selecciona el espacio y la membresía se verifica en cada petición.

| Método y ruta | Comportamiento |
|---|---|
| `GET /v1/me/workspaces` | Lista solo los espacios accesibles para la identidad actual |
| `GET /v1/workspaces/:workspaceId/me` | Módulos habilitados y permisos efectivos, para armar menú y rutas |
| `GET /v1/workspaces/:workspaceId/home` | Tarjetas de Inicio de los módulos visibles; en R-00, el resumen de Reactivos |
| `GET /v1/workspaces/:workspaceId/reagents` | Lista paginada y filtrada por ámbito |
| `POST /v1/workspaces/:workspaceId/reagents` | Crea el item y su detalle químico mínimo en una transacción (Administrador) |
| `POST /v1/workspaces/:workspaceId/reagents/:reagentId/lots` | Crea un lote vinculado al item y al espacio correctos |
| `GET /v1/workspaces/:workspaceId/inventory/positions` | Saldos autorizados por item y ubicación, paginados |
| `POST /v1/workspaces/:workspaceId/inventory/receipts` | Ingreso: lote, ubicación, cantidad, unidad y referencia |
| `POST /v1/workspaces/:workspaceId/inventory/issues` | Salida: posición, cantidad, unidad, motivo y destino |
| `POST /v1/workspaces/:workspaceId/inventory/adjustments` | Ajuste con signo y motivo obligatorio (Administrador) |
| `GET /v1/workspaces/:workspaceId/inventory/operations` | Historial paginado por recurso o ubicación autorizados |

- Las rutas de creación y de movimientos aceptan `Idempotency-Key`.
- El servidor obtiene el actor y el espacio del contexto verificado; nunca usa un `actor_id` enviado por el cliente.
- La respuesta de un movimiento indica la operación, la cantidad aplicada, el saldo y la unidad.
- No se aceptan SQL, ordenamientos ni filtros arbitrarios desde la interfaz.
- Errores tipados:
  - Identidad inválida.
  - Acceso denegado.
  - Módulo no disponible.
  - Datos inválidos.
  - Stock insuficiente.
  - Clave idempotente con otro contenido.
  - Conflicto transitorio.
- Una denegación nunca revela si el recurso existe en otro espacio.

## Interfaz mínima

- **Acceso.** Inicio de sesión local → selector de espacio → Inicio, con la tarjeta de Reactivos compuesta desde `/me` y `/home`.
- **Tablero de Reactivos.**
  - Tabla de producto → lote → ubicación con saldo.
  - Acciones visibles según el permiso: Nuevo reactivo, Registrar ingreso, Registrar salida y Ajustar.
  - Historial de movimientos.
- **Estados.** Carga, vacío, error, «sin permiso» y «módulo no disponible» se muestran por separado.

## Una transacción por comando

1. Verificar el JWT por JWKS y validar la entrada. Tomar un `PoolClient` y abrir la transacción con el rol SQL de la API.
2. Fijar el contexto local de principal y `workspace_id`. Verificar membresía, estado del espacio, módulo, acción y ámbito; el rol no es dueño de tablas ni tiene `BYPASSRLS`.
3. Reclamar o recuperar la clave de idempotencia, acotada por espacio, actor y operación. Se compara un hash canónico de la entrada: si el contenido es distinto, la operación no se ejecuta.
4. Comprobar item, lote, ubicación y unidad. Bloquear la posición y el derecho del módulo en orden estable. En salidas y ajustes negativos, leer y descontar el saldo dentro de la misma sección protegida.
5. Registrar operación, asientos, saldo, auditoría y resultado idempotente. Confirmar o revertir todo, sin correos ni llamadas externas dentro de la transacción.
6. Liberar la conexión aunque haya error. Si se repite después de un timeout, devolver el resultado confirmado tras revalidar el acceso.

Los repositorios reciben el mismo `PoolClient`. Se usa `pg` + PgTyped y no se convierte `numeric` a `number`.

## Trabajo en orden

| Paso | Backlog | Entregable revisable |
|---|---|---|
| 1 | T-01 | Monorepo pnpm, API y web mínimas, PostgreSQL local, migraciones, generación de tipos y pipeline de CI |
| 2 | T-02 / T-03 | Dos espacios, miembros, propietario, roles fijos con ámbito, ubicaciones, sesión local y contexto SQL; políticas y FKs probadas |
| 3 | T-04 / T-05 | Manifiesto de Reactivos, derechos aplicados desde una revisión contractual mínima, `/me` y `/home`, transacción compartida, auditoría e idempotencia; fixtures reproducibles |
| 4 | R-00 | Catálogo, lote, ingreso, salida y ajuste por API, con saldo e historial; pruebas de conflicto y rollback |
| 5 | R-00 / V-00 | Inicio y tablero utilizables, evidencia de G0 y comentarios sobre la demo |

El comando contractual mínimo y los fixtures son solo de desarrollo: no existe un endpoint productivo para saltarse el MFA ni habilitar módulos sin autorización.

## Evidencia para cerrar G0

1. **Recorrido visible.** Ingreso de 100 g, salida de 20 g y ajuste de −0,5 g dejan 79,5 g; el historial y los actores coinciden.
2. **Aislamiento.** Un miembro de A no ve ni usa IDs de B. Pertenecer a ambos no permite usar una ubicación o un lote de B en un comando de A.
3. **Roles.**
   - El propietario sin rol operativo no registra movimientos.
   - El Operador registra ingresos y salidas, pero no ajustes ni productos del catálogo.
   - El Administrador hace todo lo anterior.
   - La revocación de la membresía se aplica en la siguiente petición.
4. **Módulos.** B no ve Reactivos en el menú ni en el Inicio, y su API responde «módulo no disponible».
5. **Concurrencia.** Dos salidas de 60 g sobre 100 g desde dos conexiones: solo una confirma, la otra recibe stock insuficiente, y quedan 40 g con un solo movimiento exitoso.
6. **Idempotencia.** Repetir un movimiento con la misma clave y contenido no añade asientos ni auditoría. Cambiar la cantidad con la misma clave se rechaza. También se prueban duplicados simultáneos.
7. **Rollback.** Un fallo provocado antes del commit no deja movimiento, auditoría de éxito ni saldo parcial.
8. **Pool y RLS.** Una conexión usada en A no transfiere su contexto a B. Sin contexto o con FKs cruzadas, la base lo impide. pgTAP corre bajo los roles reales.
9. **Reproducibilidad.** Reconstruir la base desde cero, generar tipos, cargar fixtures, compilar y pasar pgTAP y las pruebas de API y concurrencia sin datos personales ni credenciales de producción.

Las instrucciones de ejecución y los resultados se guardan junto al código. Ningún punto se marca aprobado solo por estar escrito aquí.
