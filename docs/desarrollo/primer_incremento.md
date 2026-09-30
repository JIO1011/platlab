# Primer incremento — Entrada y salida de un reactivo

Estado: especificación para desarrollar; no hay código implementado ni infraestructura desplegada. Esta entrega corresponde a F1a + R-00 y la puerta G0 del [roadmap](../plan/06_roadmap.md). Usa exclusivamente datos sintéticos.

Actualización del 29 de septiembre: hay un laboratorio interesado en todos los módulos, acepta pruebas por entregas y necesita fiscalizados desde el piloto; cuenta con calificación, responsable y reportes actuales. R-00 es la primera demostración técnica, no satisface por sí solo ese alcance. REG-01 y REG-02 verifican y completan trazabilidad, custodia/retornos y reporte antes de G1.

## Resultado observable

Un técnico entra a PlatLab, selecciona su espacio, crea un reactivo y un lote, registra una entrada de 100 g y una salida de 20 g, y ve 80 g con sus dos movimientos y responsables. Otro espacio no puede consultar ni modificar esos datos. El propietario administra acceso según la plantilla delegable; ser propietario no concede automáticamente operar inventario.

Este recorrido comprueba desde el principio el producto visible y las invariantes que permitirán ampliarlo. No incluye agenda, solicitudes docentes, archivos, importación, facturación, avisos externos ni interfaz completa del operador. El correo real y la restauración productiva se incorporan antes de G1, no bloquean esta demo.

## Datos y reglas mínimas

- Dos espacios sintéticos A/B, propietario válido en cada uno, ubicaciones independientes y miembros con roles distintos. Una identidad compartida puede acceder a ambos con permisos diferentes.
- Catálogo con código por espacio, nombre, tipo reactivo y unidad base. Un lote pertenece a un reactivo del mismo espacio; caducidad o referencia de proveedor desconocidas permanecen desconocidas.
- Una posición representa lote, ubicación y disposición. En este incremento se opera el stock disponible por lote; envases individuales, partidas de devolución, reservas y conversiones entre unidades no se crean todavía.
- Las cantidades de API son cadenas decimales y la base usa numeric con precisión/escala fijadas por la primera migración según el modelo. Las operaciones de R-00 usan exactamente la unidad base del producto; unidad incompatible o cantidad no positiva se rechaza.
- Entrada y salida generan cabecera, asientos y saldo; el saldo no tiene una ruta de edición directa. Fecha efectiva y actor se fijan por el servidor; R-00 no admite retrofechas.
- No se edita ni borra un movimiento confirmado mediante CRUD. La corrección formal y el ajuste justificado se incorporan en R-01 antes del piloto que los requiera.
- Crear una posición concurrentemente no duplica su clave. La primera migración incluye solo los discriminadores implementados y su unicidad; futuras migraciones amplían la clave al añadir envases/retornos.
- Catálogos y operaciones pertenecen a workspace_id. Toda relación de dominio incluye ese identificador en la FK, además del identificador del recurso.

No crear org_units. Documentar que una unidad administrativa y una ubicación física no son lo mismo basta para T-02; permisos administrativos por unidad quedan diferidos.

Modelo de referencia: [dominio y datos](../plan/03_dominio_y_datos.md). Decisiones: [espacios/acceso](../adr/0001_espacios_y_acceso.md), [contratos/derechos](../adr/0002_contratos_y_derechos.md) y [SQL/pruebas](../adr/0006_sql_y_pruebas.md).

## Rutas del recorrido

El parámetro :workspaceId selecciona un espacio; la membresía se verifica en cada petición. Los nombres JSON se fijan en los contratos de API y no introducen un segundo identificador distinto de workspace_id.

| Método y ruta | Comportamiento |
|---|---|
| GET /v1/me/workspaces | Enumera únicamente espacios accesibles para la identidad actual |
| GET /v1/workspaces/:workspaceId/reagents | Lista paginada y filtrada por ámbito |
| POST /v1/workspaces/:workspaceId/reagents | Crea item y detalle químico mínimo en una transacción |
| POST /v1/workspaces/:workspaceId/reagents/:reagentId/lots | Crea lote vinculado al item y espacio correctos |
| GET /v1/workspaces/:workspaceId/inventory/positions | Consulta saldos autorizados por item/ubicación con paginación |
| POST /v1/workspaces/:workspaceId/inventory/receipts | Entrada: lote, ubicación, cantidad, unidad y motivo/referencia |
| POST /v1/workspaces/:workspaceId/inventory/issues | Salida: posición, cantidad, unidad y motivo/destino descriptivo acotado |
| GET /v1/workspaces/:workspaceId/inventory/operations | Historial paginado por recurso/ubicación autorizado |

Las rutas de creación y movimientos aceptan Idempotency-Key. El servidor obtiene actor y espacio del contexto verificado; nunca usa actor_id enviado por el cliente. La respuesta de un movimiento identifica operación, cantidad aplicada, saldo y unidad. No permitir SQL, ordenamientos ni filtros arbitrarios enviados desde la UI.

