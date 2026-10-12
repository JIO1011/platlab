import { Quantity, Skeleton, StatePanel, cn } from '@platlab/ui';
import { ArrowRight, CalendarClock, CalendarX, FlaskConical, History, QrCode as QrIcon, TrendingDown } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ActivityRow } from '../../app/activity-row';
import { useOperations, usePositions, useProduct } from './queries';
import { QueryErrorState } from '../../app/states';
import { useReagents } from './context';
import { purposeOf, responsibleOf } from './operation-text';
import { fefoCandidates } from './sheets';
import { availableOf } from './stock';
import { ContainerCard } from './container-card';
import { EmptyToggle, physicalStateIcon, physicalStateLabel } from './product-parts';

/** Rótulo de cada dato de la banda de la ficha. */
const bandLabel = 'text-xs font-semibold uppercase tracking-wide text-ink-muted';

export function ReagentsProductPage() {
  const { productId = '', containerId } = useParams();
  const { workspaceId, me, base, allowed, openSheet } = useReagents();
  const product = useProduct(workspaceId, productId);
  const positions = usePositions(workspaceId, productId);
  const history = useOperations(workspaceId, { productId });
  const [showEmpty, setShowEmpty] = useState(false);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: me.workspace.timeZone }).format(new Date());
  const containers = useMemo(() => positions.data?.pages.flatMap((page) => page.items) ?? [], [positions.data]);
  const emptyCount = containers.filter((position) => position.balance === '0').length;
  // El frasco de la etiqueta se ve aunque esté vacío, y la ficha lo lleva a la vista.
  const visible = containers.filter((position) => showEmpty || position.balance !== '0' || position.container?.id === containerId);
  // El frasco de una etiqueta QR (ADR 0012, entrega 4). Solo cuando la ficha ya muestra las tarjetas:
  // mientras carga el reactivo, el frasco no existe aún.
  const scannedPosition = containers.find((position) => position.container?.id === containerId);
  const scannedReady = product.isSuccess && scannedPosition !== undefined;
  // Escanear abre la descarga de ese frasco; si no se puede, la ficha dice por qué.
  const scanBlocked = !scannedPosition
    ? null
    : !allowed.issue
      ? 'Tu rol no registra salidas en este espacio: puedes consultar el frasco.'
      : scannedPosition.balance === '0'
        ? 'Este frasco está vacío: no hay nada que descargar.'
        : scannedPosition.disposition !== 'usable'
          ? 'Este frasco no está disponible para salidas.'
        : availableOf(scannedPosition) === '0'
          ? 'Todo el saldo de este frasco está apartado por solicitudes pendientes.'
          : null;
  const openedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!containerId || !scannedReady || !scannedPosition || openedFor.current === containerId) return;
    openedFor.current = containerId;
    document.getElementById(`frasco-${containerId}`)?.scrollIntoView({ block: 'center' });
    if (!scanBlocked) openSheet({ kind: 'issue', positionId: scannedPosition.id, productId, position: scannedPosition });
  }, [containerId, scannedReady, scannedPosition, scanBlocked, openSheet, productId]);
  const allEntries = history.data?.pages.flatMap((page) => page.items) ?? [];
  const entries = allEntries.slice(0, 10);
  // Se muestran los 10 más recientes; si hay más, se dice y se enlaza a todos los movimientos.
  const hasMoreHistory = allEntries.length > 10 || history.hasNextPage;

  if (product.isPending) {
    return (
      <div className="grid gap-4" role="status" aria-busy="true" aria-label="Cargando">
        <Skeleton className="h-24 rounded-card" />
        <Skeleton className="h-44 rounded-card" />
      </div>
    );
  }
  if (product.isError) {
    return (
      <QueryErrorState error={product.error} onRetry={() => void product.refetch()} />
    );
  }

  const state = product.data.physicalState ?? undefined;
  const noStock = product.data.balance === '0';
  const StateIcon = (state && physicalStateIcon[state]) || FlaskConical;
  // El frasco que conviene usar primero: la misma sugerencia FEFO que preselecciona la hoja de salida.
  const recommendedId = fefoCandidates(containers, productId, today)[0]?.id;

  return (
    <div className="grid gap-6">
      <section aria-label="Datos del reactivo" className="grid gap-4">
        {/* La identidad es un subtítulo, no un grupo de píldoras: el color se reserva para los avisos. */}
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-muted">
          <span className="tabular-nums">
            <span className="sr-only">Código </span>
            {product.data.code}
          </span>
          {product.data.casNumber ? (
            <>
              <span aria-hidden>·</span>
              <span className="font-mono tabular-nums">CAS {product.data.casNumber}</span>
            </>
          ) : null}
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1.5">
            <StateIcon className="size-4" aria-hidden />
            {state ? physicalStateLabel[state] : 'Estado sin indicar'}
          </span>
        </p>
        {/* Banda de tres datos, como los indicadores del Resumen (ADR 0012, 06-10-2026). En el móvil, la
            existencia ocupa el ancho y los otros dos van en dos columnas. */}
        <dl className="grid grid-cols-2 overflow-hidden rounded-card bg-surface shadow-raised sm:grid-cols-[1.5fr_1fr_1fr]">
          <div className="col-span-2 grid content-start gap-1 border-b border-line p-4 sm:col-span-1 sm:border-b-0 sm:border-r">
            <dt className={bandLabel}>Existencia</dt>
            <dd>
              <Quantity
                value={product.data.balance}
                unit={product.data.baseUnit}
                className={cn('text-3xl font-bold tracking-tight', noStock ? 'text-ink-subtle' : 'text-action')}
              />
            </dd>
            <dd className="text-sm text-ink-muted">
              {noStock
                ? 'Sin existencias'
                : product.data.containersWithStock === 1
                  ? 'en 1 frasco con saldo'
                  : `en ${product.data.containersWithStock} frascos con saldo`}
            </dd>
          </div>
          {/* Mínimo para todo el espacio (ADR 0012, 05-10-2026): lo fija quien administra el catálogo. */}
          <div className="grid content-start gap-1 border-r border-line p-4">
            <dt className={bandLabel}>Mínimo</dt>
            <dd className="text-xl font-bold leading-tight text-ink">
              {product.data.minimum ? <Quantity value={product.data.minimum} unit={product.data.baseUnit} /> : <span className="text-ink-muted">Sin fijar</span>}
            </dd>
            {product.data.belowMinimum ? (
              <dd className="flex items-center gap-1.5 text-sm font-semibold text-warning">
                <TrendingDown className="size-4" aria-hidden />
                Bajo mínimo
              </dd>
            ) : null}
            {allowed.product ? (
              <dd>
                <button
                  type="button"
                  className="-ml-1 inline-flex min-h-8 items-center rounded-control px-1 text-sm font-medium text-action hover:text-action-hover"
                  onClick={() => openSheet({ kind: 'minimum', productId })}
                >
                  {product.data.minimum ? 'Cambiar mínimo' : 'Fijar mínimo'}
                </button>
              </dd>
            ) : null}
          </div>
          <div className="grid content-start gap-1 p-4">
            {/* Solo afirma lo que se cuenta: un frasco sin caducidad confirmada lo dice en su tarjeta. */}
            <dt className={bandLabel}>Caducidad</dt>
            {product.data.expiredContainers || product.data.expiringContainers ? (
              <>
                {product.data.expiredContainers ? (
                  <dd className="flex items-center gap-1.5 text-base font-bold leading-tight text-danger">
                    <CalendarX className="size-4 shrink-0" aria-hidden />
                    {product.data.expiredContainers === 1 ? '1 frasco vencido' : `${product.data.expiredContainers} frascos vencidos`}
                  </dd>
                ) : null}
                {product.data.expiringContainers ? (
                  <dd className="flex items-center gap-1.5 text-base font-bold leading-tight text-warning">
                    <CalendarClock className="size-4 shrink-0" aria-hidden />
                    {product.data.expiringContainers === 1 ? '1 frasco por vencer' : `${product.data.expiringContainers} frascos por vencer`}
                  </dd>
                ) : null}
              </>
            ) : (
              <dd className="text-base font-semibold leading-tight text-ink-muted">Sin vencidos ni por vencer</dd>
            )}
          </div>
        </dl>
      </section>

      <section aria-labelledby="frascos" className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="frascos" className="text-xl font-bold text-ink">
            Frascos
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <EmptyToggle count={emptyCount} shown={showEmpty} onToggle={() => setShowEmpty(!showEmpty)} noun="vacíos" />
            {product.data.containersWithStock > 0 ? (
              <Link
                to={`${base}/inventario/${productId}/etiquetas`}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface-sunken px-3.5 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
              >
                <QrIcon className="size-4" aria-hidden />
                Etiquetas
              </Link>
            ) : null}
          </div>
        </div>
        {/* Escaneado pero sin descarga posible: se dice por qué, con texto (ADR 0012, entrega 4). */}
        {scanBlocked ? (
          <p role="status" className="flex items-center gap-2 rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-ink">
            <QrIcon className="size-4 shrink-0 text-ink-muted" aria-hidden />
            {scanBlocked}
          </p>
        ) : null}
        {positions.isPending ? (
          <Skeleton className="h-44 rounded-card" />
        ) : positions.isError ? (
          <QueryErrorState error={positions.error} onRetry={() => void positions.refetch()} />
        ) : visible.length === 0 ? (
          <p className="rounded-panel bg-surface px-4 py-8 text-center text-sm text-ink-muted shadow-raised">
            {containers.length === 0 ? 'Este reactivo aún no tiene frascos. Regístralos con un ingreso.' : 'Todos sus frascos están vacíos.'}
          </p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-4">
            {visible.map((position) => (
              <li key={position.id}>
                <ContainerCard
                  position={position}
                  today={today}
                  timeZone={me.workspace.timeZone}
                  allowed={allowed}
                  recommended={position.id === recommendedId}
                  scanned={containerId !== undefined && position.container?.id === containerId}
                  onAction={openSheet}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="historial-reactivo" className="rounded-card bg-surface p-6 shadow-raised md:p-8">
        <h2 id="historial-reactivo" className="text-xl font-bold text-ink">
          Historial del reactivo
        </h2>
        {history.isPending ? (
          <Skeleton className="mt-4 h-24" />
        ) : history.isError ? (
          <QueryErrorState error={history.error} onRetry={() => void history.refetch()} />
        ) : entries.length === 0 ? (
          <StatePanel icon={History} title="Sin movimientos" description="Cada ingreso, salida o ajuste quedará aquí con su responsable." />
        ) : (
          // Línea de tiempo, como en el Resumen: el hilo pasa por detrás de los círculos de icono.
          <ul className="relative mt-5 space-y-6 before:absolute before:bottom-5 before:left-5 before:top-5 before:w-0.5 before:bg-line">
            {entries.map((operation) => (
              <li key={operation.entryId}>
                <ActivityRow
                  type={operation.type}
                  title={operation.container?.code ?? operation.lot.code}
                  detail={[operation.location.code, purposeOf(operation)].filter(Boolean).join(' · ')}
                  quantity={operation.quantity}
                  unit={operation.unit}
                  occurredAt={operation.effectiveAt}
                  actor={responsibleOf(operation)}
                  timeZone={me.workspace.timeZone}
                />
              </li>
            ))}
          </ul>
        )}
        {hasMoreHistory ? (
          <Link
            to={`${base}/movimientos`}
            className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-action transition-colors hover:text-action-hover"
          >
            Ver todos los movimientos
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}
      </section>
    </div>
  );
}

