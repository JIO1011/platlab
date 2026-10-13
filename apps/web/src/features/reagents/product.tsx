import { Button, Skeleton, StatePanel, addDecimal, cn, ratioPercent } from '@platlab/ui';
import { ArrowRight, History, Printer, QrCode as QrIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ActivityRow } from '../../app/activity-row';
import { useOperations, usePositions, useProduct } from './queries';
import { QueryErrorState } from '../../app/states';
import { useReagents } from './context';
import { purposeOf, responsibleOf } from './operation-text';
import { fefoCandidates } from './sheets';
import { availableOf } from './stock';
import { ContainerCard } from './container-card';
import { EmptyToggle } from './product-parts';
import { ProductHeader, ProductSummary, type ExpiryDates } from './product-head';
import { containerUrl } from './labels';

export function ReagentsProductPage() {
  const { productId = '', containerId } = useParams();
  const { workspaceId, me, base, allowed, openSheet, positionList, freshness } = useReagents();
  const product = useProduct(workspaceId, productId);
  const positions = usePositions(workspaceId, productId);
  const history = useOperations(workspaceId, { productId: [productId] });
  const [showEmpty, setShowEmpty] = useState(false);
  // Modo de etiquetas (ADR 0010): las tarjetas giran a su etiqueta y se eligen cuáles imprimir. El
  // reverso se monta la primera vez que se usa y se queda para poder girar de vuelta con animación.
  const navigate = useNavigate();
  const [labelMode, setLabelMode] = useState(false);
  const [labelsUsed, setLabelsUsed] = useState(false);
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set());
  const labelsButton = useRef<HTMLButtonElement>(null);
  const closeLabels = () => {
    setLabelMode(false);
    labelsButton.current?.focus();
  };
  useEffect(() => {
    if (!labelMode) return;
    const onKey = (event: KeyboardEvent) => {
      // Un cuadro abierto (hoja de salida, por ejemplo) se cierra primero con su propio Esc.
      if (event.key === 'Escape' && !document.querySelector('[role="dialog"]')) {
        setLabelMode(false);
        labelsButton.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [labelMode]);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: me.workspace.timeZone }).format(new Date());
  const containers = useMemo(() => positions.data?.pages.flatMap((page) => page.items) ?? [], [positions.data]);
  const emptyCount = containers.filter((position) => position.balance === '0').length;
  // El frasco de la etiqueta se ve aunque esté vacío, y la ficha lo lleva a la vista.
  const visible = containers.filter((position) => showEmpty || position.balance !== '0' || position.container?.id === containerId);
  // El frasco de una etiqueta QR (ADR 0012, entrega 4). Solo cuando la ficha ya muestra las tarjetas:
  // mientras carga el reactivo, el frasco no existe aún.
  // Etiquetables: con frasco y saldo, como en la página de etiquetas.
  const labelable = visible.filter((position) => position.container !== null && position.balance !== '0');
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

  // Nivel de la existencia: el saldo frente a lo inicial de los frascos con saldo. Solo se afirma
  // con todos los frascos cargados, en la unidad base y con su cantidad inicial conocida.
  const stocked = containers.filter((position) => position.balance !== '0');
  const initials = stocked.map((position) => (position.unit === product.data.baseUnit ? (position.container?.initialQuantity ?? null) : null));
  const initialTotal =
    positions.hasNextPage || stocked.length === 0 || initials.some((initial) => initial === null)
      ? null
      : initials.reduce<string | null>((sum, initial) => (sum === null || initial === null ? null : addDecimal(sum, initial)), '0');
  const stockPercent = initialTotal === null ? null : ratioPercent(product.data.balance, initialTotal);
  // El frasco que conviene usar primero: la misma sugerencia FEFO que preselecciona la hoja de salida.
  const recommendedId = fefoCandidates(containers, productId, today)[0]?.id;
  // Fechas de los frascos con saldo; con frascos por cargar no se afirma «la próxima».
  const dates = stocked.flatMap((position) => (position.lot.expiresOn ? [position.lot.expiresOn] : [])).sort();
  const expiry: ExpiryDates | null = positions.hasNextPage
    ? null
    : { upcoming: dates.find((date) => date >= today) ?? null, oldestExpired: dates.find((date) => date < today) ?? null };
  const pickedNow = labelable.filter((position) => picked.has(position.id));
  const allPicked = labelable.length > 0 && pickedNow.length === labelable.length;
  const togglePick = (id: string) =>
    setPicked((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  // La página de etiquetas ya preselecciona `?frascos=` y trae su hoja A4.
  const printPicked = () =>
    void navigate(`${base}/inventario/${productId}/etiquetas?frascos=${pickedNow.map((position) => position.container?.id ?? '').join(',')}`);

  return (
    <div className="grid gap-6">
      <section aria-label="Datos del reactivo">
        <ProductHeader
          product={product.data}
          allowed={allowed}
          canIssue={positionList.length > 0}
          freshness={freshness}
          onAction={openSheet}
        />
      </section>

      {/* Desde `xl`, el resumen es una columna derecha fija; por debajo, una franja bajo la cabecera. */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_16rem]">
        <aside aria-label="Resumen del reactivo" className="xl:sticky xl:top-6 xl:col-start-2 xl:row-start-1 xl:self-start">
          <ProductSummary product={product.data} canManage={allowed.product} stockPercent={stockPercent} expiry={expiry} onAction={openSheet} />
        </aside>
        <div className="grid min-w-0 content-start gap-6 xl:col-start-1 xl:row-start-1">
          <section aria-labelledby="frascos" className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="frascos" className="text-xl font-bold text-ink">
                Frascos
              </h2>
              <div className="flex flex-wrap items-center gap-2">
                <EmptyToggle count={emptyCount} shown={showEmpty} onToggle={() => setShowEmpty(!showEmpty)} noun="vacíos" />
                {product.data.containersWithStock > 0 ? (
                  <button
                    ref={labelsButton}
                    type="button"
                    aria-pressed={labelMode}
                    onClick={() => {
                      setLabelsUsed(true);
                      if (labelMode) setLabelMode(false);
                      else {
                        setPicked(new Set());
                        setLabelMode(true);
                      }
                    }}
                    className={cn(
                      'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors',
                      labelMode ? 'bg-action-soft text-action' : 'bg-surface-sunken text-ink-muted hover:text-ink',
                    )}
                  >
                    <QrIcon className="size-4" aria-hidden />
                    Etiquetas
                  </button>
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
              <ul className={cn('grid grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-4 xl:grid-cols-3', labelsUsed && 'pb-24')}>
                {visible.map((position) => (
                  <li key={position.id}>
                    <ContainerCard
                      position={position}
                      today={today}
                      allowed={allowed}
                      recommended={position.id === recommendedId}
                      scanned={containerId !== undefined && position.container?.id === containerId}
                      labels={
                        labelsUsed && position.container && position.balance !== '0'
                          ? {
                              product: product.data,
                              url: containerUrl(workspaceId, position.container.id),
                              flipped: labelMode,
                              picked: picked.has(position.id),
                              order: labelable.indexOf(position),
                              onPick: () => togglePick(position.id),
                            }
                          : undefined
                      }
                      onAction={openSheet}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {labelsUsed ? (
            // Barra fija de las etiquetas: sale y entra desde abajo; cerrada, queda inerte y fuera de la vista.
            <div
              role="region"
              aria-label="Elegir etiquetas"
              inert={!labelMode}
              className={cn(
                'fixed inset-x-3 bottom-4 z-30 mx-auto flex max-w-2xl flex-wrap items-center gap-2 rounded-3xl border border-white/70 bg-white/85 p-2.5 shadow-overlay backdrop-blur-xl not-supports-[backdrop-filter]:bg-surface',
                'transition-[opacity,translate] duration-200 ease-out-expo starting:translate-y-6 starting:opacity-0',
                labelMode ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0 motion-reduce:translate-y-0',
              )}
            >
              <p aria-live="polite" className="basis-full px-2 text-sm font-semibold tabular-nums text-ink sm:mr-auto sm:basis-auto">
                {pickedNow.length === 1 ? '1 elegida' : `${pickedNow.length} elegidas`}
              </p>
              <Button variant="ghost" size="sm" onClick={() => setPicked(new Set(allPicked ? [] : labelable.map((position) => position.id)))}>
                {allPicked ? 'Ninguna' : 'Todas'}
              </Button>
              <Button variant="secondary" size="sm" onClick={closeLabels}>
                Listo
              </Button>
              <Button variant="primary" size="sm" className="ml-auto sm:ml-0" disabled={pickedNow.length === 0} onClick={printPicked}>
                <Printer aria-hidden />
                Imprimir {pickedNow.length}
              </Button>
            </div>
          ) : null}

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
      </div>
    </div>
  );
}