Errores tipados mínimos: identidad inválida, acceso denegado, módulo no disponible, datos inválidos, stock insuficiente, clave idempotente reutilizada con otro contenido y conflicto transitorio. No revelar la existencia de un recurso de otro espacio al explicar una denegación.

## Una transacción por comando

1. Verificar JWT por JWKS y validar la entrada. Adquirir un PoolClient y comenzar la transacción con el rol SQL de la API.
2. Fijar contexto local de identidad/principal y workspace_id; verificar membresía, estado del espacio, módulo, acción y ámbito. El rol no es propietario de tablas ni tiene BYPASSRLS.
3. Reclamar o recuperar la clave de idempotencia acotada por espacio, actor y operación. Comparar un hash canónico de la entrada; una operación repetida con contenido distinto no se ejecuta.
4. Comprobar item, lote, ubicación y unidad; bloquear la posición y el derecho de módulo según el orden definido. Para salida, la lectura y disminución del saldo forman parte de la misma sección protegida.
5. Registrar operación, asientos, saldo, auditoría y resultado idempotente. Confirmar todo o revertir todo; no emitir correos ni llamar proveedores externos dentro de la transacción.
6. Liberar la conexión incluso si ocurre un error. Una repetición después de timeout devuelve el resultado confirmado si existe. Revalidar acceso antes de devolver resultados idempotentes históricos.

Los repositorios reciben el mismo PoolClient; no invocan pool.query ni toman una conexión nueva durante este caso de uso. El camino inicial todavía no produce avisos, por lo que no necesita un worker para confirmar el inventario. Cuando exista un efecto externo, su evento se escribe en outbox dentro del mismo commit.

Se usa pg + PgTyped para consultas parametrizadas y tipos generados. Las migraciones SQL son la autoridad del esquema. No convertir numeric a number ni considerar el tipo TypeScript una validación de negocio.

## Trabajo en orden

| Paso | Referencia del backlog | Entregable revisable |
|---|---|---|
| 1 | T-01 | Workspace de paquetes, API/frontend mínimos, PostgreSQL local, migraciones, generación de tipos y pipeline |
| 2 | T-02 / T-03 | Dos espacios, miembros/propietario/roles fijos, ubicaciones, sesión local y contexto SQL; políticas y FKs probadas |
| 3 | T-04 / T-05 | Derechos aplicados desde revisión contractual mínima, transacción compartida, auditoría e idempotencia; fixtures sintéticos reproducibles |
| 4 | R-00 | Catálogo/lote y entradas/salidas por API con saldo e historial; pruebas de conflicto y rollback |
| 5 | R-00 / V-00 | Pantalla utilizable, selector de espacio, carga/errores, evidencia de G0 y comentarios sobre la demo |

El comando contractual mínimo y los fixtures tienen un límite explícito de desarrollo: no existe un endpoint de producción para saltarse MFA ni habilitar módulos sin autorización. La consola y la aplicación de revisiones comerciales por el operador se completan en F1b usando el mismo caso de uso autorizado.

F0 concreta el proceso con el laboratorio interesado mientras avanzan los pasos. El ejemplo sintético no se presenta como un flujo ya validado por su responsable ni como reporte apto para la autoridad.

## Evidencia para cerrar G0

1. **Recorrido visible:** entrada de 100 g y salida de 20 g dejan 80 g; historial y actor coinciden.
2. **Aislamiento:** un miembro de A no ve ni usa IDs de B. Ser miembro de ambos no permite usar una ubicación/lote de B en un comando de A.
3. **Permisos:** lector/propietario sin permiso operativo no registra salidas; técnico autorizado sí. Revocación de membresía y módulo que no admite nuevas operaciones se aplican desde la API.
4. **Concurrencia real:** preparar un saldo independiente de 100 g y lanzar dos salidas de 60 g desde dos conexiones; solo una confirma, la otra recibe conflicto/stock insuficiente y quedan 40 g con un único movimiento exitoso.
5. **Idempotencia:** repetir una entrada/salida confirmada con igual clave y contenido no añade asientos ni auditorías de éxito. Cambiar la cantidad con la misma clave se rechaza. Probar también duplicados simultáneos.
6. **Rollback:** provocar un fallo antes del commit tras escribir asientos/saldo; no queda movimiento ni auditoría de éxito ni saldo parcial. No registrar un error dentro de la transacción que acaba de revertirse.
7. **Pool y RLS:** después de usar una conexión en A, B no hereda su contexto; faltan contexto/actor o se usan FKs cruzadas y la base lo impide. Ejecutar pgTAP bajo los roles reales de runtime, no solo como dueño de tablas.
8. **Reproducibilidad:** reconstruir la base local desde cero, generar tipos, cargar fixtures, compilar y ejecutar pgTAP y pruebas API/concurrencia sin depender de datos personales o credenciales de producción.

Guardar instrucciones de ejecución y los resultados junto al código al implementarlo. No marcar estos puntos aprobados por haber escrito este documento.

G0 termina con una demo y evidencia técnica. G1 sigue exigiendo contratos/instrucciones de datos, identidad productiva, cuotas, operador con MFA, recuperación y salida del alcance publicado; [roadmap](../plan/06_roadmap.md).
